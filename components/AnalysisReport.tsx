import React from 'react';
import { AnalysisResult } from '../types';
import { Layout, Palette, Type, Box, Layers, Search } from 'lucide-react';

interface AnalysisReportProps {
    result: AnalysisResult;
}

const AnalysisReport: React.FC<AnalysisReportProps> = ({ result }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-5 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                    <Search className="w-5 h-5 text-brand-primary" />
                    <h3 className="font-bold text-brand-text">Visual Intelligence Summary</h3>
                </div>
                <p className="text-sm text-brand-text leading-relaxed opacity-90">
                    {result.visualSummary}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-brand-bg border border-brand-border rounded-2xl hover:border-brand-primary/30 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <Palette className="w-5 h-5 text-brand-primary" />
                        <h4 className="font-bold text-brand-text text-sm uppercase tracking-wider">Design Tokens</h4>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-brand-muted mb-2 block">Detected Colors</label>
                            <div className="flex flex-wrap gap-2">
                                {result.designTokens.colors.map((color, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-brand-surface border border-brand-border px-2 py-1 rounded-lg">
                                        {color.startsWith('#') && (
                                            <div className="w-3 h-3 rounded-full border border-brand-border" style={{ backgroundColor: color }}></div>
                                        )}
                                        <span className="text-[11px] font-mono text-brand-text/70">{color}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-brand-muted mb-1 block">Typography</label>
                                <div className="text-xs font-medium text-brand-text">
                                    {result.designTokens.fonts.join(', ')}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-brand-muted mb-1 block">Spacing Rhythm</label>
                                <div className="text-xs font-medium text-brand-text">
                                    {result.designTokens.spacing}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-brand-bg border border-brand-border rounded-2xl hover:border-brand-primary/30 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <Layout className="w-5 h-5 text-brand-primary" />
                        <h4 className="font-bold text-brand-text text-sm uppercase tracking-wider">Architecture</h4>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-brand-muted mb-1 block">Layout Pattern</label>
                            <div className="text-xs font-semibold text-brand-primary flex items-center gap-2">
                                <Box className="w-3 h-3" />
                                {result.architecture.layout}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-bold text-brand-muted mb-2 block">Key Components</label>
                            <div className="flex flex-wrap gap-2">
                                {result.architecture.components.map((comp, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-brand-primary/5 text-brand-primary text-[10px] font-bold rounded-md border border-brand-primary/10">
                                        {comp}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-bold text-brand-muted mb-2 block">Structural Sections</label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {result.architecture.sections.map((section, i) => (
                                    <React.Fragment key={i}>
                                        <span className="text-[11px] text-brand-text/80">{section}</span>
                                        {i < result.architecture.sections.length - 1 && <Layers className="w-3 h-3 text-brand-muted/30" />}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisReport;
