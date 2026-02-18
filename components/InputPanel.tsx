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
        screenshots, setScreenshots,
        htmlInput, setHtmlInput, cloneHtmlInput, setCloneHtmlInput, 
        selectedStyle, setSelectedStyle, visualStyles, onGenerate, isLoading
    } = props;

    const fileInputRef = useRef<HTMLInputElement>(null);

    const isGenerateDisabled = isLoading || (
        (inputMode === 'description' && !userInput.trim()) ||
        (inputMode === 'modify' && (!htmlInput.trim() || !cloneHtmlInput.trim())) ||
        (inputMode === 'clone' && (!urlInput.trim() && screenshots.length === 0))
    );

    // Fix: Explicitly typing file as File and casting Array.from result to File[]
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (fileList) {
            const files = Array.from(fileList) as File[];
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setScreenshots(prev => [...prev, reader.result as string].slice(-3));
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
        { mode: 'modify', label: 'Remix' },
        { mode: 'clone', label: 'Clone Web' }
    ];
    
    const getButtonText = () => {
        if (isLoading) return 'Processing...';
        if (inputMode === 'modify') return 'Remix HTML';
        if (inputMode === 'clone') return 'Clone Website';
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
                            className={`flex-1 p-3 text-sm font-bold transition-all duration-300 ${inputMode === tab.mode ? 'text-brand-primary bg-brand-primary/10 border-b-2 border-brand-primary' : 'text-brand-muted hover:bg-white/5'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6 space-y-6">
                    {inputMode === 'description' && (
                        <>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-200">1. Describe your UI idea</label>
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder="e.g., A sleek dark-mode fitness dashboard"
                                    className="w-full h-32 p-4 bg-black/20 border border-brand-border/80 rounded-lg focus:ring-2 focus:ring-brand-primary transition duration-200 resize-none text-gray-200"
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-200">2. Choose a visual style</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {visualStyles.map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => setSelectedStyle(style)}
                                            disabled={isLoading}
                                            className={`px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 transform hover:scale-[1.02]
                                                ${selectedStyle === style ? 'bg-brand-primary text-black' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    
                    {inputMode === 'modify' && (
                        <>
                            <div>
                                 <label className="block text-sm font-bold mb-2 text-gray-200">1. Your Existing HTML</label>
                                 <textarea
                                    value={htmlInput}
                                    onChange={(e) => setHtmlInput(e.target.value)}
                                    placeholder="Paste HTML to modify..."
                                    className="w-full h-32 p-4 bg-black/20 border border-brand-border/80 rounded-lg font-mono text-xs text-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-200">2. Paste Style to Clone</label>
                                <textarea
                                    value={cloneHtmlInput}
                                    onChange={(e) => setCloneHtmlInput(e.target.value)}
                                    placeholder="Paste HTML with desired styling..."
                                    className="w-full h-32 p-4 bg-black/20 border border-brand-border/80 rounded-lg font-mono text-xs text-gray-200"
                                />
                            </div>
                        </>
                    )}

                    {inputMode === 'clone' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-200">Enter Website URL</label>
                                <div className="relative">
                                    <GlobeAltIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                                    <input
                                        type="url"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="https://stripe.com"
                                        className="w-full p-4 pl-12 bg-black/20 border border-brand-border/80 rounded-lg focus:ring-2 focus:ring-brand-primary transition duration-200 text-gray-200"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-200 flex items-center gap-2">
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
                                
                                <div className="grid grid-cols-3 gap-3">
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
                                    {screenshots.length < 3 && (
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
                        </div>
                    )}
                    
                    <button
                        onClick={onGenerate}
                        disabled={isGenerateDisabled}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 text-lg font-bold text-black bg-brand-primary rounded-lg shadow-lg hover:shadow-brand-primary/40 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {getButtonIcon()}
                        {getButtonText()}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InputPanel;