
export enum VisualStyle {
    Minimalist = 'Minimalist',
    Neumorphic = 'Neumorphic',
    Cyberpunk = 'Cyberpunk',
    Glassmorphism = 'Glassmorphism',
    Brutalist = 'Brutalist',
    Corporate = 'Clean & Corporate',
    Playful = 'Playful & Illustrated',
    Vintage = 'Vintage & Retro'
}

export type InputMode = 'description' | 'modify';

export interface Template {
    id: string;
    name: string;
    prompt: string;
    style: VisualStyle;
}

export interface HistoryItem {
    id: string;
    input: string; // User's text description/goal
    inputMode: InputMode;

    // --- Description Mode Specific ---
    style?: VisualStyle; 
    output?: string; // The enhanced/generated text prompt
    previewImage?: string | null;
    
    // --- Modify Mode Specific ---
    htmlInput?: string; // Original HTML for 'modify' mode
    cloneHtmlInput?: string; // HTML to clone style from
    htmlOutput?: string; // The refined/generated HTML
}
