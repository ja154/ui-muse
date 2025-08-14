
import React from 'react';
import { VisualStyle, InputMode } from '../types.ts';
import { GenerateIcon, CodeBracketIcon } from './icons.tsx';

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
        return 'Enhance Prompt';
    }
    
    const getButtonIcon = () => {
        if (isLoading) return <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
        if (inputMode === 'modify') return <CodeBracketIcon className="w-6 h-6" />;
        return <GenerateIcon className="w-6 h-6" />;
    }

    return (
        <div className="bg-brand-surface rounded-xl border border-brand-border shadow-lg">
            <div className="flex border-b border-brand-border">
                {mainTabs.map(tab => (
                    <button
                        key={tab.mode}
                        onClick={() => setInputMode(tab.mode as InputMode)}
                        className={`flex-1 p-4 text-lg font-semibold transition-colors ${inputMode === tab.mode ? 'text-brand-primary bg-gray-800/50' : 'text-brand-muted hover:bg-gray-800/20'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-6 space-y-6">
                {inputMode === 'description' && (
                    <>
                        <div>
                            <label className="block text-lg font-semibold mb-2 text-gray-300">1. Describe your UI idea</label>
                            <textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="e.g., A futuristic dashboard for a music app"
                                className="w-full h-36 p-4 bg-[#111] border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200 resize-none placeholder-gray-500"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-lg font-semibold mb-2 text-gray-300">2. Choose a visual style</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {visualStyles.map((style) => (
                                    <button
                                        key={style}
                                        onClick={() => setSelectedStyle(style)}
                                        disabled={isLoading}
                                        className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-primary disabled:opacity-50
                                            ${selectedStyle === style ? 'bg-brand-primary text-black' : 'bg-gray-700 hover:bg-gray-600'}`}
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
                             <label className="block text-lg font-semibold mb-2 text-gray-300">1. Your Existing HTML</label>
                             <textarea
                                value={htmlInput}
                                onChange={(e) => setHtmlInput(e.target.value)}
                                placeholder="<div class='container'>...</div>"
                                className="w-full h-40 p-4 bg-[#111] border border-brand-border rounded-lg font-mono text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200 resize-y placeholder-gray-500"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-lg font-semibold mb-2 text-gray-300">2. Paste HTML to Clone Style From</label>
                            <textarea
                                value={cloneHtmlInput}
                                onChange={(e) => setCloneHtmlInput(e.target.value)}
                                placeholder="<div class='bg-blue-500 text-white rounded'>...</div>"
                                className="w-full h-40 p-4 bg-[#111] border border-brand-border rounded-lg font-mono text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200 resize-y placeholder-gray-500"
                                disabled={isLoading}
                            />
                        </div>
                    </>
                )}
                
                <button
                    onClick={onGenerate}
                    disabled={isGenerateDisabled}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 text-lg font-bold text-black bg-brand-primary rounded-lg shadow-lg hover:bg-opacity-90 transition-all duration-200 ease-in-out disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-bg focus:ring-brand-primary"
                >
                    {getButtonIcon()}
                    {getButtonText()}
                </button>
            </div>
        </div>
    );
};

export default InputPanel;
