import React from 'react';
import { SparkleIcon } from './icons.tsx';

const Header: React.FC = () => {
    return (
        <header className="p-4 sm:px-6 sm:py-4 border-b border-brand-border/50 bg-brand-surface/80 backdrop-blur-xl sticky top-0 z-20">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-brand-primary rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        <SparkleIcon className="w-6 h-6 text-black" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-brand-primary">
                        JengaUI
                    </h1>
                </div>
                <div className="text-xs font-mono text-brand-muted uppercase tracking-widest">
                    AI-Powered UI Builder
                </div>
            </div>
        </header>
    );
};

export default Header;