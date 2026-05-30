import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { VisualStyle, GroundingSource, AnalysisResult } from '../types.ts';

// Initializing the GoogleGenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── constants ────────────────────────────────────────────────────────────────
const CLONE_MODEL = 'gemini-3.1-pro-preview'; 
const VISION_MODEL = 'gemini-3.1-pro-preview'; // Explicitly using pro for vision tasks
const MAX_TOKENS = 32768;                       // was 8192 — critical fix
const HTML_CONTEXT_CHARS = 25_000;              // scraped HTML context window

// ─── helpers ──────────────────────────────────────────────────────────────────

function stripDataUriPrefix(b64: string): string {
    const commaIdx = b64.indexOf(',');
    return commaIdx !== -1 ? b64.slice(commaIdx + 1) : b64;
}

function safeHtmlTruncate(html: string, maxChars: number): string {
    if (html.length <= maxChars) return html;
    const slice = html.slice(0, maxChars);
    const lastClose = slice.lastIndexOf('>');
    return lastClose !== -1 ? slice.slice(0, lastClose + 1) : slice;
}

function cleanHtml(html: string): string {
    return html
        .replace(/\bh-screen\b/g, 'min-h-screen')
        .replace(/\boverflow-hidden\b/g, 'overflow-visible')
        .replace(/\boverflow-y-hidden\b/g, 'overflow-y-visible');
}

function extractJson(raw: string): { html: string; css: string } | null {
    const attempts: string[] = [
        raw.trim(),
        raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(),
        (() => {
            const start = raw.indexOf('{');
            const end = raw.lastIndexOf('}');
            return start !== -1 && end > start ? raw.slice(start, end + 1) : '';
        })(),
    ];

    for (const attempt of attempts) {
        if (!attempt) continue;
        try {
            const parsed = JSON.parse(attempt);
            if (typeof parsed.html === 'string') return {
                html: parsed.html || '',
                css: parsed.css || ''
            };
        } catch {
            // try next
        }
    }

    const extractString = (key: string): string => {
        const keyIndex = raw.indexOf(`"${key}"`);
        if (keyIndex === -1) return '';
        
        const colonIndex = raw.indexOf(':', keyIndex + key.length + 2);
        if (colonIndex === -1) return '';
        const startQuoteIndex = raw.indexOf('"', colonIndex + 1);
        if (startQuoteIndex === -1) return '';
        
        let valStart = startQuoteIndex + 1;
        let valEnd = -1;
        let isEscaped = false;
        
        for (let i = valStart; i < raw.length; i++) {
            if (isEscaped) {
                isEscaped = false;
            } else if (raw[i] === '\\') {
                isEscaped = true;
            } else if (raw[i] === '"') {
                valEnd = i;
                break;
            }
        }
        
        if (valEnd === -1) {
            valEnd = raw.length;
        }
        
        let extracted = raw.slice(valStart, valEnd);
        return extracted.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    };

    const html = extractString('html');
    const css = extractString('css');

    if (html || css) {
        return { html, css };
    }

    return null;
}

function isHtmlComplete(html: string): boolean {
    return /<\/html\s*>/i.test(html.trimEnd());
}

function forceCloseHtml(html: string): string {
    let closed = html.trimEnd();
    if (!closed.endsWith('</footer>') && closed.includes('<footer')) closed += '\n</footer>';
    if (!closed.includes('</body>')) closed += '\n</body>';
    if (!closed.includes('</html>')) closed += '\n</html>';
    return closed;
}

function stitchContinuation(partial: string, continuation: string): string {
    const overlapCheck = partial.slice(-200).trim();
    const contTrimmed  = continuation.trimStart();
    if (contTrimmed.startsWith(overlapCheck.slice(-40))) {
        return partial + contTrimmed.slice(overlapCheck.slice(-40).length);
    }
    return partial + contTrimmed;
}

async function requestContinuation(
    partialHtml: string,
    originalPrompt: string,
    originalSystemInstruction: string
): Promise<string> {
    const continuationSystem = `${originalSystemInstruction}
    
You are completing a partially generated HTML page.
You will receive the HTML generated so far. Continue from EXACTLY where it left
off and complete the page through to </html>. Output ONLY the continuation HTML
— no JSON, no fences, no repetition of what was already generated.
MANDATORY: Your output must end with </footer></body></html>.`;

    const continuationPrompt = `${originalPrompt}

The previous generation was cut off. Here is what was generated so far:
--- PARTIAL HTML (continue from here) ---
${partialHtml.slice(-8000)}
--- END OF PARTIAL ---

Complete the remaining HTML now, starting from where it cut off.
You MUST include the footer section and close all open tags before </body></html>.`;

    const response = await ai.models.generateContent({
        model: CLONE_MODEL,
        contents: { role: 'user', parts: [{ text: continuationPrompt }] },
        config: {
            systemInstruction: continuationSystem,
            maxOutputTokens: MAX_TOKENS,
            temperature: 0.1,
        },
    });

    return response.text ?? '';
}

async function generateWithContinuation(
    systemInstruction: string,
    userPrompt: string,
    parts?: any[],
    tools?: any[],
    temperature: number = 0.5
): Promise<{ html: string; css: string; responseObj: any }> {
    const contentParts = parts || [{ text: userPrompt }];

    const firstResponse = await ai.models.generateContent({
        model: CLONE_MODEL,
        contents: { role: 'user', parts: contentParts },
        config: {
            systemInstruction,
            ...(tools ? { tools } : {}),
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            maxOutputTokens: MAX_TOKENS,
            temperature,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    html: { type: Type.STRING },
                    css: { type: Type.STRING }
                },
                required: ['html', 'css']
            }
        },
    });

    const rawText = firstResponse.text ?? '';
    let parsed = extractJson(rawText);

    if (!parsed) {
        throw new Error('Gemini returned an unparseable response.');
    }

    if (!isHtmlComplete(parsed.html)) {
        console.warn('HTML truncated — requesting continuation pass...');
        try {
            const continuation = await requestContinuation(parsed.html, userPrompt, systemInstruction);
            parsed.html = stitchContinuation(parsed.html, continuation);
            
            if (!isHtmlComplete(parsed.html)) {
                parsed.html = forceCloseHtml(parsed.html);
            }
        } catch (contErr) {
            console.error('Continuation pass failed:', contErr);
            parsed.html = forceCloseHtml(parsed.html + '\n<!-- generation was truncated -->\n');
        }
    }

    return {
        html: cleanHtml(parsed.html),
        css: parsed.css ?? '',
        responseObj: firstResponse
    };
}

const getMimeType = (base64: string): string => {
    const match = base64.match(/^data:([^;]+);base64,/);
    return match ? match[1] : 'image/png';
};

export const enhancePrompt = async (userInput: string, style: VisualStyle): Promise<string> => {
    try {
        const recipe = STYLE_RECIPES[style] || "";
        const systemInstruction = `You are an expert UI/UX designer and prompt engineer. 
        Your task is to expand simple UI descriptions into rich, detailed, and structured prompts.
        Use the following Design Recipe as your stylistic foundation:
        ${recipe}`;
        const prompt = `
The user wants a UI for: "${userInput}"
The desired visual style is: "${style}"

Generate a prompt that includes detailed descriptions for:
- **## Overall Vibe & Style**
- **## Color Palette**
- **## Typography**
- **## Layout & Composition**
- **## Key UI Components**
- **## Iconography**
- **## Micro-interactions & Animations (Subtle)**

Your response should ONLY be the generated prompt text.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: { 
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
            }
        });
        
        return response.text || '';
    } catch (error) {
        console.error("Error enhancing prompt:", error);
        throw error;
    }
};

export const generateImagePreview = async (prompt: string): Promise<string> => {
    try {
        const imagePrompt = `A high-fidelity UI mockup for a web/mobile application, embodying the following description. Focus on realism and aesthetics. UI design, UX, user interface. \n\n${prompt}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: imagePrompt }] },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image was generated.");
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
};

const UI_UX_PRO_MAX_RULES = `
CRITICAL UI/UX PRO MAX RULES:
1. DESIGN INTENT: Every visual choice must reinforce a cohesive mood. Avoid "defaults."
2. TYPOGRAPHIC RHYTHM: Create visual hierarchy through variation in font size, weight, and tracking. Use large display type (24vw+) sparingly for impact.
3. SPACING RHYTHM: Use a strict 4px/8px spacing scale (p-2, p-4, p-8). Create rhythm through intentional variation—identical spacing everywhere looks robotic.
4. ICONS: NEVER use emojis for structural icons. Use vector icons (Lucide, Phosphor). Ensure consistent 24px sizing and 1.5px/2px stroke width.
5. INTERACTION: Use color, opacity, or elevation for states. DO NOT use layout-shifting transforms.
6. TOUCH TARGETS: Ensure all interactive elements have a minimum 44x44px tap area.
7. CONTRAST: Maintain >=4.5:1 text contrast. Use semantic color tokens.
8. ACCESSIBILITY: Ensure proper focus states for ALL interactive elements (e.g., focus:ring-2 focus:ring-primary).
9. NO GENERIC GRADIENTS: Avoid simple purple/blue gradients. Use layered radial backgrounds or sophisticated grain textures for depth.
10. SCROLLABILITY: ALWAYS ensure page is vertically scrollable. Never use 'h-screen' or 'overflow-hidden' on the root.
11. SELECTED / HOVER EFFECTS: For any selected or interactive element, add a subtle hover effect (such as a slight scale transform e.g., hover:scale-[1.02], or a shadow change) to indicate interactivity.
12. EXHAUSTIVE CONTENT & MANDATORY FOOTER: Never summarize HTML. Always write out all items in a grid or list (do NOT use "<!-- more items -->"). Always include the complete <main> section and the COMPLETE <footer>.
`;

const STYLE_RECIPES = {
    [VisualStyle.Minimalist]: `
        Recipe: Minimalist / Swiss
        - Typography: High-quality sans-serif (Inter, Helvetica).
        - Layout: Strict grid structure, plenty of negative space.
        - Accents: Single bold highlight color against white/gray.
        - Details: Thin 1px borders, muted secondary text, no shadows.
    `,
    [VisualStyle.Corporate]: `
        Recipe: Clean & Corporate
        - Typography: System fonts (SF Pro, Inter) for trust.
        - Layout: Clear hero section, feature cards with 24px+ corners.
        - Colors: Trustworthy blues, crisp whites, subtle grays (#f5f2ed).
        - Details: Functional clarity, simple data visualizations, clean shadows.
    `,
    [VisualStyle.Bento]: `
        Recipe: Bento Grid
        - Layout: Bento-box style grid with varying card sizes.
        - Components: Cards with large rounded corners (24px-32px), subtle borders.
        - Accents: Glassmorphism elements, subtle gradients within cards.
        - Vibe: Modern, organized, "Apple-style" product showcase.
    `,
    [VisualStyle.Editorial]: `
        Recipe: Editorial / Magazine
        - Typography: Massive display headers (Anton, Playfair Display) with tight line-height (0.85).
        - Layout: Bold overlapping elements, skewed transforms, massive images.
        - Hierarchy: Deep contrast between enormous display type and tiny uppercase labels.
        - Details: Negative letter-spacing on headers, strong asymmetric balance.
    `,
    [VisualStyle.Luxury]: `
        Recipe: Luxury / Prestige
        - Typography: Sophisticated serifs (Cormorant Garamond, Playfair Display).
        - Layout: Exclusive feel, minimal content per section, vertical text accents.
        - Colors: Warm off-whites (#f5f2ed), pure blacks, elegant gold/champagne accents.
        - Details: Oval-masked images, very light font weights (300), 1px borders.
    `,
    [VisualStyle.Technical]: `
        Recipe: Technical Dashboard
        - Typography: Monospace for data (JetBrains Mono), italic serif for headers to humanize.
        - Layout: Visible grid structure, scannable data columns, high information density.
        - Colors: Muted backgrounds (#E4E3E0), stark black lines, scientific precision.
        - Details: Invert-on-hover effects, timecodes, dashed borders.
    `,
    [VisualStyle.Atmospheric]: `
        Recipe: Atmospheric / Immersive
        - Layout: Full-screen immersive layouts, layered radial gradients.
        - Details: Heavy background blurs (60px+), glassmorphism (backdrop-filter: blur(30px)).
        - Vibe: Cinematic, dreamy, or focused. Great for music players or meditation apps.
        - Colors: Deep space blacks, vibrant core glows.
    `,
    [VisualStyle.Brutalist]: `
        Recipe: Neo-Brutalist
        - Colors: Neon accents on stark white/black backgrounds.
        - Layout: Thick 2px-4px black borders, graphic numbered sections (01, 02).
        - Typography: Big bold sans-serifs, marquee animations.
        - Vibe: Innovative, unconventional, high-energy.
    `,
    [VisualStyle.Cyberpunk]: `
        Recipe: Cyberpunk / High-Tech
        - Colors: Neon pinks, cyans, and deep purples on pitch black.
        - Details: Glitch effects, scanline overlays, glowing text.
        - Layout: Future-focused, asymmetric HUDs, data-heavy overlays.
    `,
    [VisualStyle.Playful]: `
        Recipe: Playful & Vibrant
        - Colors: Saturated, energetic palettes (orange, teal, yellow).
        - Typography: Bouncy type, rounded fonts.
        - Layout: Organic shapes, overlapping illustrations, big buttons.
        - Vibe: Fun, approachable, high-energy.
    `,
    [VisualStyle.Vintage]: `
        Recipe: Vintage & Retro
        - Colors: Sepia tones, muted earth colors, grain textures.
        - Typography: Slab serifs, display scripts.
        - Layout: Traditional print-inspired layouts, paper textures.
    `,
    [VisualStyle.Glassmorphism]: `
        Recipe: Modern Glassmorphism
        - Details: Multi-layered glass surfaces, frosted glass effects.
        - Colors: Pastel gradients behind semi-transparent cards.
        - Layout: Floating elements with soft drop shadows.
    `
};

export const generateHtmlFromPrompt = async (prompt: string, style?: VisualStyle): Promise<{ html: string; css: string }> => {
    const recipe = style ? STYLE_RECIPES[style] : "";
    const systemInstruction = `You are a Lead Product Designer. 
Convert UI prompts into single, clean, accessible, and responsive HTML components using Tailwind CSS.

STYLE GUIDELINES:
${recipe}

GENERAL PRINCIPLES:
${UI_UX_PRO_MAX_RULES}`;

    const userPrompt = `Convert this UI prompt into a single, clean, accessible, and responsive HTML snippet using Tailwind CSS.
**PROMPT:** ${prompt}
Return a JSON object with 'html' and 'css' fields. The 'html' field should contain the raw HTML code (no markdown fences). The 'css' field should contain any custom CSS needed (e.g., keyframes, custom classes).
CRITICAL MANDATORY FOOTER: Generate a COMPLETE webpage with a <header>, <main> body with substantive sections, and a full <footer>. NEVER leave out the footer or use placeholder comments like "<!-- content -->".`;

    try {
        const { html, css } = await generateWithContinuation(systemInstruction, userPrompt, undefined, undefined, 0.5);
        return { html, css };
    } catch (error) {
        console.error("Error generating HTML:", error);
        throw error;
    }
};

export const modifyHtml = async (originalHtml: string, modifications: string, style: VisualStyle): Promise<{ html: string; css: string }> => {
    const safeHtml = safeHtmlTruncate(originalHtml, HTML_CONTEXT_CHARS);
    const systemInstruction = "You are an expert UI developer specializing in design system migration and restyling.\n" + UI_UX_PRO_MAX_RULES;
    const userPrompt = `
You are tasked with redesigning and remixing the following "Original HTML" into a entirely new visual language.
Base your redesign on the target visual style: "${style}".
Also apply these specific user modification instructions: "${modifications || 'Completely re-imagine the design while keeping the core content/functionality.'}"

Requirements:
- Preserve the core content and semantic structure (links, text, images, forms).
- Do NOT just tweak colors. We want a completely new layout pattern, typography scale, and aesthetic feel mapping to the new style.
- Apply completely new Tailwind CSS classes.
- Ensure responsiveness (mobile-first) and accessibility improve.
- Replace any generic visual placeholders with better appropriate stylized blocks.

ORIGINAL HTML:
${safeHtml}

Return a JSON object with 'html' and 'css' fields. The 'html' field should contain the FULL, COMPLETE, AND FULLY RESTYLED raw HTML webpage code. 
CRITICAL MANDATORY FOOTER: DO NOT return partial snippets, DO NOT summarize or shorten the page, and DO NOT use placeholder comments like \`<!-- rest of items -->\`. You MUST write out the ENTIRE page structure, including ALL middle sections, the FULL <main> body, and the COMPLETE <footer>.
The 'css' field should contain any custom CSS needed.
`;

    try {
        const { html, css } = await generateWithContinuation(systemInstruction, userPrompt, undefined, undefined, 0.5);
        return { html, css };
    } catch (error) {
        console.error("Error modifying HTML:", error);
        throw error;
    }
};

export const generateBlueprint = async (prompt: string): Promise<{ html: string; css: string }> => {
    const systemInstruction = "You are an expert UX designer. Convert UI prompts into low-fidelity, structural wireframes/blueprints using HTML and Tailwind CSS. Focus on layout, hierarchy, and content placement. Use a grayscale palette, simple boxes, and placeholder text (Lorem Ipsum). Avoid high-fidelity styles, images, or complex colors.\n" + UI_UX_PRO_MAX_RULES;
    const userPrompt = `Convert this UI prompt into a clean, structural wireframe/blueprint using HTML and Tailwind CSS.
**PROMPT:** ${prompt}
Return a JSON object with 'html' and 'css' fields. The 'html' field should contain the raw HTML code (no markdown fences). The 'css' field should contain any custom CSS needed.
CRITICAL MANDATORY FOOTER: Generate a FULL page outline including a footer.`;

    try {
        const { html, css } = await generateWithContinuation(systemInstruction, userPrompt, undefined, undefined, 0.5);
        return { html, css };
    } catch (error) {
        console.error("Error generating blueprint:", error);
        throw error;
    }
};

export const generateFromWireframe = async (base64Image: string): Promise<{ html: string; css: string }> => {
    const systemInstruction = `You are an expert UI/UX designer and Frontend Developer. Your mission is to transform a low-fidelity wireframe into a beautiful, high-fidelity, production-ready UI using HTML and Tailwind CSS.

VISUAL REASONING PROTOCOL:
1. INTERPRET STRUCTURE: Analyze the hand-drawn or digital wireframe to understand the intended layout, hierarchy, and navigation flow.
2. IDENTIFY COMPONENTS: Recognize UI elements like buttons, inputs, cards, and sections even if they are roughly sketched.
3. ENHANCE FIDELITY: Replace generic placeholders (like boxes with "IMAGE" or "TEXT") with appropriate, realistic content and high-quality placeholder images (e.g., using picsum.photos).
4. APPLY MODERN DESIGN: Do not just make a gray box. Apply modern UI/UX principles, beautiful color palettes, typography, shadows, and spacing. Make it look like a premium product.

CRITICAL GUIDELINES:
1. RESPONSIVE DESIGN: Ensure the output is fully responsive using Tailwind's mobile-first breakpoints (sm:, md:, lg:).
2. OUTPUT FORMAT: Return a JSON object with 'html' and 'css' fields. The 'html' field should contain the raw HTML content. The 'css' field should contain any custom CSS needed.
3. EXHAUSTIVE GENERATION & MANDATORY FOOTER: Even if the wireframe skips details, you must generate a full, complete webpage containing a sensible <header>, comprehensive <main> content sections, and a complete <footer>. Do NOT truncate or use comment placeholders.

${UI_UX_PRO_MAX_RULES}`;

    const mimeType = getMimeType(base64Image);
    const data = base64Image.split(',')[1] || base64Image;

    const parts: any[] = [
        { text: "Carefully analyze this wireframe. Identify the intended layout and components. Then, transform it into a high-fidelity, beautiful UI using HTML and Tailwind CSS. Add realistic placeholder content, modern styling, and ensure it is fully responsive." },
        {
            inlineData: {
                data: data,
                mimeType: mimeType
            }
        }
    ];

    try {
        const { html, css } = await generateWithContinuation(systemInstruction, "Wireframe interpretation", parts, undefined, 0.5);
        return { html, css };
    } catch (error) {
        console.error("Error generating from wireframe:", error);
        throw error;
    }
};

export const generateDesignSystem = async (query: string): Promise<any> => {
    try {
        const response = await fetch('/api/design-system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to generate design system: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Error generating design system:", error);
        throw error;
    }
};

export const analyzeHtml = async (html: string): Promise<AnalysisResult> => {
    const systemInstruction = `You are a Senior Design Engineer and Visual Architect. 
    Your task is to analyze the provided HTML code and extract its Design DNA.
    Identify design tokens (colors, typography, spacing patterns), structural architecture, and exactly what HTML semantic elements, custom tags, or schemas are used to compose the site.
    Also, identify any potential runtime/accessibility issues and visual/layout issues.
    
    Be extremely precise with hex codes and Tailwind patterns.
    Identify the underlying layout type (e.g., Bento, Holy Grail, Dashboard, F-Pattern) and structural schema.`;

    const userPrompt = `Analyze this HTML and provide a detailed Design DNA report in JSON format.
    
    HTML:
    ${safeHtmlTruncate(html, 15000)}
    
    Return a JSON object following this schema:
    {
        "designTokens": {
            "colors": ["#hex", "text-gray-900", ...],
            "fonts": ["Inter", "serif", ...],
            "spacing": "strict 4px rhythm",
            "radius": "xl (12px)"
        },
        "architecture": {
            "layout": "Bento Grid with sticky sidebar",
            "components": ["Card", "Badge", "HeroSection"],
            "sections": ["Navigation", "Hero", "Features"],
            "schema": ["<main>", "<article>", "<custom-header>", "role='navigation'"]
        },
        "visualSummary": "A clean, modern technical dashboard using high-contrast typography and subtle glassmorphism.",
        "issues": {
            "runtime": ["Missing alt attributes on hero images", "Contrast ratio fails on secondary buttons"],
            "visual": ["Inconsistent padding on mobile view", "Text-overflow not handled in cards"]
        }
    }`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: userPrompt,
            config: { 
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        designTokens: {
                            type: Type.OBJECT,
                            properties: {
                                colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                                fonts: { type: Type.ARRAY, items: { type: Type.STRING } },
                                spacing: { type: Type.STRING },
                                radius: { type: Type.STRING }
                            },
                            required: ['colors', 'fonts', 'spacing', 'radius']
                        },
                        architecture: {
                            type: Type.OBJECT,
                            properties: {
                                layout: { type: Type.STRING },
                                components: { type: Type.ARRAY, items: { type: Type.STRING } },
                                sections: { type: Type.ARRAY, items: { type: Type.STRING } },
                                schema: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detected HTML tags, custom elements, ARIA roles, or schema.org microdata" }
                            },
                            required: ['layout', 'components', 'sections', 'schema']
                        },
                        visualSummary: { type: Type.STRING },
                        issues: {
                            type: Type.OBJECT,
                            properties: {
                                runtime: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Runtime, accessibility, or best practice issues" },
                                visual: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Visual, layout, or contrast issues" }
                            },
                            required: ['runtime', 'visual']
                        }
                    },
                    required: ['designTokens', 'architecture', 'visualSummary']
                }
            }
        });
        
        return JSON.parse(response.text || '{}') as AnalysisResult;
    } catch (error) {
        console.error("Error analyzing HTML:", error);
        throw error;
    }
};

export const cloneWebsite = async (url: string, screenshots: string[] = [], pastedContent: string = ''): Promise<{ html: string; css: string; sources: GroundingSource[] }> => {
    let scrapedData: { html?: string; title?: string } = {};

    if (url) {
        try {
            console.log(`Scraping URL: ${url}`);
            const scrapeResponse = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            if (scrapeResponse.ok) {
                const data = await scrapeResponse.json();
                scrapedData = { html: data.html, title: data.title };
                console.log('Scraping successful');
            } else {
                console.warn('[cloneWebsite] Scraper returned', scrapeResponse.status);
            }
        } catch (err) {
            console.warn('[cloneWebsite] Scraper failed, continuing without HTML context:', err);
        }
    }

    const systemInstruction = `You are an expert Web Architect and Frontend Reconstructor.

Your task is to reproduce a website as a single, self-contained HTML file using Tailwind CSS.
Focus strictly on the semantic HTML structure and content provided.

RECONSTRUCTION PROTOCOL:
1. SEMANTIC STRUCTURE: Use the provided HTML structure to identify key sections.
2. TAILWIND ADAPTATION: Map the layout and typography to Tailwind CSS classes.
3. CONTENT FIDELITY: Preserve all text content exactly as it appears in the source.

CRITICAL MANDATORY RULES (DO NOT IGNORE):
1. Return ONLY valid JSON: { "html": "...", "css": "..." }.
2. Use semantic HTML5 elements.
3. The result MUST be vertically scrollable.
4. DO NOT SUMMARIZE OR SHORTEN THE HTML. You MUST generate the ENTIRE webpage, including ALL middle sections, ALL products/features/testimonials from the source, and a COMPLETE <footer>.
5. Never use placeholders like "<!-- rest of the page -->" or "<!-- additional items here -->". Write out EVERY single item.
6. The user-provided HTML and text are the primary sources of truth. If it's in the source HTML, it MUST be in your generated HTML.
`;

    let userPrompt = url
        ? `Clone the website at ${url}. Use the provided HTML and text context to reconstruct the page with Tailwind CSS.`
        : `Reconstruct the UI shown in the provided materials as a high-fidelity Tailwind CSS page.`;

    if (scrapedData.title) {
        userPrompt += `\nPage title: "${scrapedData.title}"`;
    }

    if (scrapedData.html) {
        const safeHtml = safeHtmlTruncate(scrapedData.html, HTML_CONTEXT_CHARS);
        userPrompt += `\n\nTarget HTML Content:\n${safeHtml}`;
    }

    if (pastedContent.trim()) {
        userPrompt += `\n\nUser-provided HTML/Text Content:\n${pastedContent.trim()}`;
    }

    userPrompt += `\n\nReturn ONLY a JSON object: { "html": "...", "css": "..." }
CRITICAL MANDATORY FOOTER: The page must be exhaustive and have a complete footer.`;

    const parts: any[] = [{ text: userPrompt }];

    if (screenshots.length > 0) {
        for (const shot of screenshots) {
            const rawB64 = stripDataUriPrefix(shot);
            if (rawB64) {
                parts.push({ inlineData: { data: rawB64, mimeType: 'image/png' } });
            }
        }
    }

    try {
        const tools = [{ googleSearch: {} }];
        const { html, css, responseObj } = await generateWithContinuation(systemInstruction, userPrompt, parts, tools, 0.15);
        const sources = responseObj.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { html, css, sources };
    } catch (error) {
        console.error("Error cloning website:", error);
        throw error;
    }
};
