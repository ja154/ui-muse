
import React from 'react';
import { VisualStyle, InputMode } from '../types.ts';
import { GenerateIcon, CodeBracketIcon, LoadingSpinner } from './icons.tsx';

interface InputPanelProps {
    inputMode: InputMode;
    setInputMode: (mode: InputMode) => void;
    userInput: string;
    setUserInput: (value: string) => void;
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
        inputMode, setInputMode, userInput, setUserInput, htmlInput, setHtmlInput,
        cloneHtmlInput, setCloneHtmlInput, selectedStyle, setSelectedStyle, 
        visualStyles, onGenerate, isLoading
    } = props;

    const isGenerateDisabled = isLoading || (
        (inputMode === 'description' && !userInput.trim()) ||
        (inputMode === 'modify' && (!htmlInput.trim() || !cloneHtmlInput.trim()))
    );

    const mainTabs = [
        { mode: 'description', label: 'Describe UI' },
        { mode: 'modify', label: 'Remix HTML' }
    ];
    
    const getButtonText = () => {
        if (isLoading) return 'Generating...';
        if (inputMode === 'modify') return 'Remix HTML';
        return 'Build UI';
    }
    
    const getButtonIcon = () => {
        if (isLoading) return <LoadingSpinner className="-ml-1 mr-3 h-5 w-5 text-black" />;
        if (inputMode === 'modify') return <CodeBracketIcon className="w-6 h-6" />;
        return <GenerateIcon className="w-6 h-6" />;
    }

    return (
        <div className="bg-brand-surface/70 backdrop-blur-md border border-brand-border/50 rounded-xl shadow-2xl shadow-black/20 relative group">
            <div className="absolute -inset-px bg-gradient-to-r from-brand-primary/50 to-brand-secondary/50 rounded-xl blur-lg opacity-0 group-hover:opacity-70 transition-opacity duration-500 -z-10"></div>
            
            <div className="relative">
                <div className="flex border-b border-brand-border/50">
                    {mainTabs.map(tab => (
                        <button
                            key={tab.mode}
                            onClick={() => setInputMode(tab.mode as InputMode)}
                            className={`flex-1 p-4 text-lg font-semibold transition-all duration-300 ${inputMode === tab.mode ? 'text-brand-primary bg-brand-primary/10' : 'text-brand-muted hover:bg-white/5'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6 space-y-6">
                    {inputMode === 'description' && (
                        <>
                            <div>
                                <label className="block text-lg font-semibold mb-2 text-gray-200">1. Describe your UI idea</label>
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder="e.g., A futuristic dashboard for a music app"
                                    className="w-full h-36 p-4 bg-black/20 border border-brand-border/80 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200 resize-none placeholder-gray-500 text-gray-200 focus:shadow-[0_0_20px_rgba(0,242,234,0.3)]"
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label className="block text-lg font-semibold mb-2 text-gray-200">2. Choose a visual style</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {visualStyles.map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => setSelectedStyle(style)}
                                            disabled={isLoading}
                                            className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-primary disabled:opacity-50 transform hover:scale-105
                                                ${selectedStyle === style ? 'bg-brand-primary text-black shadow-[0_0_15px_rgba(0,242,234,0.5)]' : 'bg-gray-700/50 hover:bg-gray-700'}`}
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
                                 <label className="block text-lg font-semibold mb-2 text-gray-200">1. Your Existing HTML</label>
                                 <textarea
                                    value={htmlInput}
                                    onChange={(e) => setHtmlInput(e.target.value)}
                                    placeholder="<div class='container'>...</div>"
                                    className="w-full h-40 p-4 bg-black/20 border border-brand-border/80 rounded-lg font-mono text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200 resize-y placeholder-gray-500 text-gray-200 focus:shadow-[0_0_20px_rgba(0,242,234,0.3)]"
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label className="block text-lg font-semibold mb-2 text-gray-200">2. Paste HTML to Clone Style From</label>
                                <textarea
                                    value={cloneHtmlInput}
                                    onChange={(e) => setCloneHtmlInput(e.target.value)}
                                    placeholder="<div class='bg-blue-500 text-white rounded'>...</div>"
                                    className="w-full h-40 p-4 bg-black/20 border border-brand-border/80 rounded-lg font-mono text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200 resize-y placeholder-gray-500 text-gray-200 focus:shadow-[0_0_20px_rgba(0,242,234,0.3)]"
                                    disabled={isLoading}
                                />
                            </div>
                        </>
                    )}
                    
                    <button
                        onClick={onGenerate}
                        disabled={isGenerateDisabled}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 text-lg font-bold text-black bg-brand-primary rounded-lg shadow-lg shadow-brand-primary/30 hover:shadow-brand-primary/60 hover:scale-[1.02] transition-all duration-300 ease-in-out disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-bg focus:ring-brand-primary"
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
