
import React, { useState, useEffect } from 'react';
import PreviewPanel from './PreviewPanel.tsx';
import OutputPanelContent from './OutputPanel.tsx';
import HtmlOutputPanelContent from './HtmlOutputPanel.tsx';
import HtmlPreviewPanel from './HtmlPreviewPanel.tsx';
import { 
    PhotoIcon, 
    SparkleIcon, 
    CodeBracketIcon, 
    CopyIcon, 
    CheckIcon, 
    GlobeAltIcon,
    DevicePhoneMobileIcon,
    DeviceTabletIcon,
    ComputerDesktopIcon,
    ArrowsPointingOutIcon,
    ArrowTopRightOnSquareIcon,
    XMarkIcon,
    LinkIcon
} from './icons.tsx';
import { InputMode, GroundingSource } from '../types.ts';

interface OutputTabsProps {
    previewImage: string | null;
    generatedPrompt: string;
    htmlOutput: string;
    groundingSources?: GroundingSource[];
    isLoading: boolean;
    errors: {
        prompt?: string;
        image?: string;
        html?: string;
    };
    inputMode: InputMode;
}

const GroundingSources: React.FC<{ sources: GroundingSource[] }> = ({ sources }) => {
    if (!sources || sources.length === 0) return null;
    return (
        <div className="mt-4 p-4 bg-brand-bg/50 border border-brand-border/50 rounded-lg w-full">
            <h4 className="text-xs font-bold text-brand-primary mb-2 flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> SOURCES ANALYZED
            </h4>
            <ul className="space-y-1">
                {sources.map((s, i) => s.web && (
                    <li key={i}>
                        <a href={s.web.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-muted hover:text-white transition-colors truncate block">
                            {s.web.title || s.web.uri}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
};

type Tab = 'preview' | 'prompt' | 'code';
type Viewport = 'mobile' | 'tablet' | 'desktop';

const OutputTabs: React.FC<OutputTabsProps> = ({
    previewImage,
    generatedPrompt,
    htmlOutput,
    groundingSources = [],
    isLoading,
    errors,
    inputMode,
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('preview');
    const [copiedStates, setCopiedStates] = useState({ prompt: false, code: false });
    const [viewport, setViewport] = useState<Viewport>('desktop');

    const isModifyOrClone = inputMode === 'modify' || inputMode === 'clone';

    useEffect(() => {
        if (isModifyOrClone && activeTab === 'prompt') {
            setActiveTab('preview');
        }
    }, [inputMode, activeTab, isModifyOrClone]);

    useEffect(() => {
        if (isLoading) setActiveTab('preview');
    }, [isLoading]);

    const handleCopy = (type: 'prompt' | 'code') => {
        const textToCopy = type === 'prompt' ? generatedPrompt : htmlOutput;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopiedStates(prev => ({ ...prev, [type]: true }));
            setTimeout(() => setCopiedStates(prev => ({ ...prev, [type]: false })), 2000);
        }
    };

    const handleOpenInNewTab = () => {
        if (!htmlOutput) return;
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; margin: 0; }
                </style>
                <title>JengaUI Clone Preview</title>
            </head>
            <body>
                ${htmlOutput}
            </body>
            </html>
        `;
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up URL object after opening
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    
    const tabsConfig: { id: Tab; label: string; icon: React.FC<any> }[] = [];
    if (isModifyOrClone) {
        tabsConfig.push({ id: 'preview', label: 'Preview', icon: GlobeAltIcon });
        tabsConfig.push({ id: 'code', label: 'Code', icon: CodeBracketIcon });
    } else {
        tabsConfig.push({ id: 'preview', label: 'Preview', icon: PhotoIcon });
        tabsConfig.push({ id: 'prompt', label: 'Prompt', icon: SparkleIcon });
        tabsConfig.push({ id: 'code', label: 'Code', icon: CodeBracketIcon });
    }

    const PreviewComponent = (inputMode === 'clone' || inputMode === 'modify') || htmlOutput ? (
        <HtmlPreviewPanel
            html={htmlOutput}
            isLoading={isLoading && !htmlOutput}
            error={errors.html || null}
            viewport={viewport}
        />
    ) : (
        <PreviewPanel
            imageUrl={previewImage}
            isLoading={isLoading && !previewImage}
            error={errors.image || null}
            viewport={viewport}
        />
    );

    return (
        <>
            <div className="bg-brand-surface/70 backdrop-blur-md border border-brand-border/50 rounded-xl shadow-2xl relative group">
                <div className="relative">
                    <div className="flex justify-between items-center p-4 border-b border-brand-border/50">
                        <div className="flex items-center gap-1">
                            {tabsConfig.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2 text-xs font-bold rounded transition-all duration-300 ${
                                        activeTab === tab.id ? 'text-black bg-brand-primary' : 'text-brand-muted hover:bg-white/5'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                             {activeTab === 'preview' && !isLoading && htmlOutput && (
                                <>
                                    <div className="bg-black/20 rounded flex p-1 mr-2 border border-brand-border/30">
                                        <button onClick={() => setViewport('mobile')} className={`p-1 transition-colors ${viewport === 'mobile' ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-300'}`} title="Mobile View"><DevicePhoneMobileIcon className="w-4 h-4"/></button>
                                        <button onClick={() => setViewport('tablet')} className={`p-1 transition-colors ${viewport === 'tablet' ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-300'}`} title="Tablet View"><DeviceTabletIcon className="w-4 h-4"/></button>
                                        <button onClick={() => setViewport('desktop')} className={`p-1 transition-colors ${viewport === 'desktop' ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-300'}`} title="Desktop View"><ComputerDesktopIcon className="w-4 h-4"/></button>
                                    </div>
                                    <button 
                                        onClick={handleOpenInNewTab} 
                                        className="p-1.5 text-brand-muted hover:text-brand-primary transition-all duration-200 bg-white/5 rounded border border-brand-border/30 hover:border-brand-primary/50 group/tabbtn"
                                        title="Open in New Tab"
                                    >
                                        <ArrowTopRightOnSquareIcon className="w-4 h-4 group-hover/tabbtn:scale-110" />
                                    </button>
                                </>
                             )}
                             {activeTab === 'code' && (
                                <button onClick={() => handleCopy('code')} className="text-xs text-brand-muted hover:text-white flex items-center gap-1 px-2 py-1 bg-white/5 rounded border border-brand-border/30">
                                    {copiedStates.code ? <CheckIcon className="w-3 h-3 text-green-400"/> : <CopyIcon className="w-3 h-3"/>}
                                    {copiedStates.code ? 'Copied' : 'Copy Code'}
                                </button>
                             )}
                        </div>
                    </div>
                    <div className="p-6 min-h-[500px] flex flex-col items-center justify-center animate-fade-in">
                        {activeTab === 'preview' && PreviewComponent}
                        {activeTab === 'prompt' && !isModifyOrClone && (
                            <OutputPanelContent prompt={generatedPrompt} isLoading={isLoading} error={errors.prompt || null} />
                        )}
                        {activeTab === 'code' && (
                            <HtmlOutputPanelContent html={htmlOutput} isLoading={isLoading} error={errors.html || null} />
                        )}
                        
                        {!isLoading && groundingSources.length > 0 && inputMode === 'clone' && (
                             <GroundingSources sources={groundingSources} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default OutputTabs;
