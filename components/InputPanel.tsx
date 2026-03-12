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
        { mode: 'design', label: 'Design' },
        { mode: 'modify', label: 'Remix' },
        { mode: 'clone', label: 'Clone Web' }
    ];
    
    const getButtonText = () => {
        if (isLoading) {
            if (inputMode === 'clone') return 'Analyzing & Cloning...';
            if (inputMode === 'modify') return 'Remixing...';
            if (inputMode === 'blueprint') return 'Drafting Blueprint...';
            return 'Generating UI...';
        }
        if (inputMode === 'modify') return 'Remix HTML';
        if (inputMode === 'clone') return 'Clone Website';
        if (inputMode === 'blueprint') return 'Generate Wireframe';
        return 'Build UI';
    }
    
    const getButtonIcon = () => {
        if (isLoading) return <LoadingSpinner className="-ml-1 mr-3 h-5 w-5 text-black" />;
        if (inputMode === 'modify') return <CodeBracketIcon className="w-6 h-6" />;
        if (inputMode === 'clone') return <GlobeAltIcon className="w-6 h-6" />;
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
                            className={`flex-1 p-4 min-h-[44px] text-sm font-bold transition-colors duration-200 ${inputMode === tab.mode ? 'text-brand-primary bg-brand-primary/10 border-b-2 border-brand-primary' : 'text-brand-muted hover:bg-white/5 hover:text-slate-200'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6 space-y-6">
                    {(inputMode === 'description' || inputMode === 'blueprint') && (
                        <>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-200">
                                    {inputMode === 'blueprint' ? '1. Describe the structure' : '1. Describe your UI idea'}
                                </label>
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder={inputMode === 'blueprint' ? "e.g., A multi-step checkout form with progress indicator" : "e.g., A sleek dark-mode fitness dashboard"}
                                    className="w-full h-32 p-4 bg-brand-bg/60 border border-brand-border/80 rounded-xl focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200 resize-none text-slate-200 outline-none placeholder:text-slate-500"
                                    disabled={isLoading}
                                />
                            </div>
                            {inputMode === 'description' && (
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-slate-200">2. Choose a visual style</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {visualStyles.map((style) => (
                                            <button
                                                key={style}
                                                onClick={() => setSelectedStyle(style)}
                                                disabled={isLoading}
                                                className={`px-4 py-3 min-h-[44px] text-sm font-medium rounded-xl transition-colors duration-200
                                                    ${selectedStyle === style ? 'bg-brand-primary text-slate-900 shadow-md shadow-brand-primary/20' : 'bg-brand-bg/60 text-slate-300 hover:bg-brand-border hover:text-white'}`}
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
                                 <label className="block text-sm font-bold mb-2 text-slate-200">1. Your Existing HTML</label>
                                 <textarea
                                    value={htmlInput}
                                    onChange={(e) => setHtmlInput(e.target.value)}
                                    placeholder="Paste HTML to modify..."
                                    className="w-full h-32 p-4 bg-brand-bg/60 border border-brand-border/80 rounded-xl font-mono text-xs text-slate-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200 outline-none placeholder:text-slate-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-200">2. Paste Style to Clone</label>
                                <textarea
                                    value={cloneHtmlInput}
                                    onChange={(e) => setCloneHtmlInput(e.target.value)}
                                    placeholder="Paste HTML with desired styling..."
                                    className="w-full h-32 p-4 bg-brand-bg/60 border border-brand-border/80 rounded-xl font-mono text-xs text-slate-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200 outline-none placeholder:text-slate-500"
                                />
                            </div>
                        </>
                    )}

                    {inputMode === 'clone' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-200">Enter Website URL</label>
                                <div className="relative">
                                    <GlobeAltIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                                    <input
                                        type="url"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="https://stripe.com"
                                        className="w-full p-4 pl-12 bg-brand-bg/60 border border-brand-border/80 rounded-xl focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200 text-slate-200 outline-none placeholder:text-slate-500"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-200 flex items-center gap-2">
                                    Add Visual Evidence
                                    <span className="text-[10px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded uppercase">Experimental</span>
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
                                    Gemini analyzes screenshots for spacing, colors, and specific UI elements to ensure a faithful reconstruction.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-200">Paste Content</label>
                                <textarea
                                    value={pastedContent}
                                    onChange={(e) => setPastedContent(e.target.value)}
                                    placeholder="Paste HTML, CSS, or any text content to provide more context..."
                                    className="w-full h-32 p-4 bg-brand-bg/60 border border-brand-border/80 rounded-xl focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200 resize-none text-slate-200 outline-none placeholder:text-slate-500"
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
                            <h3 className="text-xl font-bold text-slate-200 mb-2">Interactive Wireframe Editor</h3>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">
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