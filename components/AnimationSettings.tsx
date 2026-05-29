
import React, { useState } from 'react';
import { useAnimation } from '../AnimationContext.tsx';

const AnimationSettings: React.FC = () => {
  const { settings, updateSettings } = useAnimation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Animation Settings"
        style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.12em',
          padding: '5px 10px',
          background: isOpen ? 'rgba(0,255,136,0.08)' : 'transparent',
          border: '1px solid var(--brand-border)',
          color: isOpen ? 'var(--brand-primary)' : 'var(--brand-text-dim)',
          cursor: 'pointer',
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <span className="hidden sm:inline">ANIM</span>
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 30 }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            width: 240,
            background: 'var(--brand-surface)',
            border: '1px solid var(--brand-border)',
            padding: '14px',
            zIndex: 40,
            boxShadow: '0 0 30px rgba(0,0,0,0.8)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              paddingBottom: 10,
              borderBottom: '1px solid var(--brand-border)',
            }}>
              <span style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '10px',
                color: 'var(--brand-primary)',
                letterSpacing: '0.2em',
              }}>
                ◈ ANIM_SETTINGS
              </span>
              <button
                onClick={() => updateSettings({ enabled: !settings.enabled })}
                style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  padding: '3px 8px',
                  background: settings.enabled ? 'rgba(0,255,136,0.12)' : 'rgba(255,45,107,0.12)',
                  border: settings.enabled
                    ? '1px solid rgba(0,255,136,0.4)'
                    : '1px solid rgba(255,45,107,0.4)',
                  color: settings.enabled ? 'var(--brand-primary)' : 'var(--brand-accent)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {settings.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Intensity */}
            <div style={{ opacity: settings.enabled ? 1 : 0.3, pointerEvents: settings.enabled ? 'auto' : 'none' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <span style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: '9px',
                  color: 'var(--brand-text-dim)',
                  letterSpacing: '0.15em',
                }}>
                  INTENSITY
                </span>
                <span style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: '9px',
                  color: 'var(--brand-primary)',
                  letterSpacing: '0.1em',
                }}>
                  {Math.round(settings.intensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.intensity}
                onChange={(e) => updateSettings({ intensity: parseFloat(e.target.value) })}
                style={{
                  width: '100%',
                  accentColor: 'var(--brand-primary)',
                  cursor: 'pointer',
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '8px',
                color: 'var(--brand-text-dim)',
                letterSpacing: '0.1em',
                marginTop: 4,
              }}>
                <span>NULL</span>
                <span>MAX</span>
              </div>
            </div>

            <div style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid var(--brand-border)',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '9px',
              color: 'var(--brand-text-dim)',
              lineHeight: 1.6,
              letterSpacing: '0.05em',
            }}>
              // controls transition speed of all UI elements
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnimationSettings;
