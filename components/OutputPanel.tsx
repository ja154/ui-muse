
import React from 'react';

interface OutputPanelContentProps {
    prompt: string;
    isLoading: boolean;
    error: string | null;
}

const SkeletonLoader: React.FC = () => (
    <div className="space-y-6 animate-pulse-fast">
        <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="h-3 bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-700 rounded w-5/6"></div>
        </div>
        <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded w-1/3"></div>
            <div className="h-3 bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-700 rounded w-4/6"></div>
        </div>
         <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-3 bg-gray-700 rounded w-full"></div>
        </div>
    </div>
);

const OutputPanelContent: React.FC<OutputPanelContentProps> = ({ prompt, isLoading, error }) => {
    
    const renderContent = () => {
        if (isLoading) {
            return <SkeletonLoader />;
        }
        if (error) {
            return <p className="text-red-400 font-medium">{error}</p>;
        }
        if (prompt) {
            const formattedPrompt = prompt.split('\n').map((line, index) => {
                if (line.startsWith('## ')) {
                    return <h3 key={index} className="text-lg font-semibold mt-4 mb-1 text-brand-primary">{line.substring(3)}</h3>;
                }
                return <p key={index} className="text-gray-300 leading-relaxed">{line}</p>;
            });
            return <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-brand-primary">{formattedPrompt}</div>;
        }
        return <p className="text-brand-muted">Your enhanced prompt will appear here...</p>;
    };

    return (
        <div className="overflow-y-auto max-h-[500px] pr-2">
            {renderContent()}
        </div>
    );
};

export default OutputPanelContent;
