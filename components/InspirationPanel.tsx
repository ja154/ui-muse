
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
        <div className="bg-brand-surface/70 backdrop-blur-md border border-brand-border/50 rounded-xl shadow-2xl shadow-black/20 p-6 relative group h-full">
            <div className="absolute -inset-px bg-gradient-to-r from-brand-primary/50 to-brand-secondary/50 rounded-xl blur-lg opacity-0 group-hover:opacity-70 transition-opacity duration-500 -z-10"></div>
            <div className="relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-100 font-mono tracking-tighter uppercase">HTML Templates</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => {
                        const isLoading = loadingStates[template.id];
                        const generatedHtml = generatedTemplates[template.id];

                        return (
                            <div key={template.id} className="p-4 bg-black/30 rounded-lg border border-brand-border/80 flex flex-col justify-between transition-all duration-300 hover:border-brand-primary/50 hover:bg-white/5">
                                <div>
                                    <h3 className="font-semibold text-gray-200">{template.name}</h3>
                                    <p className="text-sm text-brand-muted mb-4">Style: {template.style}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-auto">
                                    {isLoading ? (
                                        <button disabled className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-white bg-white/20 rounded-md disabled:cursor-wait">
                                            <LoadingSpinner className="w-4 h-4" />
                                            Generating...
                                        </button>
                                    ) : generatedHtml ? (
                                        <>
                                            <button 
                                                onClick={() => onUse(generatedHtml, 'base')}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
                                                title="Use this as your base HTML"
                                                >
                                                 <CodeBracketIcon className="w-4 h-4"/> Use as Base
                                            </button>
                                            <button
                                                 onClick={() => onUse(generatedHtml, 'style')}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
                                                title="Use this to style your HTML"
                                            >
                                                <SparkleIcon className="w-4 h-4" /> Use for Style
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            onClick={() => onGenerate(template.id, template.prompt, template.style)}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-black bg-brand-primary rounded-md shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 hover:scale-[1.03] transition-all duration-300"
                                        >
                                            <GenerateIcon className="w-4 h-4" /> Generate
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TemplatesPanel;
