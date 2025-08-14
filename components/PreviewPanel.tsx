import React from 'react';
import { PhotoIcon } from './icons.tsx';

type Viewport = 'mobile' | 'tablet' | 'desktop';

interface PreviewPanelProps {
    imageUrl: string | null;
    isLoading: boolean;
    error: string | null;
    viewport: Viewport;
}

const DeviceFrame: React.FC<{ children: React.ReactNode, device: 'mobile' | 'tablet' }> = ({ children, device }) => {
    const frameClasses = {
        mobile: 'w-[395px] h-[797px] p-4 bg-gray-900 border-4 border-gray-700 rounded-[40px] shadow-2xl transition-all duration-300',
        tablet: 'w-[808px] h-[1064px] p-4 bg-gray-900 border-4 border-gray-700 rounded-[24px] shadow-2xl transition-all duration-300'
    };
    const screenClasses = 'bg-black w-full h-full rounded-[20px] overflow-hidden';

    return (
        <div className={frameClasses[device]}>
            <div className={screenClasses}>
                {children}
            </div>
        </div>
    );
};

const PreviewPanel: React.FC<PreviewPanelProps> = ({ imageUrl, isLoading, error, viewport }) => {
    
    const content = () => {
        if (isLoading) {
             return (
                <div className="w-full h-full bg-brand-surface border-2 border-dashed border-brand-border rounded-lg flex flex-col items-center justify-center animate-pulse-fast">
                    <PhotoIcon className="w-16 h-16 mb-4 text-brand-border" />
                    <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                </div>
            );
        }
        
        if (error) {
            return (
                <div className="w-full h-full bg-red-900/20 border-2 border-dashed border-red-500/50 rounded-lg flex flex-col items-center justify-center text-red-400 p-4">
                    <h3 className="text-lg font-semibold">Image Error</h3>
                    <p className="text-sm text-center">{error}</p>
                </div>
            );
        }

        if (imageUrl) {
            return (
                <img 
                    src={imageUrl} 
                    alt="AI Generated UI Preview" 
                    className="w-full h-full object-cover bg-brand-surface"
                />
            );
        }

        return (
            <div className="w-full h-full bg-brand-surface border-2 border-dashed border-brand-border rounded-lg flex flex-col items-center justify-center text-brand-muted">
                <PhotoIcon className="w-16 h-16 mb-4" />
                <h3 className="text-lg font-semibold">Image Preview</h3>
                <p className="text-sm">Will appear here after generation</p>
            </div>
        );
    };

    if (viewport === 'mobile' || viewport === 'tablet') {
        return <div className="transform scale-[0.6] sm:scale-75 origin-top"><DeviceFrame device={viewport}>{content()}</DeviceFrame></div>
    }
    
    return (
        <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
            {content()}
        </div>
    );
};

export default PreviewPanel;