
import React from 'react';

interface CssOutputPanelContentProps {
    css: string;
    isLoading: boolean;
    error: string | null;
}

const SkeletonLoader: React.FC = () => (
    <div className="space-y-4 animate-pulse-fast">
        <div className="h-3 bg-slate-800 rounded w-1/4"></div>
        <div className="h-3 bg-slate-800 rounded w-1/2"></div>
        <div className="h-3 bg-slate-800 rounded w-full"></div>
        <div className="h-3 bg-slate-800 rounded w-3/4"></div>
        <div className="h-3 bg-slate-800 rounded w-5/6"></div>
    </div>
);

const CssOutputPanelContent: React.FC<CssOutputPanelContentProps> = ({ css, isLoading, error }) => {
    
    const renderContent = () => {
        if (isLoading) {
            return <SkeletonLoader />;
        }
        if (error) {
            return <p className="text-red-400 font-medium">{error}</p>;
        }
        if (css) {
            return (
                <pre className="whitespace-pre-wrap break-words bg-brand-bg/60 p-4 rounded-xl border border-brand-border/80">
                    <code className="font-mono text-xs text-cyan-300">
                        {css}
                    </code>
                </pre>
            );
        }
        return <p className="text-brand-muted">Generated CSS styles will appear here...</p>;
    };

    return (
        <div className="overflow-y-auto max-h-[500px] pr-2">
            {renderContent()}
        </div>
    );
};

export default CssOutputPanelContent;
