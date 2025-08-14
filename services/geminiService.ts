
import { GoogleGenAI } from "@google/genai";
import { VisualStyle } from '../types.ts';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createMetaPrompt = (userInput: string, style: VisualStyle): string => {
    return `
As an expert UI/UX designer and prompt engineer, your task is to take a user's simple description of a user interface and a desired visual style, and expand it into a rich, detailed, and structured prompt. This new prompt should be suitable for a generative AI image model (like Midjourney or DALL-E) to create a high-fidelity UI mockup.

The user wants a UI for: "${userInput}"
The desired visual style is: "${style}"

Generate a prompt that includes detailed descriptions for the following sections. Use markdown headings for each section. Ensure the language is descriptive and evocative.

- **## Overall Vibe & Style:** Describe the main aesthetic (e.g., ${style}), the mood, and the overall feeling.
- **## Color Palette:** Suggest a specific, harmonious color palette with primary, secondary, accent, and neutral colors. You can suggest hex codes.
- **## Typography:** Recommend specific font families (one for headings, one for body text) that fit the style, and describe their weight and scale.
- **## Layout & Composition:** Detail the layout structure (e.g., centered, grid-based, asymmetrical), spacing, and arrangement of elements.
- **## Key UI Components:** Describe the specific appearance of key components mentioned or implied in the user's prompt (e.g., buttons, input fields, cards, navigation). Include details on their shape, shadows, borders, and textures.
- **## Iconography:** Specify the style of icons to be used (e.g., line icons, filled icons, realistic).
- **## Micro-interactions & Animations (Subtle):** Briefly mention subtle effects that would enhance the UI, like button hover states, smooth transitions, or loading indicators.

Your response should ONLY be the generated prompt text, starting with the "## Overall Vibe & Style:" section. Do not include any other conversational text, preamble, or apologies.
    `;
};


export const enhancePrompt = async (userInput: string, style: VisualStyle): Promise<string> => {
    try {
        const metaPrompt = createMetaPrompt(userInput, style);
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: metaPrompt
        });
        
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for prompt enhancement:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while enhancing the prompt.");
    }
};

export const generateImagePreview = async (prompt: string): Promise<string> => {
    try {
        const imagePrompt = `A high-fidelity UI mockup for a web/mobile application, embodying the following detailed description. Focus on creating a visually appealing and realistic interface. UI design, UX, user interface. \n\n${prompt}`;
        
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: imagePrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } else {
            throw new Error("No image was generated.");
        }
    } catch (error) {
        console.error("Error calling Imagen API:", error);
        if (error instanceof Error) {
            throw new Error(`Imagen API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating the image preview.");
    }
};

export const generateHtmlFromPrompt = async (prompt: string): Promise<string> => {
    const metaPrompt = `
You are an expert front-end developer specializing in Tailwind CSS and web accessibility.
Your task is to convert a detailed UI/UX prompt into a single, clean, accessible, and responsive HTML file using Tailwind CSS.

**PROMPT:**
---
${prompt}
---

**INSTRUCTIONS:**
1.  **Analyze the Prompt:** Read the provided UI prompt carefully to understand the required components, layout, color scheme, typography, and overall aesthetic.
2.  **Accessibility First (CRITICAL):**
    *   **Semantic HTML:** Use correct semantic HTML5 elements (\`<nav>\`, \`<main>\`, \`<button>\`, \`<article>\`, etc.) instead of generic \`<div>\`s where appropriate.
    *   **ARIA Roles & Attributes:** Include ARIA attributes (\`role\`, \`aria-label\`, \`aria-labelledby\`, etc.) where necessary to support screen readers, especially for complex or custom components.
    *   **Keyboard Navigation:** Ensure all interactive elements (buttons, links, inputs) are naturally focusable and usable with a keyboard.
    *   **Image Alt Text:** All \`<img>\` tags must have a descriptive \`alt\` attribute. For decorative images, use \`alt=""\`.
3.  **Generate HTML with Tailwind CSS:** Create a complete HTML structure for the component or page described.
4.  **Use Tailwind CSS ONLY:** Apply all styling exclusively through Tailwind CSS classes. Do not use any inline \`style\` attributes or \`<style>\` blocks.
5.  **Component-Based:** The output should be a self-contained block of HTML that represents the UI. It should not include \`<html>\` or \`<body>\` tags unless it's a full page layout.
6.  **Placeholders:** Use appropriate placeholders for text and images. For images, use services like placeholder.com (e.g., \`https://via.placeholder.com/150\`) and ensure they have alt text.
7.  **Return Only Code:** Your entire response must be ONLY the raw HTML code block. Do not include any explanations, comments, markdown formatting (like \`\`\`html\`), or conversational text.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: metaPrompt,
        });

        let refinedCode = response.text.trim();
        const codeFenceRegex = /^```html\s*\n?(.*?)\n?\s*```$/s;
        const match = refinedCode.match(codeFenceRegex);
        if (match && match[1]) {
            refinedCode = match[1].trim();
        }
        
        return refinedCode;

    } catch (error) {
        console.error("Error calling Gemini API for HTML generation from prompt:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating HTML from prompt.");
    }
};

export const modifyHtml = async (
    originalHtml: string,
    styleHtml: string
): Promise<string> => {
    const metaPrompt = `
You are an expert front-end developer specializing in Tailwind CSS and web accessibility (WCAG).
Your task is to take a user's "original" HTML structure and apply the visual styling from a "style" HTML snippet, while also improving its accessibility.

**GOAL:**
Remix the original HTML to look and feel like the style HTML. Preserve the semantic structure and content of the original HTML, but completely overhaul its appearance using Tailwind CSS classes inspired by the style HTML, and fixing any accessibility issues.

**RULES:**
1.  **Analyze Both Inputs:** Carefully analyze the "original" HTML's structure. Separately, analyze the "style" HTML to understand its design language (colors, spacing, typography, borders, shadows, etc.).
2.  **Improve Accessibility (CRITICAL):**
    *   Analyze the "original" HTML for accessibility violations (e.g., \`<div>\`s used as buttons, missing labels, non-semantic tags, missing alt text).
    *   In the final output, correct these issues by using proper semantic elements (\`<button>\`, \`<nav>\`, etc.) and adding necessary ARIA attributes.
    *   The goal is a remixed component that is **more accessible** than the original.
3.  **Preserve Original Content:** The final output must contain the text, images (if any, using their original src), and core meaning of the "original" HTML. Do not use content from the "style" HTML.
4.  **Clone the Style:** Apply new Tailwind CSS classes to the (now accessible) HTML elements to match the aesthetic of the "style" HTML. This includes:
    -   Color Palette: background colors, text colors, border colors.
    -   Typography: font sizes, weights, and styles.
    -   Sizing & Spacing: padding, margins, widths, heights.
    -   Layout: Flexbox, Grid, and positioning classes.
    -   Borders & Effects: border radius, shadows, etc.
5.  **Use Tailwind CSS ONLY:** Apply all styling exclusively by adding, removing,or modifying Tailwind CSS classes in the 'class' attribute. Do not write any '<style>' blocks or inline 'style' attributes.
6.  **Return Only Code:** Your entire response must be the complete, modified HTML code block. Do not include any explanations, comments, or conversational text. Start with the first line of HTML and end with the final closing tag.

---
**ORIGINAL HTML (Preserve this content and structure, but fix accessibility):**
---
\`\`\`html
${originalHtml}
\`\`\`
---
**STYLE HTML (Clone this look and feel):**
---
\`\`\`html
${styleHtml}
\`\`\`
---

Now, transform the "ORIGINAL HTML" to be accessible and match the "STYLE HTML" using only Tailwind CSS. Return the complete, modified HTML.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: metaPrompt,
        });

        let refinedCode = response.text.trim();
        const codeFenceRegex = /^```html\s*\n?(.*?)\n?\s*```$/s;
        const match = refinedCode.match(codeFenceRegex);
        if (match && match[1]) {
            refinedCode = match[1].trim();
        }
        
        return refinedCode;

    } catch (error) {
        console.error("Error calling Gemini API for HTML modification:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while modifying the HTML.");
    }
};
