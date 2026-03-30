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

const inputBase = "w-full p-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder:text-white/20 outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/10 transition-all duration-200";

const InputPanel: React.FC<InputPanelProps> = (props) => {
    const {
        inputMode, setInputMode, userInput, setUserInput, urlInput, setUrlInput,
        screenshots, setScreenshots, pastedContent, setPastedContent,
        htmlInput, setHtmlInput, cloneHtmlInput, setCloneHtmlInput,
        selectedStyle, setSelectedStyle, visualStyles, onGenerate, isLoading
    } = props;

    const fileInputRef = useRef<HTMLInputElement>(null);

    const isGenerateDisabled = isLoading || (
        (inputMode === 'description'   && !userInput.trim()) ||
        (inputMode === 'blueprint'     && !userInput.trim()) ||
        (inputMode === 'design-system' && !userInput.trim()) ||
        (inputMode === 'modify'        && (!htmlInput.trim() || !cloneHtmlInput.trim())) ||
        (inputMode === 'clone'         && (!urlInput.trim() && screenshots.length === 0 && !pastedContent.trim()))
    );

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (fileList) {
            (Array.from(fileList) as File[]).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => setScreenshots(prev => [...prev, reader.result as string].slice(-4));
                reader.readAsDataURL(file);
            });
        }
    };

    const mainTabs: { mode: InputMode; label: string }[] = [
        { mode: 'description',   label: 'Describe'  },
        { mode: 'blueprint',     label: 'Blueprint'  },
        { mode: 'design-system', label: 'Design Sys' },
        { mode: 'design',        label: 'Draw'       },
        { mode: 'modify',        label: 'Remix'      },
        { mode: 'clone',         label: 'Clone'      },
    ];

    const getButtonText = () => {
        if (isLoading) {
            if (inputMode === 'clone')         return 'Cloning website…';
            if (inputMode === 'modify')        return 'Remixing…';
            if (inputMode === 'blueprint')     return 'Drafting…';
            if (inputMode === 'design-system') return 'Generating…';
            return 'Building UI…';
        }
        if (inputMode === 'modify')        return 'Remix HTML';
        if (inputMode === 'clone')         return 'Clone Website';
        if (inputMode === 'blueprint')     return 'Generate Blueprint';
        if (inputMode === 'design-system') return 'Build with Design System';
        return 'Build UI';
    };

    const placeholder = inputMode === 'blueprint'
        ? 'e.g. A multi-step checkout form with progress indicator'
        : inputMode === 'design-system'
        ? 'e.g. A modern fintech app for Gen Z — focused on trust and speed'
        : 'e.g. A sleek dark-mode fitness dashboard with activity rings';

    return (
        <div className="glass rounded-2xl overflow-hidden flex flex-col">

            {/* Mode Tabs */}
            <div className="px-3 pt-3 pb-0 border-b border-white/[0.06]">
                <div className="flex gap-1">
                    {mainTabs.map(tab => (
                        <button
                            key={tab.mode}
                            onClick={() => setInputMode(tab.mode)}
                            className={`flex-1 py-2 px-1 text-[11px] font-semibold rounded-t-lg transition-all duration-200 whitespace-nowrap ${
                                inputMode === tab.mode
                                    ? 'text-white border-b-2 border-brand-primary bg-brand-primary/10'
                                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Form Body */}
            <div className="p-5 space-y-5 flex-1">

                {/* Description / Blueprint / Design System */}
                {(inputMode === 'description' || inputMode === 'blueprint' || inputMode === 'design-system') && (
                    <>
                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                                {inputMode === 'blueprint'     ? 'Describe the layout'         :
                                 inputMode === 'design-system' ? 'Describe your brand / product' :
                                 'Describe your UI idea'}
                            </label>
                            <textarea
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                placeholder={placeholder}
                                rows={4}
                                disabled={isLoading}
                                className={`${inputBase} resize-none`}
                            />
                        </div>

                        {inputMode === 'description' && (
                            <div>
                                <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Visual Style</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {visualStyles.map(style => (
                                        <button
                                            key={style}
                                            onClick={() => setSelectedStyle(style)}
                                            disabled={isLoading}
                                            className={`px-3 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl transition-all duration-200 text-left border ${
                                                selectedStyle === style
                                                    ? 'border-brand-primary/60 bg-brand-primary/10 text-white'
                                                    : 'border-white/[0.06] bg-white/[0.03] text-white/40 hover:border-white/[0.12] hover:text-white/70'
                                            }`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Remix */}
                {inputMode === 'modify' && (
                    <>
                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Your existing HTML</label>
                            <textarea value={htmlInput} onChange={e => setHtmlInput(e.target.value)} placeholder="Paste your HTML here…" rows={4} className={`${inputBase} font-mono text-xs resize-none`} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Style to apply</label>
                            <textarea value={cloneHtmlInput} onChange={e => setCloneHtmlInput(e.target.value)} placeholder="Paste the HTML with the style you want to apply…" rows={4} className={`${inputBase} font-mono text-xs resize-none`} />
                        </div>
                    </>
                )}

                {/* Clone */}
                {inputMode === 'clone' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Website URL</label>
                            <div className="relative">
                                <GlobeAltIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    placeholder="https://stripe.com"
                                    disabled={isLoading}
                                    className={`${inputBase} pl-10`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                                Screenshots
                                <span className="ml-2 text-[10px] normal-case tracking-normal text-brand-primary/60 font-medium">optional</span>
                            </label>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                            <div className="grid grid-cols-2 gap-2">
                                {screenshots.map((src, i) => (
                                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-white/[0.08] group/img">
                                        <img src={src} className="w-full h-full object-cover" alt="" />
                                        <button onClick={() => setScreenshots(prev => prev.filter((_, idx) => idx !== i))}
                                            className="absolute top-1 right-1 bg-black/70 rounded-full p-1 text-white hover:bg-red-500 transition-colors opacity-0 group-hover/img:opacity-100">
                                            <XMarkIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {screenshots.length < 4 && (
                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="aspect-video border border-dashed border-white/[0.1] rounded-lg flex flex-col items-center justify-center gap-1.5 text-white/25 hover:border-brand-primary/40 hover:text-brand-primary/60 transition-all">
                                        <PhotoIcon className="w-5 h-5" />
                                        <span className="text-[10px] font-semibold">Add screenshot</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Paste content</label>
                            <textarea value={pastedContent} onChange={e => setPastedContent(e.target.value)} placeholder="Paste any HTML, CSS, or text for extra context…" rows={3} disabled={isLoading} className={`${inputBase} resize-none`} />
                        </div>
                    </div>
                )}

                {/* Draw mode info */}
                {inputMode === 'design' && (
                    <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-cta-gradient/20 flex items-center justify-center mb-1">
                            <GenerateIcon className="w-6 h-6 text-brand-primary" />
                        </div>
                        <p className="text-sm font-semibold text-white">Interactive Wireframe Editor</p>
                        <p className="text-xs text-white/30 max-w-[220px] leading-relaxed">
                            Use the canvas on the right to draw your wireframe, then generate a high-fidelity UI from it.
                        </p>
                    </div>
                )}

                {/* Generate button */}
                {inputMode !== 'design' && (
                    <button
                        onClick={onGenerate}
                        disabled={isGenerateDisabled}
                        className="btn-cta w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold text-white min-h-[52px] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                        {isLoading
                            ? <><LoadingSpinner className="w-4 h-4" />{getButtonText()}</>
                            : inputMode === 'modify'
                            ? <><CodeBracketIcon className="w-4 h-4" />{getButtonText()}</>
                            : inputMode === 'clone'
                            ? <><GlobeAltIcon className="w-4 h-4" />{getButtonText()}</>
                            : <><GenerateIcon className="w-4 h-4" />{getButtonText()}</>
                        }
                    </button>
                )}
            </div>
        </div>
    );
};

export default InputPanel;
