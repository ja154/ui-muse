
import React, { useState, useEffect } from 'react';
import PreviewPanel from './PreviewPanel.tsx';
import OutputPanelContent from './OutputPanel.tsx';
import HtmlOutputPanelContent from './HtmlOutputPanel.tsx';
import CssOutputPanelContent from './CssOutputPanel.tsx';
import HtmlPreviewPanel from './HtmlPreviewPanel.tsx';
import BlueprintWireframe from './BlueprintWireframe.tsx';
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
    cssOutput?: string;
    groundingSources?: GroundingSource[];
    isLoading: boolean;
    errors: {
        prompt?: string;
        image?: string;
        html?: string;
        css?: string;
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

type Tab = 'preview' | 'prompt' | 'code' | 'css' | 'blueprint';
type Viewport = 'mobile' | 'tablet' | 'desktop';

const OutputTabs: React.FC<OutputTabsProps> = ({
    previewImage,
    generatedPrompt,
    htmlOutput,
    cssOutput,
    groundingSources = [],
    isLoading,
    errors,
    inputMode,
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('preview');
    const [copiedStates, setCopiedStates] = useState({ prompt: false, code: false, css: false });
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

    const handleCopy = (type: 'prompt' | 'code' | 'css') => {
        let textToCopy = '';
        if (type === 'prompt') textToCopy = generatedPrompt;
        else if (type === 'code') textToCopy = htmlOutput;
        else if (type === 'css') textToCopy = cssOutput || '';

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
                    ${cssOutput || ''}
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
        tabsConfig.push({ id: 'blueprint', label: 'Blueprint', icon: PhotoIcon });
        tabsConfig.push({ id: 'code', label: 'HTML', icon: CodeBracketIcon });
        tabsConfig.push({ id: 'css', label: 'CSS', icon: SparkleIcon });
    } else {
        tabsConfig.push({ id: 'preview', label: 'Preview', icon: PhotoIcon });
        tabsConfig.push({ id: 'blueprint', label: 'Blueprint', icon: PhotoIcon });
        tabsConfig.push({ id: 'prompt', label: 'Prompt', icon: SparkleIcon });
        tabsConfig.push({ id: 'code', label: 'HTML', icon: CodeBracketIcon });
        tabsConfig.push({ id: 'css', label: 'CSS', icon: SparkleIcon });
    }

    const PreviewComponent = (inputMode === 'clone' || inputMode === 'modify') || htmlOutput ? (
        <HtmlPreviewPanel
            html={htmlOutput}
            css={cssOutput}
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
                                    className={`px-4 py-3 min-h-[44px] text-sm font-bold rounded-lg transition-colors duration-200 ${
                                        activeTab === tab.id ? 'text-slate-900 bg-brand-primary shadow-sm' : 'text-brand-muted hover:bg-white/10 hover:text-slate-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                             {activeTab === 'preview' && !isLoading && htmlOutput && (
                                <>
                                    <div className="bg-brand-bg/60 rounded-lg flex p-1 mr-2 border border-brand-border/50">
                                        <button onClick={() => setViewport('mobile')} className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md transition-colors ${viewport === 'mobile' ? 'text-brand-primary bg-white/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`} title="Mobile View"><DevicePhoneMobileIcon className="w-5 h-5"/></button>
                                        <button onClick={() => setViewport('tablet')} className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md transition-colors ${viewport === 'tablet' ? 'text-brand-primary bg-white/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`} title="Tablet View"><DeviceTabletIcon className="w-5 h-5"/></button>
                                        <button onClick={() => setViewport('desktop')} className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md transition-colors ${viewport === 'desktop' ? 'text-brand-primary bg-white/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`} title="Desktop View"><ComputerDesktopIcon className="w-5 h-5"/></button>
                                    </div>
                                    <button 
                                        onClick={handleOpenInNewTab} 
                                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-brand-muted hover:text-brand-primary transition-colors duration-200 bg-white/5 rounded-lg border border-brand-border/50 hover:bg-white/10"
                                        title="Open in New Tab"
                                    >
                                        <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                                    </button>
                                </>
                             )}
                             {(activeTab === 'code' || activeTab === 'css') && (
                                <button onClick={() => handleCopy(activeTab)} className="text-sm font-medium text-brand-muted hover:text-white flex items-center gap-2 px-4 py-2 min-h-[44px] bg-white/5 rounded-lg border border-brand-border/50 hover:bg-white/10 transition-colors">
                                    {copiedStates[activeTab] ? <CheckIcon className="w-4 h-4 text-green-400"/> : <CopyIcon className="w-4 h-4"/>}
                                    {copiedStates[activeTab] ? 'Copied' : 'Copy'}
                                </button>
                             )}
                        </div>
                    </div>
                    <div className="p-6 min-h-[500px] w-full flex flex-col items-center justify-center animate-fade-in">
                        {activeTab === 'preview' && PreviewComponent}
                        {activeTab === 'blueprint' && (
                            <div className="w-full h-full min-h-[600px]">
                                <BlueprintWireframe />
                            </div>
                        )}
                        {activeTab === 'prompt' && !isModifyOrClone && (
                            <OutputPanelContent prompt={generatedPrompt} isLoading={isLoading} error={errors.prompt || null} />
                        )}
                        {activeTab === 'code' && (
                            <HtmlOutputPanelContent html={htmlOutput} isLoading={isLoading} error={errors.html || null} />
                        )}
                        {activeTab === 'css' && (
                            <CssOutputPanelContent css={cssOutput || ''} isLoading={isLoading} error={errors.css || null} />
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
