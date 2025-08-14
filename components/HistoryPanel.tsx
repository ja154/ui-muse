
import React from 'react';
import { HistoryItem } from '../types.ts';
import { RestoreIcon, PhotoIcon, CodeBracketIcon } from './icons.tsx';

interface HistoryPanelProps {
    history: HistoryItem[];
    clearHistory: () => void;
    loadHistoryItem: (item: HistoryItem) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, clearHistory, loadHistoryItem }) => {
    
    const getBadge = (item: HistoryItem) => {
        switch(item.inputMode) {
            case 'modify': return <span className="bg-blue-900/70 text-blue-300">Remix</span>;
            default: return <span className="bg-purple-900/70 text-purple-300">Describe</span>;
        }
    }

    const getThumbnail = (item: HistoryItem) => {
        if(item.inputMode === 'modify') {
            return (
               <div className="w-20 h-20 rounded-md flex-shrink-0 bg-black/20 flex items-center justify-center border border-brand-border/50">
                   <CodeBracketIcon className="w-10 h-10 text-brand-border" />
               </div>
           );
       }

        const src = item.previewImage;
        if (src) {
            return <img src={src} alt="UI Preview Thumbnail" className="w-20 h-20 object-cover rounded-md flex-shrink-0 bg-black/20 border border-brand-border/50" />
        }
        
        return (
            <div className="w-20 h-20 rounded-md flex-shrink-0 bg-black/20 flex items-center justify-center border border-brand-border/50">
                <PhotoIcon className="w-10 h-10 text-brand-border" />
            </div>
        )
    }

    return (
        <div className="bg-brand-surface/70 backdrop-blur-md border border-brand-border/50 rounded-xl shadow-2xl shadow-black/20 p-6 relative group h-full">
            <div className="absolute -inset-px bg-gradient-to-r from-brand-primary/50 to-brand-secondary/50 rounded-xl blur-lg opacity-0 group-hover:opacity-70 transition-opacity duration-500 -z-10"></div>
            <div className="relative flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-100">History</h2>
                    <button
                        onClick={clearHistory}
                        className="px-4 py-2 text-sm font-medium text-brand-muted hover:text-white bg-black/20 border border-brand-border/80 rounded-md transition-colors hover:border-brand-primary/50"
                    >
                        Clear History
                    </button>
                </div>
                <div className="space-y-3 overflow-y-auto pr-2 -mr-2 flex-grow">
                    {history.map((item) => (
                        <div key={item.id} className="p-4 bg-black/20 rounded-lg border border-brand-border/80 flex gap-4 items-start transition-all duration-200 hover:bg-brand-primary/10 hover:border-brand-primary/50 transform hover:-translate-y-1">
                            {getThumbnail(item)}
                            <div className="flex-grow overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold text-gray-200 truncate" title={item.input || item.htmlInput}>
                                        {item.inputMode === 'description' ? (item.input || "Generated UI") : "HTML Remix"}
                                    </p>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full">
                                        {getBadge(item)}
                                    </span>
                                </div>
                                
                                <p className="text-xs text-brand-muted mb-2">
                                    {item.inputMode === 'description' ? `Style: ${item.style}` : `Cloned style applied`}
                                </p>
                                
                                <p className="text-xs text-gray-400 line-clamp-2" title={item.output || item.htmlInput}>
                                   {item.inputMode === 'description' ? (item.output || "No prompt generated") : (item.htmlInput || "No original HTML provided.")}
                                </p>
                            </div>
                            <button
                                onClick={() => loadHistoryItem(item)}
                                title="Restore this session"
                                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-700/80 hover:bg-gray-700 rounded-md transition-colors"
                            >
                                <RestoreIcon className="w-4 h-4"/>
                                Restore
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HistoryPanel;
