
export enum VisualStyle {
    Minimalist = 'Minimalist / Swiss',
    Corporate = 'Clean & Corporate',
    Bento = 'Bento Grid',
    Editorial = 'Editorial / Magazine',
    Glassmorphism = 'Glassmorphism',
    Brutalist = 'Neo-Brutalist',
    Luxury = 'Luxury / Prestige',
    Technical = 'Technical Dashboard',
    Atmospheric = 'Atmospheric / Immersive',
    Cyberpunk = 'Cyberpunk / High-Tech',
    Playful = 'Playful & Vibrant',
    Vintage = 'Vintage & Retro'
}

export type InputMode = 'description' | 'modify' | 'clone' | 'blueprint' | 'design' | 'design-system' | 'inspect';

export interface AnalysisResult {
    designTokens: {
        colors: string[];
        fonts: string[];
        spacing: string;
        radius: string;
    };
    architecture: {
        layout: string;
        components: string[];
        sections: string[];
    };
    visualSummary: string;
}

export interface Template {
    id: string;
    name: string;
    prompt: string;
    style: VisualStyle;
}

export interface GroundingSource {
    web?: {
        uri?: string;
        title?: string;
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
    screenshots?: string[];
    pastedContent?: string;
    groundingSources?: GroundingSource[];

    // Common output
    htmlOutput?: string; 
    cssOutput?: string;
    analysisResult?: AnalysisResult | null;
}
