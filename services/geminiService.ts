import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { VisualStyle, GroundingSource } from '../types.ts';

// Initializing the GoogleGenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── constants ────────────────────────────────────────────────────────────────
const CLONE_MODEL = 'gemini-3.1-pro-preview'; 
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
        const systemInstruction = "You are an expert UI/UX designer and prompt engineer. Your task is to expand simple UI descriptions into rich, detailed, and structured prompts.";
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
1. Icons: NEVER use emojis for structural icons. Use vector icons (e.g., Lucide, Phosphor, Heroicons). Ensure consistent sizing (e.g., 24px) and stroke width.
2. Interaction: Use color, opacity, or elevation for hover/press states. DO NOT use layout-shifting transforms that move surrounding content.
3. Touch Targets: Ensure all interactive elements have a minimum 44x44px tap area.
4. Contrast & Theming: Maintain >=4.5:1 text contrast. Ensure borders and dividers are visible in both light and dark modes. Use semantic color tokens.
5. Spacing & Layout: Use a strict 4px/8px spacing rhythm (e.g., p-2, p-4, gap-4). Keep predictable content widths and readable text measures (max-w-prose for long text).
6. Accessibility: Ensure proper focus states, semantic HTML tags, and aria-labels for icon-only buttons.
7. SCROLLABILITY: NEVER use 'h-screen' or 'overflow-hidden' on the main body or root container. The page MUST be vertically scrollable. Ensure all sections are stacked vertically and the footer is at the very bottom of the document flow.
`;

export const generateHtmlFromPrompt = async (prompt: string): Promise<{ html: string; css: string }> => {
    const systemInstruction = "You are an expert front-end developer. Convert UI prompts into single, clean, accessible, and responsive HTML components using Tailwind CSS. Also provide any necessary custom CSS for animations, keyframes, or specific styles not covered by Tailwind.\n" + UI_UX_PRO_MAX_RULES;
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

CRITICAL GUIDELINES:
1. INTERPRET THE WIREFRAME: Understand the layout, hierarchy, and intent of the wireframe. Replace generic placeholders (like boxes with "IMAGE" or "TEXT") with appropriate, realistic content and high-quality placeholder images (e.g., using picsum.photos).
2. ELEVATE THE DESIGN: Do not just make a gray box. Apply modern UI/UX principles, beautiful color palettes, typography, shadows, and spacing. Make it look like a premium product.
3. RESPONSIVE DESIGN: Ensure the output is fully responsive using Tailwind's mobile-first breakpoints (sm:, md:, lg:).
4. OUTPUT FORMAT: Return a JSON object with 'html' and 'css' fields. The 'html' field should contain the raw HTML content. The 'css' field should contain any custom CSS needed.

${UI_UX_PRO_MAX_RULES}`;

    const mimeType = getMimeType(base64Image);
    const data = base64Image.split(',')[1] || base64Image;

    const parts: any[] = [
        { text: "Transform this wireframe into a high-fidelity, beautiful UI using HTML and Tailwind CSS. Add realistic placeholder content, modern styling, and ensure it is fully responsive." },
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

export const cloneWebsite = async (url: string, screenshots: string[] = [], pastedContent: string = ''): Promise<{ html: string; css: string; sources: GroundingSource[] }> => {
    // ── 1. Scrape the target URL ──────────────────────────────────────────────
    let scrapedData: { html?: string; screenshot?: string; fullPageScreenshot?: string; title?: string; cssVariables?: any } = {};

    if (url) {
        try {
            console.log(`Scraping URL: ${url}`);
            const scrapeResponse = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            if (scrapeResponse.ok) {
                scrapedData = await scrapeResponse.json();
                console.log('Scraping successful');
            } else {
                console.warn('[cloneWebsite] Scraper returned', scrapeResponse.status);
            }
        } catch (err) {
            console.warn('[cloneWebsite] Scraper failed, continuing without HTML context:', err);
        }
    }

    const systemInstruction = `You are a Pixel-Perfect Web Reconstructor.

Your task: reproduce the provided website as a single self-contained HTML file
with an embedded <style> block. The output must cover the COMPLETE PAGE from the
very first element to the very last — including NAVIGATION, HERO, ALL SECTIONS,
and the FOOTER with all its columns, links, and copyright line.

MANDATORY RULES:
1. Output ONLY valid JSON. No markdown fences, no prose, no comments outside JSON.
2. JSON schema: { "html": "<full HTML string>", "css": "<all CSS as a string>" }
3. The html value MUST end with </html>. Never truncate.
4. Reproduce every visible section. If you are running low on space, compress
   whitespace and shorten comments — but NEVER omit the footer or any section.
5. Use semantic HTML5 elements: <header>, <nav>, <main>, <section>, <footer>.
6. Inline all CSS inside a <style> tag in <head>. The css field may be empty "".
7. Use CSS custom properties (variables) for all colors and spacing.
8. All interactive elements must have cursor:pointer and visible focus states.
9. The footer must contain: logo/brand, navigation columns, social links, and
   a copyright line with the current year.
10. NEVER stop generating before the closing </html> tag.
11. SCROLLABILITY: The resulting page MUST be vertically scrollable. DO NOT use 
    'h-screen', 'fixed', or 'overflow-hidden' on the body or main wrapper. 
    Ensure the page height is determined by its content.
12. VISUAL FIDELITY: Prioritize the visual appearance shown in the SCREENSHOTS. 
    The scraped HTML is for content and structure reference, but the screenshots 
    are the source of truth for layout, colors, and spacing.

${UI_UX_PRO_MAX_RULES}`;

    // ── 2. Build the prompt ───────────────────────────────────────────────────
    let userPrompt = url
        ? `Reconstruct the website at ${url} as a complete, pixel-perfect HTML page. Use the provided screenshots as the primary visual reference for layout, colors, and styling. Ensure the entire page is captured, including the footer.`
        : `Reconstruct the website shown in the provided screenshots as a complete HTML page. Use the screenshots as the primary visual reference for layout, colors, and styling. Ensure the entire page is captured, including the footer.`;

    if (scrapedData.title) {
        userPrompt += `\nPage title: "${scrapedData.title}"`;
    }

    if (scrapedData.html) {
        // FIX: safe truncation — never mid-tag, no trailing "..." that confuses the model
        const safeHtml = safeHtmlTruncate(scrapedData.html, HTML_CONTEXT_CHARS);
        userPrompt += `\n\nScraped HTML Structure (for structure/content reference):\n${safeHtml}`;
    }

    if (scrapedData.cssVariables) {
        userPrompt += `\n\nCSS Custom Properties (Reference):\n${JSON.stringify(scrapedData.cssVariables, null, 2)}`;
    }

    if (pastedContent.trim()) {
        userPrompt += `\n\nAdditional context provided by user:\n${pastedContent.trim()}`;
    }

    userPrompt += `\n\nReturn ONLY a JSON object: { "html": "...", "css": "..." }`;

    // ── 3. Assemble multimodal parts ──────────────────────────────────────────
    const parts: any[] = [{ text: userPrompt }];

    // FIX: strip data-URI prefix — inlineData.data must be raw base64
    const allScreenshots = [
        ...(scrapedData.screenshot ? [scrapedData.screenshot] : []),
        ...(scrapedData.fullPageScreenshot ? [scrapedData.fullPageScreenshot] : []),
        ...screenshots,
    ];

    for (const shot of allScreenshots) {
        const rawB64 = stripDataUriPrefix(shot);
        if (rawB64) {
            parts.push({ inlineData: { data: rawB64, mimeType: 'image/png' } });
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
