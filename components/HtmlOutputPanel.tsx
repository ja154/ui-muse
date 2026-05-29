
import React from 'react';

interface HtmlOutputPanelContentProps {
  html: string;
  isLoading: boolean;
  error: string | null;
}

const SkeletonLoader: React.FC = () => (
  <div style={{ padding: '16px', width: '100%' }}>
    {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
      <div
        key={i}
        style={{
          height: 12,
          marginBottom: 8,
          background: 'var(--brand-border)',
          width: `${60 + Math.random() * 40}%`,
          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes skeleton-pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.7; }
      }
    `}</style>
  </div>
);

const HtmlOutputPanelContent: React.FC<HtmlOutputPanelContentProps> = ({ html, isLoading, error }) => {
  if (isLoading) return <SkeletonLoader />;
  if (error) {
    return (
      <div style={{
        padding: 16,
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: '11px',
        color: 'var(--brand-accent)',
        letterSpacing: '0.05em',
        lineHeight: 1.6,
      }}>
        // ERROR: {error}
      </div>
    );
  }
  if (html) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Line number gutter header */}
        <div style={{
          padding: '6px 16px',
          borderBottom: '1px solid var(--brand-border)',
          background: 'rgba(0,10,5,0.5)',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '9px',
          color: 'var(--brand-text-dim)',
          letterSpacing: '0.2em',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>// HTML_OUTPUT</span>
          <span>{html.length.toLocaleString()} CHARS</span>
        </div>
        <pre style={{
          margin: 0,
          padding: '14px 16px',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '11px',
          lineHeight: 1.7,
          color: 'var(--brand-text)',
          background: 'transparent',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          letterSpacing: '0.02em',
          maxHeight: 500,
          overflowY: 'auto',
        }}>
          <code style={{ color: 'rgba(0,255,136,0.85)' }}>{html}</code>
        </pre>
      </div>
    );
  }
  return (
    <div style={{
      padding: 20,
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '11px',
      color: 'var(--brand-text-dim)',
      letterSpacing: '0.08em',
    }}>
      // AWAITING HTML OUTPUT...
    </div>
  );
};

export default HtmlOutputPanelContent;
