import React from 'react';
import { HistoryItem } from '../types.ts';
import { RestoreIcon, PhotoIcon, CodeBracketIcon, GlobeAltIcon } from './icons.tsx';

interface HistoryPanelProps {
    history: HistoryItem[];
    clearHistory: () => void;
    loadHistoryItem: (item: HistoryItem) => void;
}

const modeLabel: Record<string, { label: string; color: string }> = {
    modify:        { label: 'Remix',    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
    clone:         { label: 'Clone',    color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
    blueprint:     { label: 'Blueprint',color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    design:        { label: 'Draw',     color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
    'design-system':{ label: 'System', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    description:   { label: 'Describe', color: 'text-white/40 bg-white/5 border-white/10' },
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, clearHistory, loadHistoryItem }) => {
    const getBadge = (item: HistoryItem) => {
        const m = modeLabel[item.inputMode] || modeLabel.description;
        return (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-widest uppercase border ${m.color}`}>
                {m.label}
            </span>
        );
    };

    const getThumbnail = (item: HistoryItem) => {
        if (item.previewImage) {
            return <img src={item.previewImage} alt="Preview" className="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-white/[0.08]" />;
        }
        const Icon = item.inputMode === 'clone' ? GlobeAltIcon : item.inputMode === 'modify' ? CodeBracketIcon : PhotoIcon;
        return (
            <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <Icon className="w-5 h-5 text-white/20" />
            </div>
        );
    };

    return (
        <div className="glass rounded-2xl p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-semibold text-white tracking-tight">History</h2>
                    <p className="text-[11px] text-white/25 mt-0.5">{history.length} generations saved</p>
                </div>
                <button onClick={clearHistory}
                    className="text-[11px] font-medium text-white/20 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-400/5">
                    Clear all
                </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
                {history.map(item => (
                    <div key={item.id}
                        onClick={() => loadHistoryItem(item)}
                        className="p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] flex gap-3 items-center hover:bg-white/[0.05] hover:border-white/[0.1] transition-all cursor-pointer group/item">
                        {getThumbnail(item)}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-xs font-medium text-white/70 truncate flex-1">
                                    {item.inputMode === 'clone' ? (item.urlInput || 'Web Clone') : (item.input || 'Generation')}
                                </p>
                                {getBadge(item)}
                            </div>
                            <p className="text-[10px] text-white/20 truncate">
                                {item.inputMode === 'description' ? `Style: ${item.style}` : 'Click to restore'}
                            </p>
                        </div>
                        <RestoreIcon className="w-3.5 h-3.5 text-white/15 group-hover/item:text-brand-primary transition-colors flex-shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryPanel;
