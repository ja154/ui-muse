import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { VisualStyle, GroundingSource, AnalysisResult } from '../types.ts';

// Initializing the GoogleGenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── constants ────────────────────────────────────────────────────────────────
const CLONE_MODEL = 'gemini-3.1-pro-preview'; 
const VISION_MODEL = 'gemini-3.1-pro-preview'; // Explicitly using pro for vision tasks
const MAX_TOKENS = 32768;                       // was 8192 — critical fix
const HTML_CONTEXT_CHARS = 40_000;              // scraped HTML context window

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip the data-URI prefix from a base64 string so it can be sent as
 * inlineData.data (which must be raw base64, not a data URI).
 */
function stripDataUriPrefix(b64: string): string {
    const commaIdx = b64.indexOf(',');
    return commaIdx !== -1 ? b64.slice(commaIdx + 1) : b64;
}

/**
 * Truncate HTML context at a safe tag boundary so the model never receives
 * a broken mid-tag string. Returns the truncated string without any trailing
 * ellipsis (which confuses the model into thinking the page is partially done).
 */
function safeHtmlTruncate(html: string, maxChars: number): string {
    if (html.length <= maxChars) return html;
    const slice = html.slice(0, maxChars);
    // Walk back to the last complete closing tag
    const lastClose = slice.lastIndexOf('>');
    return lastClose !== -1 ? slice.slice(0, lastClose + 1) : slice;
}

/**
 * Strip common "non-scrollable" classes that Gemini often adds despite instructions.
 */
function cleanHtml(html: string): string {
    return html
        .replace(/\bh-screen\b/g, 'min-h-screen')
        .replace(/\boverflow-hidden\b/g, 'overflow-visible')
        .replace(/\boverflow-y-hidden\b/g, 'overflow-y-visible');
}

/**
 * Extract JSON from model output robustly:
 *   1. Try direct parse
 *   2. Strip markdown fences (```json ... ```) then parse
 *   3. Extract the first {...} block via regex then parse
 *   4. Return null if all attempts fail
 */
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
            if (typeof parsed.html === 'string') return parsed;
        } catch {
            // try next
        }
    }

    // Last resort: regex-extract html and css fields individually
    const htmlMatch = raw.match(/"html"\s*:\s*"([\s\S]*?)(?<!\\)",\s*"css"/);
    const cssMatch  = raw.match(/"css"\s*:\s*"([\s\S]*?)(?<!\\)"[\s\n]*\}/);
    if (htmlMatch) {
        return {
            html: htmlMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
            css:  cssMatch  ? cssMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\') : '',
        };
    }

    return null;
}

/**
 * Check whether a generated HTML string is complete (ends with </html>).
 */
function isHtmlComplete(html: string): boolean {
    return /<\/html\s*>/i.test(html.trimEnd());
}

/**
 * Request a continuation from the model when the first pass was truncated.
 * Sends the partial HTML back and asks the model to complete it from where
 * it left off, returning only the remaining HTML (no JSON wrapper).
 */
async function requestContinuation(
    partialHtml: string,
    originalPrompt: string,
): Promise<string> {
    const continuationSystem = `You are completing a partially generated HTML page.
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

const getMimeType = (base64: string): string => {
    const match = base64.match(/^data:([^;]+);base64,/);
    return match ? match[1] : 'image/png';
};

const cleanHtmlResponse = (text: string): string => {
    let refinedCode = text.trim();
    const codeFenceRegex = /^```html\s*\n?(.*?)\n?\s*```$/s;
    const match = refinedCode.match(codeFenceRegex);
    if (match && match[1]) {
        refinedCode = match[1].trim();
    }
    return refinedCode;
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
Return a JSON object with 'html' and 'css' fields. The 'html' field should contain the raw HTML code (no markdown fences). The 'css' field should contain any custom CSS needed (e.g., keyframes, custom classes).`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: userPrompt,
            config: { 
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        html: { type: Type.STRING },
                        css: { type: Type.STRING }
                    },
                    required: ['html', 'css']
                }
            }
        });
        
        const jsonResponse = JSON.parse(response.text || '{}');
        return {
            html: cleanHtml(jsonResponse.html || ''),
            css: jsonResponse.css || ''
        };
    } catch (error) {
        console.error("Error generating HTML:", error);
        throw error;
    }
};

export const modifyHtml = async (originalHtml: string, styleHtml: string): Promise<{ html: string; css: string }> => {
    const systemInstruction = "You are an expert UI developer specializing in design system migration and restyling.\n" + UI_UX_PRO_MAX_RULES;
    const userPrompt = `
Re-style the following "Original HTML" using the design language and Tailwind CSS classes from the "Style HTML".
Preserve original content and improve accessibility.
ORIGINAL: ${originalHtml}
STYLE: ${styleHtml}
Return a JSON object with 'html' and 'css' fields. The 'html' field should contain the raw HTML code. The 'css' field should contain any custom CSS needed.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: userPrompt,
            config: { 
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        html: { type: Type.STRING },
                        css: { type: Type.STRING }
                    },
                    required: ['html', 'css']
                }
            }
        });
        const jsonResponse = JSON.parse(response.text || '{}');
        return {
            html: cleanHtml(jsonResponse.html || ''),
            css: jsonResponse.css || ''
        };
    } catch (error) {
        console.error("Error modifying HTML:", error);
        throw error;
    }
};

export const generateBlueprint = async (prompt: string): Promise<{ html: string; css: string }> => {
    const systemInstruction = "You are an expert UX designer. Convert UI prompts into low-fidelity, structural wireframes/blueprints using HTML and Tailwind CSS. Focus on layout, hierarchy, and content placement. Use a grayscale palette, simple boxes, and placeholder text (Lorem Ipsum). Avoid high-fidelity styles, images, or complex colors.\n" + UI_UX_PRO_MAX_RULES;
    const userPrompt = `Convert this UI prompt into a clean, structural wireframe/blueprint using HTML and Tailwind CSS.
**PROMPT:** ${prompt}
Return a JSON object with 'html' and 'css' fields. The 'html' field should contain the raw HTML code (no markdown fences). The 'css' field should contain any custom CSS needed.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: userPrompt,
            config: { 
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        html: { type: Type.STRING },
                        css: { type: Type.STRING }
                    },
                    required: ['html', 'css']
                }
            }
        });
        
        const jsonResponse = JSON.parse(response.text || '{}');
        return {
            html: cleanHtml(jsonResponse.html || ''),
            css: jsonResponse.css || ''
        };
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
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts },
            config: {
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
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

        const jsonResponse = JSON.parse(response.text || '{}');
        return { html: cleanHtml(jsonResponse.html || ''), css: jsonResponse.css || '' };
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
    Identify design tokens (colors, typography, spacing patterns) and structural architecture (layout patterns, component hierarchy).
    
    Be extremely precise with hex codes and Tailwind patterns.
    Identify the underlying layout type (e.g., Bento, Holy Grail, Dashboard, F-Pattern).`;

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
            "sections": ["Navigation", "Hero", "Features"]
        },
        "visualSummary": "A clean, modern technical dashboard using high-contrast typography and subtle glassmorphism."
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
                                sections: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ['layout', 'components', 'sections']
                        },
                        visualSummary: { type: Type.STRING }
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
    // ── 1. Scrape the target URL ──────────────────────────────────────────────
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

MANDATORY RULES:
1. Return ONLY valid JSON: { "html": "...", "css": "..." }.
2. Use semantic HTML5 elements.
3. The result MUST be vertically scrollable.
4. Ensure the footer is present.
5. The user-provided HTML and text are the primary sources of truth.
`;

    // ── 2. Build the prompt ───────────────────────────────────────────────────
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

    userPrompt += `\n\nReturn ONLY a JSON object: { "html": "...", "css": "..." }`;

    // ── 3. Assemble multimodal parts ──────────────────────────────────────────
    const parts: any[] = [{ text: userPrompt }];

    if (screenshots.length > 0) {
        for (const shot of screenshots) {
            const rawB64 = stripDataUriPrefix(shot);
            if (rawB64) {
                parts.push({ inlineData: { data: rawB64, mimeType: 'image/png' } });
            }
        }
    }

    // ── 4. First-pass generation ──────────────────────────────────────────────
    try {
        const firstResponse = await ai.models.generateContent({
            model: CLONE_MODEL,
            contents: { role: 'user', parts },
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
                maxOutputTokens: MAX_TOKENS,  // FIX: was 8192
                temperature: 0.15,            // low temperature for faithful reconstruction
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
            console.error('[cloneWebsite] Failed to parse Gemini response. Raw (first 500):', rawText.slice(0, 500));
            throw new Error('Gemini returned an unparseable response. Please try again.');
        }

        // ── 5. Continuation pass if HTML was truncated ────────────────────────────
        if (!isHtmlComplete(parsed.html)) {
            console.warn('[cloneWebsite] HTML truncated — requesting continuation pass...');
            try {
                const continuation = await requestContinuation(parsed.html, userPrompt);
                // Splice: find where the partial ended and where continuation picks up
                const overlapCheck = parsed.html.slice(-200).trim();
                const contTrimmed  = continuation.trimStart();
                if (contTrimmed.startsWith(overlapCheck.slice(-40))) {
                    parsed.html += contTrimmed.slice(overlapCheck.slice(-40).length);
                } else {
                    parsed.html += contTrimmed;
                }

                if (!isHtmlComplete(parsed.html)) {
                    // Force-close any dangling open structure
                    parsed.html = parsed.html.trimEnd();
                    if (!parsed.html.endsWith('</footer>')) parsed.html += '\n</footer>';
                    if (!parsed.html.includes('</body>'))   parsed.html += '\n</body>';
                    if (!parsed.html.includes('</html>'))   parsed.html += '\n</html>';
                }
            } catch (contErr) {
                console.error('[cloneWebsite] Continuation pass failed:', contErr);
                // Force-close gracefully rather than serving a broken page
                parsed.html = parsed.html.trimEnd()
                    + '\n<!-- generation was truncated -->\n</section></main></body></html>';
            }
        }

        if (isHtmlComplete(parsed.html)) {
            parsed.html = cleanHtml(parsed.html);
        }

        const sources = firstResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        return { html: parsed.html, css: parsed.css ?? '', sources };
    } catch (error) {
        console.error("Error cloning website:", error);
        throw error;
    }
};
