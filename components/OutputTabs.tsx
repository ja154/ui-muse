import React, { useState, useEffect } from 'react';
import PreviewPanelContent from './PreviewPanel.tsx';
import OutputPanelContent from './OutputPanel.tsx';
import HtmlOutputPanelContent from './HtmlOutputPanel.tsx';
import HtmlPreviewPanel from './HtmlPreviewPanel.tsx';
import { PhotoIcon, SparkleIcon, CodeBracketIcon, CopyIcon, CheckIcon, GlobeAltIcon } from './icons.tsx';
import { InputMode } from '../types.ts';

interface OutputTabsProps {
    previewImage: string | null;
    generatedPrompt: string;
    htmlOutput: string;
    isLoading: boolean;
    errors: {
        prompt?: string;
        image?: string;
        html?: string;
    };
    inputMode: InputMode;
}

type Tab = 'preview' | 'prompt' | 'code';

const OutputTabs: React.FC<OutputTabsProps> = ({
    previewImage,
    generatedPrompt,
    htmlOutput,
    isLoading,
    errors,
    inputMode,
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('preview');
    const [copiedStates, setCopiedStates] = useState({ prompt: false, code: false });

    const isModifyMode = inputMode === 'modify';

    useEffect(() => {
        // When switching modes, ensure the active tab is valid
        if (isModifyMode && activeTab === 'prompt') {
            setActiveTab('preview');
        }
    }, [inputMode, activeTab, isModifyMode]);

    useEffect(() => {
        // When generation starts, switch to the most relevant tab
        if (isLoading) {
             setActiveTab('preview');
        } else {
            // After loading, default to the most relevant tab with content
            if (isModifyMode) {
                if (htmlOutput) setActiveTab('preview');
            } else {
                if (previewImage) setActiveTab('preview');
                else if (generatedPrompt) setActiveTab('prompt');
                else if (htmlOutput) setActiveTab('code');
            }
        }
    }, [isLoading, htmlOutput, generatedPrompt, previewImage, isModifyMode]);


    useEffect(() => {
        setCopiedStates({ prompt: false, code: false });
    }, [generatedPrompt, htmlOutput]);

    const handleCopy = (type: 'prompt' | 'code') => {
        const textToCopy = type === 'prompt' ? generatedPrompt : htmlOutput;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopiedStates(prev => ({ ...prev, [type]: true }));
            setTimeout(() => setCopiedStates(prev => ({ ...prev, [type]: false })), 2000);
        }
    };

    const tabs: { id: Tab; label: string; icon: React.FC<any> }[] = [];
    if (isModifyMode) {
        tabs.push({ id: 'preview', label: 'Preview', icon: GlobeAltIcon });
        tabs.push({ id: 'code', label: 'Code', icon: CodeBracketIcon });
    } else {
        tabs.push({ id: 'preview', label: 'Preview', icon: PhotoIcon });
        tabs.push({ id: 'prompt', label: 'Prompt', icon: SparkleIcon });
        tabs.push({ id: 'code', label: 'Code', icon: CodeBracketIcon });
    }

    const CopyButton = ({ type }: { type: 'prompt' | 'code' }) => {
        const textExists = type === 'prompt' ? generatedPrompt : htmlOutput;
        if (isLoading || !textExists) return null;
        
        const isCopied = copiedStates[type];
        
        return (
            <button
                onClick={() => handleCopy(type)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
                {isCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                {isCopied ? 'Copied!' : 'Copy'}
            </button>
        );
    };

    return (
        <div className="bg-brand-surface rounded-xl border border-brand-border shadow-lg">
            <div className="flex justify-between items-center p-4 border-b border-brand-border">
                <div className="flex items-center gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                                activeTab === tab.id
                                    ? 'text-black bg-brand-primary'
                                    : 'text-brand-muted hover:bg-gray-800/50'
                            }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
                {activeTab === 'prompt' && <CopyButton type="prompt" />}
                {activeTab === 'code' && <CopyButton type="code" />}
            </div>
            <div className="p-6 min-h-[400px]">
                {activeTab === 'preview' && (
                    isModifyMode ? (
                        <HtmlPreviewPanel
                            html={htmlOutput}
                            isLoading={isLoading && !htmlOutput && !errors.html}
                            error={errors.html || null}
                        />
                    ) : (
                        <PreviewPanelContent
                            imageUrl={previewImage}
                            isLoading={isLoading && !previewImage && !errors.image}
                            error={errors.image || null}
                        />
                    )
                )}
                {activeTab === 'prompt' && !isModifyMode && (
                    <OutputPanelContent
                        prompt={generatedPrompt}
                        isLoading={isLoading && !generatedPrompt && !errors.prompt}
                        error={errors.prompt || null}
                    />
                )}
                {activeTab === 'code' && (
                    <HtmlOutputPanelContent
                        html={htmlOutput}
                        isLoading={isLoading && !htmlOutput && !errors.html}
                        error={errors.html || null}
                    />
                )}
            </div>
        </div>
    );
};

export default OutputTabs;