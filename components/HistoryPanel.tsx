
import React from 'react';
import { HistoryItem } from '../types.ts';
import { RestoreIcon, PhotoIcon, CodeBracketIcon, GlobeAltIcon } from './icons.tsx';

interface HistoryPanelProps {
  history: HistoryItem[];
  clearHistory: () => void;
  loadHistoryItem: (item: HistoryItem) => void;
}

const BADGE_MAP: Record<string, string> = {
  modify: 'RMX',
  clone: 'CLN',
  blueprint: 'BLP',
  design: 'DRW',
  inspect: 'AUD',
  'design-system': 'SYS',
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, clearHistory, loadHistoryItem }) => {
  return (
    <div style={{
      background: 'var(--brand-surface)',
      border: '1px solid var(--brand-border)',
      height: '100%',
      position: 'relative',
    }}>
      {/* Corner accent */}
      <div style={{
        position: 'absolute',
        top: -1, left: -1,
        width: 10, height: 10,
        borderTop: '1px solid var(--brand-primary)',
        borderLeft: '1px solid var(--brand-primary)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -1, right: -1,
        width: 10, height: 10,
        borderBottom: '1px solid var(--brand-primary)',
        borderRight: '1px solid var(--brand-primary)',
      }} />

      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--brand-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,10,5,0.5)',
      }}>
        <span style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '10px',
          color: 'var(--brand-primary)',
          letterSpacing: '0.25em',
        }}>
          ◈ SESSION_LOG
        </span>
        <button
          onClick={clearHistory}
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '9px',
            letterSpacing: '0.12em',
            padding: '3px 8px',
            background: 'rgba(255,45,107,0.07)',
            border: '1px solid rgba(255,45,107,0.25)',
            color: 'rgba(255,45,107,0.7)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          PURGE_ALL
        </button>
      </div>

      {/* Items */}
      <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 400 }}>
        {history.map((item, idx) => {
          const badge = BADGE_MAP[item.inputMode] || 'DSC';
          const isImg = !!item.previewImage && item.inputMode !== 'modify' && item.inputMode !== 'clone';

          return (
            <div
              key={item.id}
              onClick={() => loadHistoryItem(item)}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--brand-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: 'transparent',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,255,136,0.04)';
                (e.currentTarget as HTMLDivElement).style.borderLeft = '2px solid var(--brand-primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                (e.currentTarget as HTMLDivElement).style.borderLeft = '';
              }}
            >
              {/* Index */}
              <span style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '9px',
                color: 'var(--brand-text-dim)',
                minWidth: 20,
                letterSpacing: '0.05em',
              }}>
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* Thumbnail or icon */}
              <div style={{
                width: 40,
                height: 40,
                flexShrink: 0,
                border: '1px solid var(--brand-border)',
                overflow: 'hidden',
                background: 'rgba(0,10,5,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {isImg ? (
                  <img
                    src={item.previewImage!}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : item.inputMode === 'modify' ? (
                  <CodeBracketIcon style={{ width: 16, height: 16, color: 'var(--brand-text-dim)' }} />
                ) : item.inputMode === 'clone' ? (
                  <GlobeAltIcon style={{ width: 16, height: 16, color: 'var(--brand-text-dim)' }} />
                ) : (
                  <PhotoIcon style={{ width: 16, height: 16, color: 'var(--brand-text-dim)' }} />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: '10px',
                  color: 'var(--brand-text)',
                  letterSpacing: '0.05em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: 3,
                }}>
                  {(item.inputMode === 'clone' ? item.urlInput : item.input) || 'UNTITLED_PROJECT'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: '8px',
                    color: 'var(--brand-bg)',
                    background: 'var(--brand-primary)',
                    padding: '1px 5px',
                    letterSpacing: '0.1em',
                  }}>
                    {badge}
                  </span>
                  {item.style && (
                    <span style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: '8px',
                      color: 'var(--brand-text-dim)',
                      letterSpacing: '0.08em',
                    }}>
                      {item.style.toUpperCase().slice(0, 12)}
                    </span>
                  )}
                </div>
              </div>

              {/* Restore icon */}
              <RestoreIcon style={{ width: 12, height: 12, color: 'var(--brand-text-dim)', flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryPanel;
