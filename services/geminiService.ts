import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { VisualStyle, GroundingSource } from '../types.ts';

// Initializing the GoogleGenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const generateHtmlFromPrompt = async (prompt: string): Promise<{ html: string; css: string }> => {
    const systemInstruction = "You are an expert front-end developer. Convert UI prompts into single, clean, accessible, and responsive HTML components using Tailwind CSS. Also provide any necessary custom CSS for animations, keyframes, or specific styles not covered by Tailwind.";
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
            html: jsonResponse.html || '',
            css: jsonResponse.css || ''
        };
    } catch (error) {
        console.error("Error generating HTML:", error);
        throw error;
    }
};

export const modifyHtml = async (originalHtml: string, styleHtml: string): Promise<{ html: string; css: string }> => {
    const systemInstruction = "You are an expert UI developer specializing in design system migration and restyling.";
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
            html: jsonResponse.html || '',
            css: jsonResponse.css || ''
        };
    } catch (error) {
        console.error("Error modifying HTML:", error);
        throw error;
    }
};

export const generateBlueprint = async (prompt: string): Promise<{ html: string; css: string }> => {
    const systemInstruction = "You are an expert UX designer. Convert UI prompts into low-fidelity, structural wireframes/blueprints using HTML and Tailwind CSS. Focus on layout, hierarchy, and content placement. Use a grayscale palette, simple boxes, and placeholder text (Lorem Ipsum). Avoid high-fidelity styles, images, or complex colors.";
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
            html: jsonResponse.html || '',
            css: jsonResponse.css || ''
        };
    } catch (error) {
        console.error("Error generating blueprint:", error);
        throw error;
    }
};

export const cloneWebsite = async (url: string, screenshots: string[] = [], pastedContent: string = ''): Promise<{ html: string; css: string; sources: GroundingSource[] }> => {
    let scrapedData: { html?: string; screenshot?: string; styles?: any } = {};

    if (url) {
        try {
            console.log(`Scraping URL: ${url}`);
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            
            if (response.ok) {
                scrapedData = await response.json();
                console.log('Scraping successful');
            } else {
                console.warn('Scraping failed:', await response.text());
            }
        } catch (error) {
            console.error('Error calling scrape API:', error);
        }
    }

    const systemInstruction = `You are a Pixel-Perfect Web Reconstructor. Your mission is to recreate a website's UI with extreme visual fidelity using HTML and Tailwind CSS.

CRITICAL GUIDELINES:
1. VISUAL ACCURACY IS PARAMOUNT: The provided screenshots are your absolute source of truth. If the scraped HTML structure conflicts with the visual appearance in the screenshot, ALWAYS prioritize the visual appearance. Do not invent elements not present in the screenshots.
2. TAILWIND PRECISION: Use arbitrary values (e.g., bg-[#00F2EA], p-[23px], text-[15px], leading-[1.2]) to match the source exactly where standard Tailwind classes fall short. Do not approximate colors, font sizes, or spacing.
3. COMPONENT STRUCTURE: Replicate the visual hierarchy (navigation, hero, features, footer) as seen in the images.
4. ASSET DISCOVERY: Use the provided URL and Google Search to find official logos, brand colors, and font names.
5. PASTED CONTENT: Use any provided pasted content (HTML, CSS, text) as additional context or evidence for the reconstruction.
6. COMPUTED STYLES: Use the provided computed styles (if any) as a baseline for fonts and colors.
7. ASSETS: Ensure all image src attributes use absolute URLs from the original site or high-quality placeholders (e.g., picsum.photos). Do not use relative paths.
8. OUTPUT FORMAT: Return a JSON object with 'html' and 'css' fields. The 'html' field should contain the raw HTML content (divs, sections, etc.). The 'css' field should contain any custom CSS needed.`;

    let userPrompt = `Reconstruct the website ${url ? `at ${url}` : 'from the provided screenshots'}. 
Ensure the reconstruction is pixel-perfect and responsive.`;

    if (scrapedData.html) {
        userPrompt += `\n\nScraped HTML Structure (Reference):\n${scrapedData.html.substring(0, 15000)}... (truncated)`;
    }

    if (scrapedData.styles) {
        userPrompt += `\n\nComputed Styles (Reference):\n${JSON.stringify(scrapedData.styles, null, 2)}`;
    }

    if (pastedContent.trim()) {
        userPrompt += `\n\nAdditional Context/Evidence provided by user:\n${pastedContent}`;
    }

    const parts: any[] = [{ text: userPrompt }];
    
    // Add scraped screenshot first (high priority)
    if (scrapedData.screenshot) {
        const mimeType = getMimeType(scrapedData.screenshot);
        const data = scrapedData.screenshot.split(',')[1] || scrapedData.screenshot;
        parts.push({
            inlineData: {
                data: data,
                mimeType: mimeType
            }
        });
    }

    // Add user screenshots
    for (const base64 of screenshots) {
        const mimeType = getMimeType(base64);
        const data = base64.split(',')[1] || base64;
        parts.push({
            inlineData: {
                data: data,
                mimeType: mimeType
            }
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts },
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }],
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
        const html = jsonResponse.html || '';
        const css = jsonResponse.css || '';
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        return { html, css, sources };
    } catch (error) {
        console.error("Error cloning website:", error);
        throw error;
    }
};
