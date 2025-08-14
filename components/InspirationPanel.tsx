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
             <div key={i} className="h-10 bg-gray-700/50 rounded-md w-full"></div>
        ))}
    </div>
);


const InspirationPanel: React.FC<InspirationPanelProps> = ({ links, isLoading, error }) => {
    return (
        <div className="bg-brand-surface/70 backdrop-blur-md border border-brand-border/50 rounded-xl shadow-2xl shadow-black/20 p-6 relative group">
            <div className="absolute -inset-px bg-gradient-to-r from-brand-primary/50 to-brand-secondary/50 rounded-xl blur-lg opacity-0 group-hover:opacity-70 transition-opacity duration-500 -z-10"></div>
            <div className="relative">
                <h2 className="text-2xl font-bold text-gray-100 mb-4">Inspiration</h2>
                <div className="min-h-[164px]">
                    {isLoading ? (
                        <SkeletonLoader />
                    ) : error ? (
                        <p className="text-red-400 font-medium">{error}</p>
                    ) : links.length > 0 ? (
                        <div className="space-y-3">
                            {links.map((link, index) => (
                                <a 
                                    href={link.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    key={index}
                                    className="flex items-center gap-3 p-3 bg-black/20 hover:bg-brand-primary/10 border border-brand-border/80 hover:border-brand-primary/50 rounded-lg transition-all duration-200 transform hover:-translate-y-1"
                                >
                                    <div className="flex-grow text-gray-300 text-sm truncate" title={link.title}>{link.title}</div>
                                    <LinkIcon className="w-4 h-4 flex-shrink-0 text-brand-muted" />
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p className="text-brand-muted text-sm mt-4">Inspirational designs will appear here...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InspirationPanel;