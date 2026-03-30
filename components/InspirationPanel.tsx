import React from 'react';
import { Template, VisualStyle } from '../types.ts';
import { LoadingSpinner, GenerateIcon, CodeBracketIcon, SparkleIcon } from './icons.tsx';

interface TemplatesPanelProps {
    templates: Template[];
    generatedTemplates: Record<string, string>;
    loadingStates: Record<string, boolean>;
    onGenerate: (templateId: string, prompt: string, style: VisualStyle) => void;
    onUse: (html: string, target: 'base' | 'style') => void;
}

const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ templates, generatedTemplates, loadingStates, onGenerate, onUse }) => {
    return (
        <div className="glass rounded-2xl p-5 h-full">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-sm font-semibold text-white tracking-tight">Starter Templates</h2>
                    <p className="text-[11px] text-white/25 mt-0.5">Generate and use as a base or style reference</p>
                </div>
                <span className="text-[10px] font-mono text-white/20 border border-white/[0.06] rounded-md px-2 py-1">{templates.length} templates</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map(template => {
                    const isLoading = loadingStates[template.id];
                    const generatedHtml = generatedTemplates[template.id];

                    return (
                        <div key={template.id}
                            className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col gap-3 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300">
                            <div>
                                <p className="text-xs font-semibold text-white/80">{template.name}</p>
                                <p className="text-[10px] text-white/25 mt-0.5 font-mono">{template.style}</p>
                            </div>

                            {isLoading ? (
                                <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-white/40 bg-white/[0.04] rounded-lg cursor-wait">
                                    <LoadingSpinner className="w-3.5 h-3.5" /> Generating…
                                </button>
                            ) : generatedHtml ? (
                                <div className="flex gap-2">
                                    <button onClick={() => onUse(generatedHtml, 'base')}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-white/60 border border-white/[0.08] rounded-lg hover:bg-white/[0.06] hover:text-white transition-all">
                                        <CodeBracketIcon className="w-3.5 h-3.5" /> Use as Base
                                    </button>
                                    <button onClick={() => onUse(generatedHtml, 'style')}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-white/60 border border-white/[0.08] rounded-lg hover:bg-white/[0.06] hover:text-white transition-all">
                                        <SparkleIcon className="w-3.5 h-3.5" /> Apply Style
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => onGenerate(template.id, template.prompt, template.style)}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-brand-primary border border-brand-primary/20 bg-brand-primary/5 rounded-lg hover:bg-brand-primary/10 hover:border-brand-primary/40 transition-all">
                                    <GenerateIcon className="w-3.5 h-3.5" /> Generate
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TemplatesPanel;
