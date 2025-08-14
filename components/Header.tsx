import React from 'react';
import { SparkleIcon } from './icons.tsx';

const Header: React.FC = () => {
    return (
        <header className="p-4 sm:p-6 border-b border-brand-border/50 bg-brand-surface/50 backdrop-blur-lg sticky top-0 z-20 shadow-lg shadow-brand-glow">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,242,234,0.4)]">
                        <SparkleIcon className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400" style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.1)' }}>
                        JengaUI
                    </h1>
                </div>
                 <a href="https://github.com/google/generative-ai-docs/tree/main/app-development" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-muted hover:text-white transition-colors px-4 py-2 rounded-md bg-brand-surface/50 border border-brand-border/50 hover:border-brand-primary/70">
                    Built with Gemini
                </a>
            </div>
        </header>
    );
};

export default Header;