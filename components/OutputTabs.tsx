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
    XMarkIcon
} from './icons.tsx';
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
type Viewport = 'mobile' | 'tablet' | 'desktop';

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
    const [viewport, setViewport] = useState<Viewport>('desktop');
    const [isFullScreen, setIsFullScreen] = useState(false);

    const isModifyMode = inputMode === 'modify';

    useEffect(() => {
        if (isModifyMode && activeTab === 'prompt') {
            setActiveTab('preview');
        }
    }, [inputMode, activeTab, isModifyMode]);

    useEffect(() => {
        if (isLoading) {
             setActiveTab('preview');
        } else {
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
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsFullScreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleCopy = (type: 'prompt' | 'code') => {
        const textToCopy = type === 'prompt' ? generatedPrompt : htmlOutput;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopiedStates(prev => ({ ...prev, [type]: true }));
            setTimeout(() => setCopiedStates(prev => ({ ...prev, [type]: false })), 2000);
        }
    };
    
    const hasPreviewContent = previewImage || htmlOutput;

    const tabsConfig: { id: Tab; label: string; icon: React.FC<any> }[] = [];
    if (isModifyMode) {
        tabsConfig.push({ id: 'preview', label: 'Preview', icon: GlobeAltIcon });
        tabsConfig.push({ id: 'code', label: 'Code', icon: CodeBracketIcon });
    } else {
        tabsConfig.push({ id: 'preview', label: 'Preview', icon: PhotoIcon });
        tabsConfig.push({ id: 'prompt', label: 'Prompt', icon: SparkleIcon });
        tabsConfig.push({ id: 'code', label: 'Code', icon: CodeBracketIcon });
    }

    const CopyButton = ({ type }: { type: 'prompt' | 'code' }) => {
        const textExists = type === 'prompt' ? generatedPrompt : htmlOutput;
        if (isLoading || !textExists) return null;
        
        const isCopied = copiedStates[type];
        
        return (
            <button
                onClick={() => handleCopy(type)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-black/20 hover:bg-white/10 rounded-md transition-colors border border-brand-border/80"
            >
                {isCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                {isCopied ? 'Copied!' : 'Copy'}
            </button>
        );
    };
    
    const viewportControls = [
        { id: 'mobile', icon: DevicePhoneMobileIcon },
        { id: 'tablet', icon: DeviceTabletIcon },
        { id: 'desktop', icon: ComputerDesktopIcon },
    ];

    const PreviewComponent = isModifyMode ? (
        <HtmlPreviewPanel
            html={htmlOutput}
            isLoading={isLoading && !htmlOutput && !errors.html}
            error={errors.html || null}
            viewport={viewport}
        />
    ) : (
        <PreviewPanel
            imageUrl={previewImage}
            isLoading={isLoading && !previewImage && !errors.image}
            error={errors.image || null}
            viewport={viewport}
        />
    );


    return (
        <>
            <div className="bg-brand-surface/70 backdrop-blur-md border border-brand-border/50 rounded-xl shadow-2xl shadow-black/20 relative group">
                 <div className="absolute -inset-px bg-gradient-to-r from-brand-primary/50 to-brand-secondary/50 rounded-xl blur-lg opacity-0 group-hover:opacity-70 transition-opacity duration-500 -z-10"></div>
                <div className="relative">
                    <div className="flex justify-between items-center p-4 border-b border-brand-border/50">
                        <div className="flex items-center gap-2">
                            {tabsConfig.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-300 ${
                                        activeTab === tab.id
                                            ? 'text-black bg-brand-primary shadow-[0_0_10px_rgba(0,242,234,0.4)]'
                                            : 'text-brand-muted hover:bg-white/5'
                                    }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                        
                        <div className={`flex items-center gap-2 transition-opacity duration-300 ${activeTab === 'preview' && hasPreviewContent && !isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div className="bg-black/20 border border-brand-border/80 rounded-md p-1 flex items-center gap-1">
                                {viewportControls.map(control => (
                                    <button key={control.id} onClick={() => setViewport(control.id as Viewport)} className={`p-1.5 rounded-md transition-colors ${viewport === control.id ? 'bg-brand-primary text-black' : 'hover:bg-white/10 text-brand-muted'}`}>
                                        <control.icon className="w-5 h-5" />
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setIsFullScreen(true)} className="p-2.5 bg-black/20 border border-brand-border/80 rounded-md transition-colors hover:bg-white/10 text-brand-muted">
                                <ArrowsPointingOutIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {activeTab === 'prompt' && <CopyButton type="prompt" />}
                        {activeTab === 'code' && <CopyButton type="code" />}
                    </div>
                    <div className="p-6 min-h-[550px] flex items-center justify-center animate-fade-in overflow-hidden">
                        {activeTab === 'preview' && PreviewComponent}
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
            </div>

            {isFullScreen && (
                <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-xl z-50 flex items-center justify-center animate-fade-in p-4 sm:p-8">
                    <button onClick={() => setIsFullScreen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-black/20 p-2 rounded-full z-10">
                        <XMarkIcon className="w-7 h-7" />
                    </button>
                    <div className="w-full h-full flex items-center justify-center overflow-auto">
                        {React.cloneElement(PreviewComponent, { viewport: 'desktop' })}
                    </div>
                </div>
            )}
        </>
    );
};

export default OutputTabs;