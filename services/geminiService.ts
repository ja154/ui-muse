import { GoogleGenAI, ThinkingLevel } from "@google/genai";
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
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { systemInstruction }
        });
        
        return response.text;
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

        for (const part of response.candidates[0].content.parts) {
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

export const generateHtmlFromPrompt = async (prompt: string): Promise<string> => {
    const systemInstruction = "You are an expert front-end developer. Convert UI prompts into single, clean, accessible, and responsive HTML components using Tailwind CSS.";
    const userPrompt = `Convert this UI prompt into a single, clean, accessible, and responsive HTML snippet using Tailwind CSS.
**PROMPT:** ${prompt}
Return ONLY the raw HTML code. Do not include <html>, <head>, or <body> tags unless specifically asked. No explanations.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: userPrompt,
            config: { systemInstruction }
        });
        return cleanHtmlResponse(response.text);
    } catch (error) {
        console.error("Error generating HTML:", error);
        throw error;
    }
};

export const modifyHtml = async (originalHtml: string, styleHtml: string): Promise<string> => {
    const systemInstruction = "You are an expert UI developer specializing in design system migration and restyling.";
    const userPrompt = `
Re-style the following "Original HTML" using the design language and Tailwind CSS classes from the "Style HTML".
Preserve original content and improve accessibility.
ORIGINAL: ${originalHtml}
STYLE: ${styleHtml}
Return ONLY the raw HTML snippet.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: userPrompt,
            config: { systemInstruction }
        });
        return cleanHtmlResponse(response.text);
    } catch (error) {
        console.error("Error modifying HTML:", error);
        throw error;
    }
};

export const cloneWebsite = async (url: string, screenshots: string[] = []): Promise<{ html: string; sources: GroundingSource[] }> => {
    const systemInstruction = `You are a Pixel-Perfect Web Reconstructor. Your mission is to recreate a website's UI with extreme fidelity using HTML and Tailwind CSS.

CRITICAL GUIDELINES:
1. SCREENSHOTS ARE THE SOURCE OF TRUTH: Analyze the attached images for exact layout, spacing (padding/margins), font weights, and color hex codes.
2. TAILWIND PRECISION: Use arbitrary values (e.g., bg-[#00F2EA], p-[23px]) to match the source exactly where standard Tailwind classes fall short.
3. COMPONENT STRUCTURE: Replicate the visual hierarchy (navigation, hero, features, footer) as seen in the images.
4. ASSET DISCOVERY: Use the provided URL and Google Search to find official logos, brand colors, and font names.
5. OUTPUT FORMAT: Return ONLY the raw HTML content (divs, sections, etc.). Do NOT include <html>, <head>, or <body> tags. Do NOT use markdown code fences.`;

    const userPrompt = `Reconstruct the website ${url ? `at ${url}` : 'from the provided screenshots'}. 
Ensure the reconstruction is pixel-perfect and responsive.`;

    const parts: any[] = [{ text: userPrompt }];
    
    // Add screenshots to the request
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
            model: 'gemini-3-pro-preview',
            contents: { parts },
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
            },
        });

        const html = cleanHtmlResponse(response.text);
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        return { html, sources };
    } catch (error) {
        console.error("Error cloning website:", error);
        throw error;
    }
};
