import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="sticky top-0 z-20 border-b border-white/[0.06]"
            style={{ background: 'rgba(4,2,15,0.7)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 flex-shrink-0">
                        <div className="absolute inset-0 rounded-xl bg-cta-gradient opacity-90"></div>
                        <div className="absolute inset-0 rounded-xl flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                <path d="M2 17l10 5 10-5"/>
                                <path d="M2 12l10 5 10-5"/>
                            </svg>
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-cta-gradient opacity-40 blur-md -z-10"></div>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-lg font-semibold tracking-tight text-white">Jenga</span>
                        <span className="text-lg font-semibold tracking-tight" style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>UI</span>
                    </div>
                </div>

                {/* Center — tagline */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-white/30 font-mono tracking-wider">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                    AI-Powered · UI Builder
                </div>

                {/* Right — badge */}
                <div className="flex items-center gap-2">
                    <span className="hidden md:block text-[10px] font-mono text-white/20 uppercase tracking-widest border border-white/[0.06] rounded-md px-2 py-1">
                        v0.1 beta
                    </span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/[0.08] bg-white/[0.04] cursor-pointer hover:bg-white/[0.08] transition-colors" title="Settings">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                            <path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>
                        </svg>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
