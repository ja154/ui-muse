
import React from 'react';
import { GlobeAltIcon } from './icons.tsx';

interface HtmlPreviewPanelProps {
    html: string;
    isLoading: boolean;
    error: string | null;
}

const SkeletonLoader: React.FC = () => (
    <div className="w-full h-full bg-brand-surface border-2 border-dashed border-brand-border rounded-lg flex flex-col items-center justify-center animate-pulse-fast">
        <GlobeAltIcon className="w-16 h-16 mb-4 text-brand-border" />
        <div className="h-4 bg-gray-700 rounded w-1/3"></div>
    </div>
);

const HtmlPreviewPanel: React.FC<HtmlPreviewPanelProps> = ({ html, isLoading, error }) => {
    
    const getFullHtml = (bodyContent: string) => {
        // We wrap the generated HTML snippet in a full document and include Tailwind CSS
        // to ensure the preview is styled correctly.
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"></script>
                <title>Preview</title>
            </head>
            <body>
                ${bodyContent}
            </body>
            </html>
        `;
    };

    const renderContent = () => {
        if (isLoading) {
            return <SkeletonLoader />;
        }
        
        if (error) {
            return (
                <div className="w-full h-full bg-red-900/20 border-2 border-dashed border-red-500/50 rounded-lg flex flex-col items-center justify-center text-red-400 p-4">
                    <h3 className="text-lg font-semibold">HTML Error</h3>
                    <p className="text-sm text-center">{error}</p>
                </div>
            );
        }

        if (html) {
            return (
                <iframe 
                    srcDoc={getFullHtml(html)} 
                    title="HTML Preview" 
                    sandbox="allow-scripts" // Allow scripts for Tailwind to execute
                    className="w-full h-full border-0 rounded-lg bg-brand-surface"
                />
            );
        }

        return (
            <div className="w-full h-full bg-brand-surface border-2 border-dashed border-brand-border rounded-lg flex flex-col items-center justify-center text-brand-muted">
                <GlobeAltIcon className="w-16 h-16 mb-4" />
                <h3 className="text-lg font-semibold">HTML Preview</h3>
                <p className="text-sm">Your modified UI will be rendered here</p>
            </div>
        );
    }
    
    return (
        <div className="aspect-video w-full">
            {renderContent()}
        </div>
    );
};

export default HtmlPreviewPanel;
