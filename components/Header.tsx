
import React from 'react';
import { SparkleIcon } from './icons.tsx';

const Header: React.FC = () => {
    return (
        <header className="p-4 sm:p-6 border-b border-brand-border bg-brand-surface/30 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-lg flex items-center justify-center">
                        <SparkleIcon className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        UI Muse
                    </h1>
                </div>
                 <a href="https://github.com/google/generative-ai-docs/tree/main/app-development" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-muted hover:text-white transition-colors">
                    Built with Gemini
                </a>
            </div>
        </header>
    );
};

export default Header;