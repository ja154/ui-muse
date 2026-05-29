import React, { useState, useEffect } from 'react';
import AnimationSettings from './AnimationSettings.tsx';

// Inline minimal ThemeToggle — cyberpunk is always dark, but keep the toggle functional
const ThemeToggle: React.FC = () => {
  return (
    <button
      title="Theme locked: GHOST_OS DARK"
      className="px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase border border-brand-border text-brand-text-dim hover:border-brand-primary hover:text-brand-primary transition-all duration-200"
      style={{ fontFamily: 'Share Tech Mono, monospace' }}
    >
      <span className="status-online mr-2" />
      DARK_CORE
    </button>
  );
};

const Header: React.FC = () => {
  const [tick, setTick] = useState(0);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${h}:${m}:${s}`);
      setTick(t => t + 1);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="shrink-0 z-30 flex items-center justify-between"
      style={{
        background: 'linear-gradient(180deg, rgba(4,15,8,0.98) 0%, rgba(2,10,6,0.95) 100%)',
        borderBottom: '1px solid var(--brand-border)',
        boxShadow: '0 1px 0 rgba(0,255,136,0.08)',
        padding: '0 24px',
        height: '56px',
      }}
    >
      {/* LEFT: Brand */}
      <div className="flex items-center gap-5">
        {/* Logo mark */}
        <div className="relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
          {/* Outer ring */}
          <div style={{
            position: 'absolute', inset: 0,
            border: '1px solid rgba(0,255,136,0.3)',
            transform: 'rotate(45deg)',
          }} />
          {/* Inner fill */}
          <div style={{
            position: 'absolute', inset: 4,
            background: 'rgba(0,255,136,0.08)',
            border: '1px solid rgba(0,255,136,0.5)',
            transform: 'rotate(45deg)',
          }} />
          {/* Icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 1 }}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="var(--brand-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Title */}
        <div className="flex flex-col" style={{ lineHeight: 1 }}>
          <div className="flex items-baseline gap-2">
            <span
              className="glow-text"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.12em',
              }}
            >
              UI_MUSE
            </span>
            <span style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '9px',
              color: 'var(--brand-text-dim)',
              letterSpacing: '0.08em',
              paddingLeft: '4px',
              borderLeft: '1px solid var(--brand-border)',
            }}>
              v2.0.1
            </span>
          </div>
          <span style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '9px',
            color: 'var(--brand-text-dim)',
            letterSpacing: '0.2em',
            marginTop: '3px',
          }}>
            AI_POWERED_UI_BUILDER
          </span>
        </div>

        {/* Vertical separator */}
        <div style={{ width: 1, height: 28, background: 'var(--brand-border)' }} />

        {/* System status */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="status-online" />
            <span style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '10px',
              color: 'var(--brand-primary)',
              letterSpacing: '0.1em',
            }}>
              SYS_ONLINE
            </span>
          </div>
          <div style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '10px',
            color: 'var(--brand-text-dim)',
            letterSpacing: '0.08em',
          }}>
            GEMINI_3.1_PRO
          </div>
        </div>
      </div>

      {/* RIGHT: Controls */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1"
          style={{
            border: '1px solid var(--brand-border)',
            background: 'rgba(0,255,136,0.03)',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--brand-text-dim)" strokeWidth="1.5"/>
            <polyline points="12 6 12 12 16 14" stroke="var(--brand-primary)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '11px',
            color: 'var(--brand-primary)',
            letterSpacing: '0.15em',
          }}>
            {timeStr}
          </span>
        </div>

        <AnimationSettings />

        {/* Build badge */}
        <div className="hidden sm:flex items-center"
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '10px',
            letterSpacing: '0.15em',
            color: 'var(--brand-bg)',
            background: 'var(--brand-primary)',
            padding: '5px 12px',
            fontWeight: 700,
          }}
        >
          [ AI-POWERED ]
        </div>
      </div>
    </header>
  );
};

export default Header;
