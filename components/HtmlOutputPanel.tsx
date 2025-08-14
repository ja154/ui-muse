
import React from 'react';

interface HtmlOutputPanelContentProps {
    html: string;
    isLoading: boolean;
    error: string | null;
}

const SkeletonLoader: React.FC = () => (
    <div className="space-y-4 animate-pulse-fast">
        <div className="h-3 bg-gray-700 rounded w-1/3"></div>
        <div className="h-3 bg-gray-700 rounded w-full"></div>
        <div className="h-3 bg-gray-700 rounded w-5/6"></div>
        <div className="h-3 bg-gray-700 rounded w-full"></div>
        <div className="h-3 bg-gray-700 rounded w-2/3"></div>
        <div className="h-3 bg-gray-700 rounded w-4/6"></div>
        <div className="h-3 bg-gray-700 rounded w-full"></div>
    </div>
);

const HtmlOutputPanelContent: React.FC<HtmlOutputPanelContentProps> = ({ html, isLoading, error }) => {
    
    const renderContent = () => {
        if (isLoading) {
            return <SkeletonLoader />;
        }
        if (error) {
            return <p className="text-red-400 font-medium">{error}</p>;
        }
        if (html) {
            return (
                <pre className="whitespace-pre-wrap break-words bg-[#111] p-4 rounded-lg border border-brand-border">
                    <code className="font-mono text-sm text-gray-300">
                        {html}
                    </code>
                </pre>
            );
        }
        return <p className="text-brand-muted">Your refined HTML code will appear here...</p>;
    };

    return (
        <div className="overflow-y-auto max-h-[500px] pr-2">
            {renderContent()}
        </div>
    );
};

export default HtmlOutputPanelContent;
