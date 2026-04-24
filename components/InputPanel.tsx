import React, { useRef } from 'react';
import { VisualStyle, InputMode } from '../types.ts';
import { GenerateIcon, CodeBracketIcon, LoadingSpinner, GlobeAltIcon, PhotoIcon, XMarkIcon } from './icons.tsx';

interface InputPanelProps {
    inputMode: InputMode;
    setInputMode: (mode: InputMode) => void;
    userInput: string;
    setUserInput: (value: string) => void;
    urlInput: string;
    setUrlInput: (value: string) => void;
    screenshots: string[];
    setScreenshots: React.Dispatch<React.SetStateAction<string[]>>;
    pastedContent: string;
    setPastedContent: (value: string) => void;
    htmlInput: string;
    setHtmlInput: (value: string) => void;
    cloneHtmlInput: string;
    setCloneHtmlInput: (value: string) => void;
    selectedStyle: VisualStyle;
    setSelectedStyle: (style: VisualStyle) => void;
    visualStyles: VisualStyle[];
    onGenerate: () => void;
    isLoading: boolean;
}

const InputPanel: React.FC<InputPanelProps> = (props) => {
    const {
        inputMode, setInputMode, userInput, setUserInput, urlInput, setUrlInput,
        screenshots, setScreenshots, pastedContent, setPastedContent,
        htmlInput, setHtmlInput, cloneHtmlInput, setCloneHtmlInput, 
        selectedStyle, setSelectedStyle, visualStyles, onGenerate, isLoading
    } = props;

    const fileInputRef = useRef<HTMLInputElement>(null);

    const isGenerateDisabled = isLoading || (
        (inputMode === 'description' && !userInput.trim()) ||
        (inputMode === 'blueprint' && !userInput.trim()) ||
        (inputMode === 'design-system' && !userInput.trim()) ||
        (inputMode === 'modify' && (!htmlInput.trim() || !cloneHtmlInput.trim())) ||
        (inputMode === 'clone' && (!urlInput.trim() && screenshots.length === 0 && !pastedContent.trim()))
    );

    // Fix: Explicitly typing file as File and casting Array.from result to File[]
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (fileList) {
            const files = Array.from(fileList) as File[];
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setScreenshots(prev => [...prev, reader.result as string].slice(-4));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeScreenshot = (index: number) => {
        setScreenshots(prev => prev.filter((_, i) => i !== index));
    };

    const mainTabs = [
        { mode: 'description', label: 'Describe' },
        { mode: 'blueprint', label: 'Blueprint' },
        { mode: 'design-system', label: 'Design System' },
        { mode: 'design', label: 'Design' },
        { mode: 'modify', label: 'Remix' },
        { mode: 'clone', label: 'Clone Web' }
    ];
    
    const getButtonText = () => {
        if (isLoading) {
            if (inputMode === 'clone') return 'Analyzing & Cloning...';
            if (inputMode === 'modify') return 'Remixing...';
            if (inputMode === 'blueprint') return 'Drafting Blueprint...';
            if (inputMode === 'design-system') return 'Generating System...';
            return 'Generating UI...';
        }
        if (inputMode === 'modify') return 'Remix HTML';
        if (inputMode === 'clone') return 'Clone Website';
        if (inputMode === 'blueprint') return 'Generate Wireframe';
        if (inputMode === 'design-system') return 'Generate Design System';
        return 'Build UI';
    }
    
    const getButtonIcon = () => {
        if (isLoading) return <LoadingSpinner className="-ml-1 mr-3 h-5 w-5 text-black" />;
        if (inputMode === 'modify') return <CodeBracketIcon className="w-6 h-6" />;
        if (inputMode === 'clone') return <GlobeAltIcon className="w-6 h-6" />;
        if (inputMode === 'design-system') return <GenerateIcon className="w-6 h-6" />;
        return <GenerateIcon className="w-6 h-6" />;
    }

    return (
        <div className="bg-brand-surface/70 backdrop-blur-md border border-brand-border/50 rounded-xl shadow-2xl relative group overflow-hidden">
            <div className="absolute -inset-px bg-gradient-to-r from-brand-primary/30 to-brand-secondary/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
            
            <div className="relative">
                <div className="flex border-b border-brand-border/50">
                    {mainTabs.map(tab => (
                        <button
                            key={tab.mode}
                            onClick={() => setInputMode(tab.mode as InputMode)}
                            className={`flex-1 p-4 min-h-[44px] text-sm font-bold transition-colors duration-200 ${inputMode === tab.mode ? 'text-brand-primary bg-brand-primary/10 border-b-2 border-brand-primary' : 'text-brand-muted hover:bg-brand-primary/5 hover:text-brand-text'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6 space-y-6">
                    {(inputMode === 'description' || inputMode === 'blueprint' || inputMode === 'design-system') && (
                        <>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-brand-text">
                                    {inputMode === 'blueprint' ? '1. Describe the structure' : 
                                     inputMode === 'design-system' ? '1. Describe your brand or product' : 
                                     '1. Describe your UI idea'}
                                </label>
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder={inputMode === 'blueprint' ? "e.g., A multi-step checkout form with progress indicator" : 
                                                 inputMode === 'design-system' ? "e.g., A modern fintech app for Gen Z with a focus on trust and speed" :
                                                 "e.g., A sleek dark-mode fitness dashboard"}
                                    className="w-full h-32 p-4 bg-brand-bg/60 border border-brand-border/80 rounded-xl focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200 resize-none text-slate-200 outline-none placeholder:text-slate-500"
                                    disabled={isLoading}
                                />
                            </div>
                            {inputMode === 'description' && (
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-brand-text">2. Choose a visual style</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {visualStyles.map((style) => (
                                            <button
                                                key={style}
                                                onClick={() => setSelectedStyle(style)}
                                                disabled={isLoading}
                                                className={`px-4 py-3 min-h-[44px] text-sm font-medium rounded-xl transition-all duration-300 transform
                                                    ${selectedStyle === style 
                                                        ? 'bg-brand-primary text-slate-900 shadow-lg shadow-brand-primary/30 scale-[1.02]' 
                                                        : 'bg-brand-bg border border-brand-border text-brand-muted hover:border-brand-primary hover:text-brand-primary hover:scale-[1.05] hover:shadow-xl hover:shadow-brand-primary/10'}`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    
                    {inputMode === 'modify' && (
                        <>
                            <div>
                                 <label className="block text-sm font-bold mb-2 text-brand-text">1. Your Existing HTML</label>
                                 <textarea
                                    value={htmlInput}
                                    onChange={(e) => setHtmlInput(e.target.value)}
                                    placeholder="Paste HTML to modify..."
                                    className="w-full h-32 p-4 bg-brand-bg border border-brand-border rounded-xl font-mono text-xs text-brand-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200 outline-none placeholder:text-brand-muted/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-brand-text">2. Paste Style to Clone</label>
                                <textarea
                                    value={cloneHtmlInput}
                                    onChange={(e) => setCloneHtmlInput(e.target.value)}
                                    placeholder="Paste HTML with desired styling..."
                                    className="w-full h-32 p-4 bg-brand-bg border border-brand-border rounded-xl font-mono text-xs text-brand-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200 outline-none placeholder:text-brand-muted/50"
                                />
                            </div>
                        </>
                    )}

                    {inputMode === 'clone' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-brand-text">Enter Website URL</label>
                                <div className="relative">
                                    <GlobeAltIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                                    <input
                                        type="url"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="https://stripe.com"
                                        className="w-full p-4 pl-12 bg-brand-bg border border-brand-border rounded-xl focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200 text-brand-text outline-none placeholder:text-brand-muted/50"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-brand-text flex items-center gap-2">
                                    Visual Evidence & Analysis
                                    <span className="text-[10px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded uppercase">Enhanced</span>
                                </label>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    multiple 
                                    onChange={handleFileUpload}
                                />
                                
                                <div className="grid grid-cols-2 gap-3">
                                    {screenshots.map((src, i) => (
                                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-brand-border group/img">
                                            <img src={src} className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => removeScreenshot(i)}
                                                className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-red-500 transition-colors opacity-0 group-hover/img:opacity-100"
                                            >
                                                <XMarkIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {screenshots.length < 4 && (
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square border-2 border-dashed border-brand-border rounded-lg flex flex-col items-center justify-center gap-1 text-brand-muted hover:border-brand-primary hover:text-brand-primary transition-all bg-black/20"
                                        >
                                            <PhotoIcon className="w-6 h-6" />
                                            <span className="text-[10px] font-bold">ADD SCREENSHOT</span>
                                        </button>
                                    )}
                                </div>
                                <p className="text-[10px] text-brand-muted mt-3 italic">
                                    Gemini now performs deep visual reasoning on your screenshots to extract exact colors, typography, and layout patterns. 
                                    <span className="text-brand-primary font-bold"> Uploaded images are used as the primary source of truth.</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-brand-text">Paste Content</label>
                                <textarea
                                    value={pastedContent}
                                    onChange={(e) => setPastedContent(e.target.value)}
                                    placeholder="Paste HTML, CSS, or any text content to provide more context..."
                                    className="w-full h-32 p-4 bg-brand-bg border border-brand-border rounded-xl focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200 resize-none text-brand-text outline-none placeholder:text-brand-muted/50"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}
                    
                    {inputMode === 'design' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mb-4">
                                <GenerateIcon className="w-8 h-8 text-brand-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-brand-text mb-2">Interactive Wireframe Editor</h3>
                            <p className="text-brand-muted text-sm max-w-xs mx-auto mb-6">
                                Use the full-screen canvas on the right to design your wireframe visually, then generate UI from it.
                            </p>
                        </div>
                    )}
                    
                    {inputMode !== 'design' && (
                        <button
                            onClick={onGenerate}
                            disabled={isGenerateDisabled}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 min-h-[56px] text-lg font-bold text-slate-900 bg-brand-primary rounded-xl shadow-lg hover:bg-brand-secondary hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {getButtonIcon()}
                            {getButtonText()}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InputPanel;