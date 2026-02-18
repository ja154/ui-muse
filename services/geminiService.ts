
import { GoogleGenAI } from "@google/genai";
import { VisualStyle, GroundingSource } from '../types.ts';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        const metaPrompt = `
As an expert UI/UX designer and prompt engineer, your task is to take a user's simple description of a user interface and a desired visual style, and expand it into a rich, detailed, and structured prompt. 

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
            contents: metaPrompt
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
    const metaPrompt = `
You are an expert front-end developer. Convert this UI prompt into a single, clean, accessible, and responsive HTML file using Tailwind CSS.
**PROMPT:** ${prompt}
Return ONLY the raw HTML code block. No explanations.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: metaPrompt,
        });
        return cleanHtmlResponse(response.text);
    } catch (error) {
        console.error("Error generating HTML:", error);
        throw error;
    }
};

export const modifyHtml = async (originalHtml: string, styleHtml: string): Promise<string> => {
    const metaPrompt = `
Re-style the following "Original HTML" using the design language and Tailwind CSS classes from the "Style HTML".
Preserve original content and improve accessibility.
ORIGINAL: ${originalHtml}
STYLE: ${styleHtml}
Return ONLY the raw HTML.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: metaPrompt,
        });
        return cleanHtmlResponse(response.text);
    } catch (error) {
        console.error("Error modifying HTML:", error);
        throw error;
    }
};

export const cloneWebsite = async (url: string): Promise<{ html: string; sources: GroundingSource[] }> => {
    const metaPrompt = `
You are a world-class front-end engineer.
Your task is to analyze the website at the provided URL and recreate its visual design and layout exactly using ONLY HTML and Tailwind CSS.

URL to clone: ${url}

INSTRUCTIONS:
1. Use Google Search to find visual information, layout structures, and brand guidelines for this website.
2. Recreate the main landing page experience (hero section, navigation, feature blocks).
3. Use high-fidelity Tailwind CSS classes for colors, shadows, and spacing.
4. Ensure it looks as close to the original as possible.
5. Use placeholder images and content that represent the original.

Return ONLY the raw HTML code. Do not include markdown code fences or any conversational text.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: metaPrompt,
            config: {
                tools: [{ googleSearch: {} }]
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
