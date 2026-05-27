import React from 'react';
import { SparkleIcon } from './icons.tsx';
import AnimationSettings from './AnimationSettings.tsx';
import ThemeToggle from './ThemeToggle.tsx';

const Header: React.FC = () => {
    return (
        <header className="px-4 sm:px-6 py-4 border-b border-brand-border/80 bg-brand-surface/80 backdrop-blur-xl text-brand-text shrink-0 z-30 flex items-center justify-between">
            <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-brand-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                        <SparkleIcon className="w-6 h-6 text-brand-bg" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-brand-text">
                        UI <span className="text-brand-primary">Muse</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <AnimationSettings />
                    <div className="hidden sm:block text-xs font-mono text-brand-primary uppercase tracking-widest bg-brand-primary/10 px-3 py-1.5 rounded-full border border-brand-primary/20">
                        AI-Powered UI Builder
                    </div>
                </div>
        </header>
    );
};

export default Header;