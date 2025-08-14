
import React from 'react';
import { PhotoIcon } from './icons.tsx';

interface PreviewPanelContentProps {
    imageUrl: string | null;
    isLoading: boolean;
    error: string | null;
}

const PreviewPanelContent: React.FC<PreviewPanelContentProps> = ({ imageUrl, isLoading, error }) => {
    
    const renderContent = () => {
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
                    className="w-full h-full object-cover rounded-lg bg-brand-surface"
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
    }
    
    return (
        <div className="aspect-video w-full">
            {renderContent()}
        </div>
    );
};

export default PreviewPanelContent;