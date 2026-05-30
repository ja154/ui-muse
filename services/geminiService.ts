import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { VisualStyle, GroundingSource, AnalysisResult } from '../types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── constants ────────────────────────────────────────────────────────────────
const MAIN_MODEL   = 'gemini-3.1-pro-preview';
const MAX_TOKENS   = 32768;          // always explicit — never rely on model default
const HTML_CONTEXT_CHARS = 40_000;  // scraped HTML context window cap

// ─── helpers ──────────────────────────────────────────────────────────────────

function stripDataUriPrefix(b64: string): string {
    const i = b64.indexOf(',');
    return i !== -1 ? b64.slice(i + 1) : b64;
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

function isHtmlComplete(html: string): boolean {
    const trimmed = html.trimEnd().toLowerCase();
    return trimmed.endsWith('</html>');
}

function forceCloseHtml(html: string): string {
    const h = html.trimEnd();
    // Close any obviously-open block-level containers
    const needsFooter  = !/<\/footer>/i.test(h);
    const needsMain    = !/<\/main>/i.test(h) && !needsFooter;
    const needsBody    = !/<\/body>/i.test(h);
    const needsHtml    = !/<\/html>/i.test(h);

    let fixed = h;
    if (needsFooter) fixed += '\n</section>\n</footer>';
    if (needsMain)   fixed += '\n</main>';
    if (needsBody)   fixed += '\n</body>';
    if (needsHtml)   fixed += '\n</html>';
    return fixed;
}

/** 
 * Extract { html, css } from raw model text.
 * Handles: direct JSON, ```json fences, first-{...} extraction,
 * and individual field regex as last resort.
 */
function extractJson(raw: string): { html: string; css: string } | null {
    const attempts: string[] = [
        raw.trim(),
        raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(),
        (() => {
            const s = raw.indexOf('{');
            const e = raw.lastIndexOf('}');
            return s !== -1 && e > s ? raw.slice(s, e + 1) : '';
        })(),
    ];

    for (const attempt of attempts) {
        if (!attempt) continue;
        try {
            const parsed = JSON.parse(attempt);
            if (typeof parsed.html === 'string') {
                return { html: parsed.html, css: parsed.css || '' };
            }
        } catch { /* try next */ }
    }

    // Last resort: regex-extract individual fields
    const htmlMatch = raw.match(/"html"\s*:\s*"([\s\S]*?)(?<!\\)",\s*"css"/);
    const cssMatch  = raw.match(/"css"\s*:\s*"([\s\S]*?)(?<!\\)"[\s\n]*\}/);
    if (htmlMatch) {
        return {
            html: htmlMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
            css:  cssMatch ? cssMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\') : '',
        };
    }
    return null;
}

/**
 * Universal continuation pass — works for any generation endpoint.
 * Sends the partial HTML and asks the model to complete from where it stopped.
 */
async function requestContinuation(
    partialHtml: string,
    contextHint: string,
): Promise<string> {
    const system = `You are completing a partially generated HTML page.
Continue from EXACTLY where it left off — output ONLY the remaining HTML, no JSON, no markdown, no repetition.
Your output MUST end with </footer></body></html>.
Include a complete, populated footer section before </body>.`;

    const prompt = `Context: ${contextHint}

The previous generation was truncated. Here is the end of what was generated:
--- PARTIAL (last 6000 chars) ---
${partialHtml.slice(-6000)}
--- END ---

Complete the remaining HTML now. Start exactly where it cut off.
MANDATORY: include a footer, close all open tags, end with </body></html>.`;

    const response = await ai.models.generateContent({
        model: MAIN_MODEL,
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: {
            systemInstruction: system,
            maxOutputTokens: MAX_TOKENS,
            temperature: 0.1,
        },
    });

    return response.text ?? '';
}

/**
 * Stitch a continuation onto a partial HTML string.
 * Avoids duplicating the overlap region.
 */
function stitchContinuation(partial: string, continuation: string): string {
    const cont = continuation.trimStart();
    // Find up to 60-char overlap at the seam to avoid duplication
    const overlapLen = Math.min(60, partial.length);
    const tail = partial.slice(-overlapLen);
    const overlapStart = cont.indexOf(tail.slice(-30));
    if (overlapStart !== -1) {
        return partial + cont.slice(overlapStart + 30);
    }
    return partial + cont;
}

/**
 * Run a generation and, if the HTML is truncated, do one continuation pass.
 * Returns { html, css } with a complete HTML document.
 */
async function generateWithContinuation(
    prompt: string,
    systemInstruction: string,
    contextHint: string,
    temperature = 0.2,
): Promise<{ html: string; css: string }> {
    const response = await ai.models.generateContent({
        model: MAIN_MODEL,
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: {
            systemInstruction,
            maxOutputTokens: MAX_TOKENS,
            temperature,
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    html: { type: Type.STRING },
                    css:  { type: Type.STRING },
                },
                required: ['html', 'css'],
            },
        },
    });

    const rawText = response.text ?? '';
    let parsed = extractJson(rawText);

    if (!parsed) {
        throw new Error('Model returned an unparseable response. Please try again.');
    }

    // ── Continuation pass if truncated ───────────────────────────────────────
    if (!isHtmlComplete(parsed.html)) {
        console.warn('[generateWithContinuation] HTML truncated — running continuation pass...');
        try {
            const continuation = await requestContinuation(parsed.html, contextHint);
            if (continuation.trim().length > 50) {
                parsed.html = stitchContinuation(parsed.html, continuation);
            }
        } catch (err) {
            console.error('[generateWithContinuation] Continuation failed:', err);
        }

        // Force-close if still incomplete
        if (!isHtmlComplete(parsed.html)) {
            parsed.html = forceCloseHtml(parsed.html);
        }
    }

    return {
        html: cleanHtml(parsed.html),
        css:  parsed.css || '',
    };
}

const getMimeType = (base64: string): string => {
    const match = base64.match(/^data:([^;]+);base64,/);
    return match ? match[1] : 'image/png';
};

// ─── STYLE RECIPES ────────────────────────────────────────────────────────────

export const STYLE_RECIPES: Record<VisualStyle, string> = {
    [VisualStyle.Minimalist]: `
        Recipe: Minimalist / Swiss
        - Typography: High-quality sans-serif (Inter, Helvetica). Strict grid structure, ample whitespace.
        - Accents: Single bold highlight color against white/gray. Thin 1px borders, no shadows.`,
    [VisualStyle.Corporate]: `
        Recipe: Clean & Corporate
        - Typography: System fonts (SF Pro, Inter). Trustworthy blues, crisp whites, subtle grays.
        - Details: Functional clarity, simple data visualizations, clean shadows.`,
    [VisualStyle.Bento]: `
        Recipe: Bento Grid
        - Layout: Bento-box style grid with varying card sizes, 24-32px corner radius.
        - Accents: Glassmorphism elements, subtle gradients. Apple-style product showcase.`,
    [VisualStyle.Editorial]: `
        Recipe: Editorial / Magazine
        - Typography: Massive display headers (Anton, Playfair), tight line-height (0.85).
        - Layout: Bold overlapping elements, skewed transforms, deep hierarchy.`,
    [VisualStyle.Luxury]: `
        Recipe: Luxury / Prestige
        - Typography: Sophisticated serifs (Cormorant Garamond). Warm off-whites, pure blacks, gold.
        - Details: Oval-masked images, very light font weights (300), 1px borders.`,
    [VisualStyle.Technical]: `
        Recipe: Technical Dashboard
        - Typography: Monospace for data (JetBrains Mono). High information density.
        - Colors: Muted backgrounds (#E4E3E0), stark black lines, scientific precision.`,
    [VisualStyle.Atmospheric]: `
        Recipe: Atmospheric / Immersive
        - Layout: Full-screen immersive, layered radial gradients, heavy blurs (60px+).
        - Vibe: Cinematic, dreamy. Great for music players or meditation apps.`,
    [VisualStyle.Brutalist]: `
        Recipe: Neo-Brutalist
        - Colors: Neon accents on stark white/black. Thick 2-4px black borders.
        - Typography: Big bold sans-serifs, marquee animations.`,
    [VisualStyle.Cyberpunk]: `
        Recipe: Cyberpunk / High-Tech
        - Colors: Neon pinks, cyans, deep purples on pitch black. Glitch effects, glowing text.
        - Layout: Future-focused, asymmetric HUDs, data-heavy overlays.`,
    [VisualStyle.Playful]: `
        Recipe: Playful & Vibrant
        - Colors: Saturated, energetic palettes (orange, teal, yellow). Big rounded buttons.
        - Vibe: Fun, approachable, high-energy.`,
    [VisualStyle.Vintage]: `
        Recipe: Vintage & Retro
        - Colors: Sepia tones, muted earth colors, grain textures.
        - Typography: Slab serifs, display scripts. Traditional print layouts.`,
    [VisualStyle.Glassmorphism]: `
        Recipe: Modern Glassmorphism
        - Details: Multi-layered glass surfaces, frosted glass, pastel gradients.
        - Layout: Floating elements with soft drop shadows.`,
};

// ─── SHARED RULES ─────────────────────────────────────────────────────────────

const UI_UX_PRO_MAX_RULES = `
CRITICAL UI/UX RULES:
1. COMPLETE HTML: Always output a COMPLETE, self-contained HTML document from <!DOCTYPE html> to </html>.
2. FOOTER MANDATORY: EVERY page MUST have a populated <footer> section. Never omit it.
3. BODY CONTENT: Ensure <body> contains all sections: nav/header, main content, AND footer.
4. SCROLLABILITY: Never use 'h-screen' or 'overflow-hidden' on root elements.
5. TOUCH TARGETS: All interactive elements must be at least 44x44px.
6. CONTRAST: Maintain >=4.5:1 text contrast.
7. RESPONSIVE: Use Tailwind mobile-first breakpoints (sm:, md:, lg:).
8. NO GENERIC GRADIENTS: Use layered radial backgrounds for depth.
9. COMPLETENESS CHECK: Before finishing, verify: opening tags have closing tags, footer exists, </body></html> are present.
`;

const FULL_PAGE_SYSTEM = `You are a Lead Product Designer and Frontend Engineer.
Convert UI prompts into COMPLETE, production-ready, self-contained HTML documents.

MANDATORY STRUCTURE — every response MUST contain ALL of these sections:
1. <!DOCTYPE html><html> ... </html> — full document
2. <head> with Tailwind CDN, meta tags, title
3. <body> with:
   a. Navigation/header
   b. Main content sections (hero, features, etc.)
   c. **FOOTER** — always present, always populated with links, copyright, contact info
4. Closing </body></html>

${UI_UX_PRO_MAX_RULES}`;

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export const enhancePrompt = async (userInput: string, style: VisualStyle): Promise<string> => {
    const recipe = STYLE_RECIPES[style] || '';
    const systemInstruction = `You are an expert UI/UX designer and prompt engineer.
Expand simple UI descriptions into rich, detailed, structured prompts.
Style foundation: ${recipe}`;

    const prompt = `
The user wants a UI for: "${userInput}"
The desired visual style is: "${style}"

Generate a detailed prompt with sections for:
- ## Overall Vibe & Style
- ## Color Palette
- ## Typography
- ## Layout & Composition
- ## Key UI Components
- ## Iconography
- ## Micro-interactions & Animations (Subtle)

Output ONLY the generated prompt text.`;

    const response = await ai.models.generateContent({
        model: MAIN_MODEL,
        contents: prompt,
        config: {
            systemInstruction,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
    });

    return response.text || '';
};

export const generateImagePreview = async (prompt: string): Promise<string> => {
    const imagePrompt = `A high-fidelity UI mockup for a web/mobile application. UI design, UX, user interface.\n\n${prompt}`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePrompt }] },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error('No image was generated.');
};

export const generateHtmlFromPrompt = async (
    prompt: string,
    style?: VisualStyle,
): Promise<{ html: string; css: string }> => {
    const recipe = style ? STYLE_RECIPES[style] : '';
    const system = `${FULL_PAGE_SYSTEM}\n\nSTYLE GUIDELINES:\n${recipe}`;
    const userPrompt = `Convert this UI prompt into a COMPLETE, self-contained HTML document using Tailwind CSS.

PROMPT: ${prompt}

REQUIREMENTS:
- Full <!DOCTYPE html> to </html> document
- Include Tailwind CDN in <head>
- Navigation, all main content sections, AND a complete footer
- Return JSON: { "html": "...", "css": "..." }`;

    return generateWithContinuation(userPrompt, system, `UI page: ${prompt.slice(0, 100)}`);
};

/**
 * Extract the structural skeleton from an HTML document:
 * section tag names, IDs, class hints, and text content anchors.
 * Used to lock the remix output to the original's content structure.
 */
function extractStructuralMap(html: string): string {
    const lines: string[] = [];
    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) lines.push(`TITLE: ${titleMatch[1].trim()}`);

    // Extract top-level semantic sections in order
    const sectionPattern = /<(nav|header|main|section|article|aside|footer)([^>]*)>/gi;
    let match: RegExpExecArray | null;
    let sectionIndex = 0;
    while ((match = sectionPattern.exec(html)) !== null && sectionIndex < 30) {
        const tag = match[1].toLowerCase();
        const attrs = match[2];
        const idMatch = attrs.match(/id=["']([^"']+)["']/i);
        const classMatch = attrs.match(/class=["']([^"']{0,80})["']/i);
        const ariaMatch = attrs.match(/aria-label=["']([^"']+)["']/i);
        let desc = `<${tag}`;
        if (idMatch) desc += ` id="${idMatch[1]}"`;
        if (ariaMatch) desc += ` aria-label="${ariaMatch[1]}"`;
        if (classMatch) {
            // extract meaningful class tokens (bg-, text-, font-, etc.)
            const classes = classMatch[1].split(/\s+/)
                .filter(c => /^(bg-|text-|border-|font-|flex|grid|sticky|fixed|hero|banner|nav|footer|header|product|feature|testimonial|cta|marquee)/.test(c))
                .slice(0, 6).join(' ');
            if (classes) desc += ` class="${classes}..."`;
        }
        desc += '>';
        lines.push(desc);
        sectionIndex++;
    }

    // Extract all heading text in order (h1-h3) as content anchors
    const headingPattern = /<h([1-3])[^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    let hIdx = 0;
    while ((match = headingPattern.exec(html)) !== null && hIdx < 20) {
        const text = match[2].replace(/<[^>]+>/g, '').trim().slice(0, 80);
        if (text) lines.push(`H${match[1]}: "${text}"`);
        hIdx++;
    }

    // Extract nav link text
    const navPattern = /<a[^>]*class="[^"]*(?:nav|menu)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    const navTexts: string[] = [];
    while ((match = navPattern.exec(html)) !== null && navTexts.length < 10) {
        const text = match[1].replace(/<[^>]+>/g, '').trim();
        if (text) navTexts.push(text);
    }
    if (navTexts.length) lines.push(`NAV_LINKS: [${navTexts.join(', ')}]`);

    // Check for key sections
    const hasAnnouncement = /<div[^>]+(?:animate-marquee|marquee|announcement)[^>]*>/i.test(html);
    const hasHero = /<section[^>]*(?:hero|banner)[^>]*>|<h1/i.test(html);
    const hasFeatures = /<section[^>]*(?:feature|benefit)[^>]*>/i.test(html);
    const hasFooter = /<footer/i.test(html);
    const hasForm = /<form/i.test(html);
    if (hasAnnouncement) lines.push('HAS: announcement/marquee bar');
    if (hasHero) lines.push('HAS: hero section with H1');
    if (hasFeatures) lines.push('HAS: features section');
    if (hasForm) lines.push('HAS: form (newsletter/contact)');
    if (hasFooter) lines.push('HAS: footer (MUST be preserved in output)');

    return lines.join('\n');
}

/**
 * Extract just the visual design tokens from the style reference HTML:
 * colors, fonts, spacing patterns, border styles, shadow types, animation names.
 * Does NOT extract content — content always comes from originalHtml.
 */
function extractStyleTokens(styleHtml: string): string {
    const tokens: string[] = [];

    // Google Fonts
    const fontMatch = styleHtml.match(/fonts\.googleapis\.com\/css2\?([^"']+)/);
    if (fontMatch) tokens.push(`GOOGLE_FONTS: ${decodeURIComponent(fontMatch[1]).slice(0, 200)}`);

    // Tailwind config colors
    const colorBlock = styleHtml.match(/colors\s*:\s*\{([\s\S]{0,2000}?)\}/);
    if (colorBlock) tokens.push(`TAILWIND_COLORS: ${colorBlock[1].slice(0, 600)}`);

    // Font family
    const fontFamilyBlock = styleHtml.match(/fontFamily\s*:\s*\{([\s\S]{0,400}?)\}/);
    if (fontFamilyBlock) tokens.push(`FONT_FAMILIES: ${fontFamilyBlock[1].slice(0, 200)}`);

    // Shadow config
    const shadowBlock = styleHtml.match(/boxShadow\s*:\s*\{([\s\S]{0,400}?)\}/);
    if (shadowBlock) tokens.push(`SHADOWS: ${shadowBlock[1].slice(0, 200)}`);

    // Animation names
    const animNames = [...styleHtml.matchAll(/animate-([a-z-]+)/g)]
        .map(m => m[1])
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 15);
    if (animNames.length) tokens.push(`ANIMATIONS_USED: ${animNames.join(', ')}`);

    // Dominant Tailwind class patterns (non-content classes)
    const styleClasses = [...styleHtml.matchAll(/class="([^"]{0,300})"/g)]
        .flatMap(m => m[1].split(/\s+/))
        .filter(c => /^(bg-|text-|border-|shadow-|rounded-|font-|tracking-|leading-|uppercase|lowercase|italic|underline|decoration-)/.test(c))
        .reduce((acc: Record<string, number>, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});
    const topClasses = Object.entries(styleClasses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40)
        .map(([cls]) => cls);
    if (topClasses.length) tokens.push(`DOMINANT_STYLE_CLASSES: ${topClasses.join(' ')}`);

    // Background and text color patterns from inline styles
    const bgColors = [...styleHtml.matchAll(/background(?:-color)?\s*:\s*([^;'"]{3,30})/g)]
        .map(m => m[1].trim()).slice(0, 8);
    if (bgColors.length) tokens.push(`BG_COLORS: ${bgColors.join(', ')}`);

    // Border radius patterns
    const radiusClasses = topClasses.filter(c => c.startsWith('rounded-'));
    if (radiusClasses.length) tokens.push(`BORDER_RADIUS_STYLE: ${radiusClasses.join(' ')}`);

    return tokens.join('\n');
}

export const modifyHtml = async (
    originalHtml: string,
    styleHtml: string,
): Promise<{ html: string; css: string }> => {
    // ── Step 1: Pre-process both inputs before hitting the model ────────────
    // Extract structural map from original (content anchor)
    const structuralMap = extractStructuralMap(originalHtml);

    // Extract style tokens from reference (visual system only)
    const styleTokens = extractStyleTokens(styleHtml);

    // We send the full original HTML but cap it. Style reference is token-extracted,
    // so we don't waste the full context window on it.
    const truncatedOriginal = safeHtmlTruncate(originalHtml, 30000);

    const system = `You are an expert UI developer performing a STYLE TRANSPLANT — NOT a redesign.

YOUR TASK:
Take the ORIGINAL HTML and rewrite it with new styles from the STYLE REFERENCE.
Content, structure, sections, headings, links, nav items, and footer MUST be identical to the original.
Only CSS classes, colors, fonts, spacing, borders, shadows, and visual decoration change.

WHAT MUST NEVER CHANGE:
- Page title and meta tags
- Navigation links and their text
- All heading text (h1, h2, h3) — word for word
- All paragraph/body text content
- All section ORDER (announcement bar → header → hero → features → footer, etc.)
- Footer content (company name, links, copyright, social icons)
- Form fields and labels
- Product names, prices, descriptions

WHAT MUST CHANGE:
- All Tailwind CSS classes (replace with equivalent classes matching the style reference)
- Colors (replace all bg-, text-, border- classes with style reference equivalents)
- Typography (replace font families with those from style reference)
- Shadows, border-radius, spacing — adapt to match the reference's visual language
- Add any CSS animations/keyframes from the style reference
- Replace Google Fonts import with fonts from the style reference

CRITICAL OUTPUT RULES:
- Output a COMPLETE HTML document from <!DOCTYPE html> to </html>
- Include ALL sections from the original — announcement bar, nav, hero, ALL content sections, footer
- The footer must be fully populated — same links and copyright as original
- Never skip or abbreviate any section
- Return JSON: { "html": "...", "css": "..." }`;

    const userPrompt = `Perform a style transplant on the ORIGINAL HTML using the STYLE REFERENCE's visual language.

=== STRUCTURAL MAP OF ORIGINAL (every section MUST appear in output) ===
${structuralMap}

=== STYLE REFERENCE TOKENS (apply these visual patterns) ===
${styleTokens}

=== ORIGINAL HTML (content is locked — preserve word-for-word) ===
${truncatedOriginal}

INSTRUCTION:
1. Read the structural map above — these are ALL the sections you must output
2. Apply the style reference tokens (colors, fonts, shadows, radius) to each section
3. Keep every heading, paragraph, nav link, and footer link exactly as in original
4. Return a complete HTML document with the original's structure and the reference's style
5. Return JSON: { "html": "...", "css": "..." }`;

    // ── Step 2: Generate with lower thinking level (HIGH causes content drift) ──
    const response = await ai.models.generateContent({
        model: MAIN_MODEL,
        contents: { role: 'user', parts: [{ text: userPrompt }] },
        config: {
            systemInstruction: system,
            maxOutputTokens: MAX_TOKENS,
            temperature: 0.1,  // very low — this is a precision task not a creative one
            // No ThinkingLevel.HIGH — high thinking causes structural drift on remix tasks
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    html: { type: Type.STRING },
                    css:  { type: Type.STRING },
                },
                required: ['html', 'css'],
            },
        },
    });

    const rawText = response.text ?? '';
    let parsed = extractJson(rawText);

    if (!parsed) {
        throw new Error('Remix returned an unparseable response. Please try again.');
    }

    // ── Step 3: Verify structural completeness ─────────────────────────────────
    // Check that key headings from original still appear in output
    const originalHeadings = [...originalHtml.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, '').trim().slice(0, 40).toLowerCase())
        .filter(t => t.length > 5);

    const outputLower = parsed.html.toLowerCase();
    const missingHeadings = originalHeadings.filter(h => !outputLower.includes(h));

    if (missingHeadings.length > originalHeadings.length * 0.4) {
        // More than 40% of headings are missing — the model drifted to generation mode.
        // Run a correction pass.
        console.warn(`[modifyHtml] Content drift detected — ${missingHeadings.length}/${originalHeadings.length} headings missing. Running correction pass.`);

        const correctionPrompt = `The previous style transplant FAILED because it generated new content instead of preserving original content.

Missing headings that must appear verbatim:
${missingHeadings.map(h => `- "${h}"`).join('\n')}

ORIGINAL HTML (the content to preserve):
${safeHtmlTruncate(originalHtml, 20000)}

FAILED OUTPUT (the styles are good but content is wrong):
${safeHtmlTruncate(parsed.html, 10000)}

Fix the output by:
1. Keeping ALL styles/classes from the failed output
2. Replacing ALL content/text with the ORIGINAL HTML's content
3. Ensuring all original headings, nav links, footer links appear verbatim
4. Return JSON: { "html": "...", "css": "..." }`;

        try {
            const correctionResponse = await ai.models.generateContent({
                model: MAIN_MODEL,
                contents: { role: 'user', parts: [{ text: correctionPrompt }] },
                config: {
                    systemInstruction: system,
                    maxOutputTokens: MAX_TOKENS,
                    temperature: 0.05,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            html: { type: Type.STRING },
                            css:  { type: Type.STRING },
                        },
                        required: ['html', 'css'],
                    },
                },
            });
            const corrected = extractJson(correctionResponse.text ?? '');
            if (corrected && corrected.html.length > 500) {
                parsed = corrected;
            }
        } catch (corrErr) {
            console.error('[modifyHtml] Correction pass failed:', corrErr);
            // Fall through with original parsed result
        }
    }

    // ── Step 4: Truncation recovery ───────────────────────────────────────────
    if (!isHtmlComplete(parsed.html)) {
        console.warn('[modifyHtml] HTML truncated — running continuation pass...');
        try {
            const cont = await requestContinuation(parsed.html, 'HTML style transplant remix');
            if (cont.trim().length > 50) {
                parsed.html = stitchContinuation(parsed.html, cont);
            }
        } catch (err) {
            console.error('[modifyHtml] Continuation failed:', err);
        }
        if (!isHtmlComplete(parsed.html)) {
            parsed.html = forceCloseHtml(parsed.html);
        }
    }

    return {
        html: cleanHtml(parsed.html),
        css:  parsed.css || '',
    };
};

export const generateBlueprint = async (prompt: string): Promise<{ html: string; css: string }> => {
    const system = `You are an expert UX designer creating low-fidelity wireframes.
Use HTML and Tailwind CSS. Grayscale palette, simple boxes, placeholder text.
${FULL_PAGE_SYSTEM}`;

    const userPrompt = `Create a wireframe/blueprint for: ${prompt}

Requirements:
- Complete HTML document with all sections
- Include a footer wireframe
- Return JSON: { "html": "...", "css": "..." }`;

    return generateWithContinuation(userPrompt, system, `Blueprint: ${prompt.slice(0, 80)}`);
};

export const generateFromWireframe = async (
    base64Image: string,
): Promise<{ html: string; css: string }> => {
    const system = `You are an expert UI/UX designer transforming wireframes into high-fidelity UIs.
${FULL_PAGE_SYSTEM}

VISUAL REASONING:
1. Analyze structure, hierarchy, and navigation flow from the wireframe.
2. Replace placeholders with realistic content and images (picsum.photos).
3. Apply modern design principles. Do NOT output a gray box.
4. ALWAYS include a complete footer section.`;

    const mimeType = getMimeType(base64Image);
    const data = base64Image.split(',')[1] || base64Image;

    const parts: any[] = [
        {
            text: `Transform this wireframe into a high-fidelity, complete HTML page with Tailwind CSS.
Include nav, all content sections, AND a complete footer.
Return JSON: { "html": "...", "css": "..." }`,
        },
        { inlineData: { data, mimeType } },
    ];

    const response = await ai.models.generateContent({
        model: MAIN_MODEL,
        contents: { parts },
        config: {
            systemInstruction: system,
            maxOutputTokens: MAX_TOKENS,
            temperature: 0.2,
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    html: { type: Type.STRING },
                    css:  { type: Type.STRING },
                },
                required: ['html', 'css'],
            },
        },
    });

    const rawText = response.text ?? '';
    let parsed = extractJson(rawText);
    if (!parsed) throw new Error('Unparseable wireframe response. Please try again.');

    if (!isHtmlComplete(parsed.html)) {
        try {
            const cont = await requestContinuation(parsed.html, 'wireframe-to-UI');
            parsed.html = stitchContinuation(parsed.html, cont);
        } catch { /* ignore */ }
        if (!isHtmlComplete(parsed.html)) parsed.html = forceCloseHtml(parsed.html);
    }

    return { html: cleanHtml(parsed.html), css: parsed.css || '' };
};

export const generateDesignSystem = async (query: string): Promise<any> => {
    const response = await fetch('/api/design-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to generate design system: ${err}`);
    }
    return response.json();
};

export const analyzeHtml = async (html: string): Promise<AnalysisResult> => {
    const system = `You are a Senior Design Engineer. Analyze HTML and extract its Design DNA:
design tokens, structural architecture, semantic elements, and issues.`;

    const prompt = `Analyze this HTML and return a Design DNA JSON report.

HTML:
${safeHtmlTruncate(html, 15000)}

Return JSON following this schema:
{
  "designTokens": {
    "colors": ["#hex", ...],
    "fonts": ["Inter", ...],
    "spacing": "strict 4px rhythm",
    "radius": "xl (12px)"
  },
  "architecture": {
    "layout": "Bento Grid with sticky sidebar",
    "components": ["Card", "Badge", ...],
    "sections": ["Navigation", "Hero", "Features", "Footer"],
    "schema": ["<main>", "<article>", "role='navigation'"]
  },
  "visualSummary": "A clean modern dashboard...",
  "issues": {
    "runtime": ["Missing alt attributes on hero images"],
    "visual": ["Inconsistent padding on mobile"]
  }
}`;

    const response = await ai.models.generateContent({
        model: MAIN_MODEL,
        contents: prompt,
        config: {
            systemInstruction: system,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    designTokens: {
                        type: Type.OBJECT,
                        properties: {
                            colors:  { type: Type.ARRAY, items: { type: Type.STRING } },
                            fonts:   { type: Type.ARRAY, items: { type: Type.STRING } },
                            spacing: { type: Type.STRING },
                            radius:  { type: Type.STRING },
                        },
                        required: ['colors', 'fonts', 'spacing', 'radius'],
                    },
                    architecture: {
                        type: Type.OBJECT,
                        properties: {
                            layout:     { type: Type.STRING },
                            components: { type: Type.ARRAY, items: { type: Type.STRING } },
                            sections:   { type: Type.ARRAY, items: { type: Type.STRING } },
                            schema:     { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ['layout', 'components', 'sections', 'schema'],
                    },
                    visualSummary: { type: Type.STRING },
                    issues: {
                        type: Type.OBJECT,
                        properties: {
                            runtime: { type: Type.ARRAY, items: { type: Type.STRING } },
                            visual:  { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ['runtime', 'visual'],
                    },
                },
                required: ['designTokens', 'architecture', 'visualSummary'],
            },
        },
    });

    return JSON.parse(response.text || '{}') as AnalysisResult;
};

export const cloneWebsite = async (
    url: string,
    screenshots: string[] = [],
    pastedContent: string = '',
): Promise<{ html: string; css: string; sources: GroundingSource[] }> => {
    // ── 1. Scrape ─────────────────────────────────────────────────────────────
    let scrapedData: { html?: string; title?: string } = {};
    if (url) {
        try {
            const res = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
            if (res.ok) scrapedData = await res.json();
        } catch (err) {
            console.warn('[cloneWebsite] Scraper failed:', err);
        }
    }

    // ── 2. Build system + prompt ──────────────────────────────────────────────
    const system = `You are an expert Web Architect and Frontend Reconstructor.
Reproduce the website as a COMPLETE, self-contained HTML file using Tailwind CSS.

${FULL_PAGE_SYSTEM}

RECONSTRUCTION RULES:
1. Use the provided HTML to identify all sections — nav, hero, features, pricing, footer, etc.
2. Map the layout faithfully with Tailwind classes.
3. Preserve all text content exactly.
4. FOOTER IS MANDATORY: every clone MUST have a complete <footer> with links, copyright, socials.
5. Close ALL tags. Output must end with </footer></body></html>.`;

    let userPrompt = url
        ? `Clone the website at ${url}.`
        : `Reconstruct the UI from the provided materials.`;

    if (scrapedData.title) userPrompt += `\nPage title: "${scrapedData.title}"`;
    if (scrapedData.html) {
        userPrompt += `\n\nTarget HTML:\n${safeHtmlTruncate(scrapedData.html, HTML_CONTEXT_CHARS)}`;
    }
    if (pastedContent.trim()) {
        userPrompt += `\n\nUser-provided HTML:\n${pastedContent.trim()}`;
    }
    userPrompt += `

CRITICAL REQUIREMENTS:
- Complete HTML document from <!DOCTYPE html> to </html>
- Include ALL page sections visible in the source
- Populated footer with navigation links, copyright text, social icons
- No truncation — output the ENTIRE page
- Return JSON: { "html": "...", "css": "..." }`;

    // ── 3. Build multimodal parts ─────────────────────────────────────────────
    const parts: any[] = [{ text: userPrompt }];
    for (const shot of screenshots) {
        const raw = stripDataUriPrefix(shot);
        if (raw) parts.push({ inlineData: { data: raw, mimeType: 'image/png' } });
    }

    // ── 4. Generation + continuation ─────────────────────────────────────────
    const firstResponse = await ai.models.generateContent({
        model: MAIN_MODEL,
        contents: { role: 'user', parts },
        config: {
            systemInstruction: system,
            tools: [{ googleSearch: {} }],
            maxOutputTokens: MAX_TOKENS,
            temperature: 0.1,
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    html: { type: Type.STRING },
                    css:  { type: Type.STRING },
                },
                required: ['html', 'css'],
            },
        },
    });

    const rawText = firstResponse.text ?? '';
    let parsed = extractJson(rawText);

    if (!parsed) {
        throw new Error('Gemini returned an unparseable response. Please try again.');
    }

    // Continuation pass
    if (!isHtmlComplete(parsed.html)) {
        console.warn('[cloneWebsite] HTML truncated — running continuation pass...');
        try {
            const cont = await requestContinuation(
                parsed.html,
                url ? `Clone of ${url}` : 'Website clone',
            );
            if (cont.trim().length > 50) {
                parsed.html = stitchContinuation(parsed.html, cont);
            }
        } catch (err) {
            console.error('[cloneWebsite] Continuation failed:', err);
        }
        if (!isHtmlComplete(parsed.html)) {
            parsed.html = forceCloseHtml(parsed.html);
        }
    }

    const sources = firstResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { html: cleanHtml(parsed.html), css: parsed.css || '', sources };
};
