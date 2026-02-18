
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

export type InputMode = 'description' | 'modify' | 'clone';

export interface Template {
    id: string;
    name: string;
    prompt: string;
    style: VisualStyle;
}

export interface GroundingSource {
    web?: {
        uri: string;
        title: string;
    };
}

export interface HistoryItem {
    id: string;
    input: string; 
    inputMode: InputMode;

    // --- Description Mode Specific ---
    style?: VisualStyle; 
    output?: string; 
    previewImage?: string | null;
    
    // --- Modify Mode Specific ---
    htmlInput?: string; 
    cloneHtmlInput?: string; 
    
    // --- Clone Mode Specific ---
    urlInput?: string;
    groundingSources?: GroundingSource[];

    // Common output
    htmlOutput?: string; 
}
