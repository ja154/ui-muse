import React from 'react';
import { SparkleIcon } from './icons.tsx';

const Header: React.FC = () => {
    return (
        <header className="p-4 sm:px-6 sm:py-4 border-b border-brand-border/50 bg-brand-surface/80 backdrop-blur-xl sticky top-0 z-20">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-brand-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                        <SparkleIcon className="w-6 h-6 text-slate-900" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">
                        Jenga<span className="text-brand-primary">UI</span>
                    </h1>
                </div>
                <div className="text-xs font-mono text-brand-primary uppercase tracking-widest bg-brand-primary/10 px-3 py-1.5 rounded-full border border-brand-primary/20">
                    AI-Powered UI Builder
                </div>
            </div>
        </header>
    );
};

export default Header;