
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
            case 'modify': return <span className="bg-blue-900 text-blue-300">Remix</span>;
            default: return <span className="bg-purple-900 text-purple-300">Describe</span>;
        }
    }

    const getThumbnail = (item: HistoryItem) => {
        if(item.inputMode === 'modify') {
            return (
               <div className="w-20 h-20 rounded-md flex-shrink-0 bg-gray-800 flex items-center justify-center">
                   <CodeBracketIcon className="w-10 h-10 text-brand-border" />
               </div>
           );
       }

        const src = item.previewImage;
        if (src) {
            return <img src={src} alt="UI Preview Thumbnail" className="w-20 h-20 object-cover rounded-md flex-shrink-0 bg-gray-800" />
        }
        
        // Fallback icon if no image is available
        return (
            <div className="w-20 h-20 rounded-md flex-shrink-0 bg-gray-800 flex items-center justify-center">
                <PhotoIcon className="w-10 h-10 text-brand-border" />
            </div>
        )
    }

    return (
        <div className="mt-4 md:mt-0">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-200">History</h2>
                <button
                    onClick={clearHistory}
                    className="px-4 py-2 text-sm font-medium text-brand-muted hover:text-white bg-brand-surface border border-brand-border rounded-md transition-colors"
                >
                    Clear History
                </button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {history.map((item) => (
                    <div key={item.id} className="p-4 bg-brand-surface rounded-lg border border-brand-border flex gap-4 items-start transition-colors hover:bg-gray-800/50">
                        {getThumbnail(item)}
                        <div className="flex-grow overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-gray-300 truncate" title={item.input || item.htmlInput}>
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
                            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                        >
                            <RestoreIcon className="w-4 h-4"/>
                            Restore
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryPanel;
