import React from 'react';
import { GlobeAltIcon } from './icons.tsx';
import { useAnimation } from '../AnimationContext.tsx';

type Viewport = 'mobile' | 'tablet' | 'desktop';

interface HtmlPreviewPanelProps {
    html: string;
    css?: string;
    isLoading: boolean;
    error: string | null;
    viewport: Viewport;
}

const DeviceFrame: React.FC<{ children: React.ReactNode, device: 'mobile' | 'tablet' }> = ({ children, device }) => {
    const frameClasses = {
        mobile: 'w-[395px] h-[797px] p-4 bg-black border-4 border-brand-border/80 rounded-[40px] shadow-2xl transition-all duration-300',
        tablet: 'w-[808px] h-[1064px] p-4 bg-black border-4 border-brand-border/80 rounded-[24px] shadow-2xl transition-all duration-300'
    };
    const screenClasses = 'bg-white w-full h-full rounded-[20px] overflow-y-auto overflow-x-hidden';

    return (
        <div className={frameClasses[device]}>
            <div className={screenClasses} id={`device-screen-${device}`}>
                {children}
            </div>
        </div>
    );
};


const HtmlPreviewPanel: React.FC<HtmlPreviewPanelProps> = ({ html, css, isLoading, error, viewport }) => {
    const { settings } = useAnimation();
    
    const getFullHtml = (bodyContent: string, cssContent?: string) => {
        // Detect if bodyContent is already a full HTML document
        const isFullHtml = /<html\s*|<!DOCTYPE\s*html/i.test(bodyContent);
        
        const animationStyles = `
            :root {
                --anim-duration-fade: ${settings.enabled ? (0.4 * (1.5 - settings.intensity * 0.5)) : 0}s;
                --anim-duration-slide: ${settings.enabled ? (0.5 * (1.5 - settings.intensity * 0.5)) : 0}s;
                --anim-pulse-duration: ${settings.enabled ? (1.5 * (1.5 - settings.intensity * 0.5)) : 0}s;
                --anim-intensity: ${settings.enabled ? settings.intensity : 0};
            }
            .animate-fade-in { animation: fadeIn var(--anim-duration-fade, 0.4s) ease-out forwards; }
            .animate-slide-up { animation: slideUp var(--anim-duration-slide, 0.5s) cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            .animate-pulse-fast { animation: pulse var(--anim-pulse-duration, 1.5s) cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(calc(10px * var(--anim-intensity, 1))); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `;

        if (isFullHtml) {
            // If it's a full document, we might still want to inject custom CSS if provided
            let finalHtml = bodyContent;
            const headEndIdx = finalHtml.toLowerCase().indexOf('</head>');
            if (headEndIdx !== -1) {
                finalHtml = finalHtml.slice(0, headEndIdx) + 
                       `<style>${animationStyles}${cssContent || ''}</style>` + 
                       finalHtml.slice(headEndIdx);
            }
            return finalHtml;
        }

        return `
            <!DOCTYPE html>
            <html lang="en" class="h-auto">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { 
                        -webkit-font-smoothing: antialiased; 
                        -moz-osx-font-smoothing: grayscale; 
                        margin: 0; 
                        padding: 0; 
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    ${animationStyles}
                    ${cssContent || ''}
                </style>
                <title>Preview</title>
            </head>
            <body class="bg-white">
                <div class="w-full flex-1 bg-white overflow-y-auto">
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
                    <div className="h-4 bg-slate-800 rounded w-1/3"></div>
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
                    srcDoc={getFullHtml(html, css)} 
                    title="HTML Preview" 
                    sandbox="allow-scripts allow-same-origin"
                    className="w-full h-full border-0 bg-white"
                />
            );
        }

        return (
            <div className="w-full h-full bg-brand-bg/60 border border-dashed border-brand-border/50 rounded-lg flex flex-col items-center justify-center text-brand-muted">
                <GlobeAltIcon className="w-16 h-16 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-slate-300">HTML Preview</h3>
                <p className="text-sm opacity-70">Your modified UI will be rendered here</p>
            </div>
        );
    }
    
    if (viewport === 'mobile' || viewport === 'tablet') {
         return <div className="transform scale-[0.6] sm:scale-75 origin-top"><DeviceFrame device={viewport}>{content()}</DeviceFrame></div>
    }
    
    return (
        <div className="w-full h-full rounded-lg overflow-auto shadow-lg bg-white">
            {content()}
        </div>
    );
};

export default HtmlPreviewPanel;