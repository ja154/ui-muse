import React from 'react';
import { GlobeAltIcon } from './icons.tsx';

type Viewport = 'mobile' | 'tablet' | 'desktop';

interface HtmlPreviewPanelProps {
    html: string;
    isLoading: boolean;
    error: string | null;
    viewport: Viewport;
}

const DeviceFrame: React.FC<{ children: React.ReactNode, device: 'mobile' | 'tablet' }> = ({ children, device }) => {
    const frameClasses = {
        mobile: 'w-[395px] h-[797px] p-4 bg-gray-900 border-4 border-gray-700 rounded-[40px] shadow-2xl transition-all duration-300',
        tablet: 'w-[808px] h-[1064px] p-4 bg-gray-900 border-4 border-gray-700 rounded-[24px] shadow-2xl transition-all duration-300'
    };
    const screenClasses = 'bg-white w-full h-full rounded-[20px] overflow-hidden';

    return (
        <div className={frameClasses[device]}>
            <div className={screenClasses}>
                {children}
            </div>
        </div>
    );
};


const HtmlPreviewPanel: React.FC<HtmlPreviewPanelProps> = ({ html, isLoading, error, viewport }) => {
    
    const getFullHtml = (bodyContent: string) => {
        return `
            <!DOCTYPE html>
            <html lang="en" class="h-full">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
                </style>
                <title>Preview</title>
            </head>
            <body class="h-full">
                <div class="h-full w-full flex items-center justify-center bg-white p-4">
                  ${bodyContent}
                </div>
            </body>
            </html>
        `;
    };

    const content = () => {
        if (isLoading) {
            return (
                <div className="w-full h-full bg-brand-surface border-2 border-dashed border-brand-border rounded-lg flex flex-col items-center justify-center animate-pulse-fast">
                    <GlobeAltIcon className="w-16 h-16 mb-4 text-brand-border" />
                    <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                </div>
            );
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
                    sandbox="allow-scripts allow-same-origin"
                    className="w-full h-full border-0 bg-white"
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
    
    if (viewport === 'mobile' || viewport === 'tablet') {
         return <div className="transform scale-[0.6] sm:scale-75 origin-top"><DeviceFrame device={viewport}>{content()}</DeviceFrame></div>
    }
    
    return (
        <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
            {content()}
        </div>
    );
};

export default HtmlPreviewPanel;