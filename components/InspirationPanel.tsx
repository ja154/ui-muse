import React from 'react';
import { InspirationLink } from '../types.ts';
import { LinkIcon } from './icons.tsx';

interface InspirationPanelProps {
    links: InspirationLink[];
    isLoading: boolean;
    error: string | null;
}

const SkeletonLoader: React.FC = () => (
    <div className="space-y-3 animate-pulse-fast">
        {[...Array(3)].map((_, i) => (
             <div key={i} className="h-10 bg-gray-700 rounded-md w-full"></div>
        ))}
    </div>
);


const InspirationPanel: React.FC<InspirationPanelProps> = ({ links, isLoading, error }) => {

    const renderContent = () => {
        if (isLoading) {
            return <SkeletonLoader />;
        }

        if (error) {
            return <p className="text-red-400 font-medium">{error}</p>;
        }

        if (links.length > 0) {
            return (
                 <div className="space-y-3">
                    {links.map((link, index) => (
                        <a 
                            href={link.uri} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            key={index}
                            className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/80 border border-transparent hover:border-brand-primary/50 rounded-lg transition-all duration-200"
                        >
                            <div className="flex-grow text-gray-300 text-sm truncate" title={link.title}>{link.title}</div>
                            <LinkIcon className="w-4 h-4 flex-shrink-0 text-brand-muted" />
                        </a>
                    ))}
                </div>
            );
        }
        
        // Show placeholder only if not loading and no links/errors
        if (!isLoading && links.length === 0 && !error) {
            return <p className="text-brand-muted text-sm mt-4">Inspirational designs will appear here...</p>
        }

        return null;
    };


    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-200 mb-4">Inspiration</h2>
            <div className="p-4 bg-brand-surface rounded-xl border border-brand-border shadow-lg min-h-[200px]">
                {renderContent()}
            </div>
        </div>
    );
};

export default InspirationPanel;
