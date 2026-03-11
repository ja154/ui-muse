
import React from 'react';
import { HistoryItem } from '../types.ts';
import { RestoreIcon, PhotoIcon, CodeBracketIcon, GlobeAltIcon } from './icons.tsx';

interface HistoryPanelProps {
    history: HistoryItem[];
    clearHistory: () => void;
    loadHistoryItem: (item: HistoryItem) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, clearHistory, loadHistoryItem }) => {
    
    const getBadge = (item: HistoryItem) => {
        switch(item.inputMode) {
            case 'modify': return <span className="bg-white/5 text-white border border-white/10 text-[9px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase">REMIX</span>;
            case 'clone': return <span className="bg-white/5 text-white border border-white/10 text-[9px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase">CLONE</span>;
            case 'blueprint': return <span className="bg-white/5 text-white border border-white/10 text-[9px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase">BLUEPRINT</span>;
            default: return <span className="bg-white/5 text-white border border-white/10 text-[9px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase">DESCRIBE</span>;
        }
    }

    const getThumbnail = (item: HistoryItem) => {
        if(item.inputMode === 'modify') {
            return (
               <div className="w-16 h-16 rounded flex-shrink-0 bg-black/20 flex items-center justify-center border border-brand-border/50">
                   <CodeBracketIcon className="w-8 h-8 text-brand-border" />
               </div>
           );
       }
       if(item.inputMode === 'clone') {
            return (
               <div className="w-16 h-16 rounded flex-shrink-0 bg-black/20 flex items-center justify-center border border-brand-border/50">
                   <GlobeAltIcon className="w-8 h-8 text-brand-border" />
               </div>
           );
       }

        const src = item.previewImage;
        if (src) {
            return <img src={src} alt="UI Preview" className="w-16 h-16 object-cover rounded flex-shrink-0 bg-black/20 border border-brand-border/50" />
        }
        
        return (
            <div className="w-16 h-16 rounded flex-shrink-0 bg-black/20 flex items-center justify-center border border-brand-border/50">
                <PhotoIcon className="w-8 h-8 text-brand-border" />
            </div>
        )
    }

    return (
        <div className="bg-brand-surface/70 backdrop-blur-md border border-brand-border/50 rounded-xl shadow-2xl p-6 relative group h-full">
            <div className="absolute -inset-px bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
            <div className="relative flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-100 font-mono tracking-tighter">HISTORY</h2>
                    <button onClick={clearHistory} className="text-sm font-medium text-brand-muted hover:text-white transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/5">Clear</button>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 scrollbar-hide">
                    {history.map((item) => (
                        <div key={item.id} className="p-4 bg-brand-bg/60 rounded-xl border border-brand-border/50 flex gap-4 items-center hover:bg-white/5 transition-colors cursor-pointer group/item" onClick={() => loadHistoryItem(item)}>
                            {getThumbnail(item)}
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-xs font-bold text-slate-200 truncate">{item.inputMode === 'clone' ? (item.urlInput || 'Web Clone') : (item.input || 'New Project')}</p>
                                    {getBadge(item)}
                                </div>
                                <p className="text-[10px] text-brand-muted truncate">
                                    {item.inputMode === 'description' ? `Style: ${item.style}` : 'Tailwind Blueprint'}
                                </p>
                            </div>
                            <RestoreIcon className="w-4 h-4 text-brand-muted group-hover/item:text-brand-primary transition-colors flex-shrink-0" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HistoryPanel;
