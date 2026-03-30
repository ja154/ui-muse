
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
        <div className="mt-4 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl w-full">
            <h4 className="text-[10px] font-bold text-brand-primary mb-2 flex items-center gap-1.5 uppercase tracking-widest">
                <LinkIcon className="w-3 h-3" /> Sources analyzed
            </h4>
            <ul className="space-y-1">
                {sources.map((s, i) => s.web && (
                    <li key={i}>
                        <a href={s.web.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/30 hover:text-white/70 transition-colors truncate block">
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

    const isModifyOrClone = inputMode === 'modify' || inputMode === 'clone' || inputMode === 'design';

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

    const isFullHtmlDocument = (html: string): boolean => {
        const trimmed = html.trimStart().toLowerCase();
        return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
    };

    const handleOpenInNewTab = () => {
        if (!htmlOutput) return;
        let fullHtml: string;
        if (isFullHtmlDocument(htmlOutput)) {
            fullHtml = cssOutput && cssOutput.trim()
                ? htmlOutput.replace('</head>', `<style>${cssOutput}</style>\n</head>`)
                : htmlOutput;
        } else {
            fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        html, body { margin: 0; padding: 0; }
        body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        ${cssOutput || ''}
    </style>
    <title>JengaUI Preview</title>
</head>
<body>
    ${htmlOutput}
</body>
</html>`;
        }
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    
    const tabsConfig: { id: Tab; label: string; icon: React.FC<any> }[] = [];
    if (isModifyOrClone) {
        tabsConfig.push({ id: 'preview', label: 'Preview', icon: GlobeAltIcon });
        if (inputMode !== 'design') {
            tabsConfig.push({ id: 'blueprint', label: 'Blueprint', icon: PhotoIcon });
        }
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
            <div className="glass rounded-2xl">
                <div className="relative">
                    <div className="flex justify-between items-center px-4 py-3 border-b border-white/[0.06]">
                        <div className="flex items-center gap-1">
                            {tabsConfig.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3 py-2 min-h-[36px] text-xs font-semibold rounded-lg transition-all duration-200 ${
                                        activeTab === tab.id
                                            ? 'text-white bg-white/[0.1] border border-white/[0.12]'
                                            : 'text-white/30 hover:bg-white/[0.05] hover:text-white/60'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                             {activeTab === 'preview' && !isLoading && htmlOutput && (
                                <>
                                    <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.07] rounded-lg p-1 mr-1">
                                        <button onClick={() => setViewport('mobile')} title="Mobile View" className={`p-1.5 rounded-md transition-colors ${viewport === 'mobile' ? 'text-white bg-white/[0.1]' : 'text-white/25 hover:text-white/60'}`}><DevicePhoneMobileIcon className="w-4 h-4"/></button>
                                        <button onClick={() => setViewport('tablet')} title="Tablet View" className={`p-1.5 rounded-md transition-colors ${viewport === 'tablet' ? 'text-white bg-white/[0.1]' : 'text-white/25 hover:text-white/60'}`}><DeviceTabletIcon className="w-4 h-4"/></button>
                                        <button onClick={() => setViewport('desktop')} title="Desktop View" className={`p-1.5 rounded-md transition-colors ${viewport === 'desktop' ? 'text-white bg-white/[0.1]' : 'text-white/25 hover:text-white/60'}`}><ComputerDesktopIcon className="w-4 h-4"/></button>
                                    </div>
                                    <button onClick={handleOpenInNewTab} title="Open in New Tab"
                                        className="p-1.5 text-white/25 hover:text-brand-primary transition-colors bg-white/[0.04] border border-white/[0.07] rounded-lg hover:bg-white/[0.08]">
                                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                    </button>
                                </>
                             )}
                             {(activeTab === 'code' || activeTab === 'css') && (
                                <button onClick={() => handleCopy(activeTab)}
                                    className="text-xs font-semibold text-white/30 hover:text-white flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] rounded-lg border border-white/[0.07] hover:bg-white/[0.08] transition-colors">
                                    {copiedStates[activeTab] ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400"/> : <CopyIcon className="w-3.5 h-3.5"/>}
                                    {copiedStates[activeTab] ? 'Copied' : 'Copy'}
                                </button>
                             )}
                        </div>
                    </div>
                    <div className="p-6 min-h-[900px] w-full flex flex-col items-start justify-start animate-fade-in">
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
