import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GlobeAltIcon } from './icons.tsx';

type Viewport = 'mobile' | 'tablet' | 'desktop';

interface HtmlPreviewPanelProps {
    html: string;
    css?: string;
    isLoading: boolean;
    error: string | null;
    viewport: Viewport;
}

const isFullHtmlDocument = (html: string): boolean => {
    const trimmed = html.trimStart().toLowerCase();
    return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
};

const SCROLL_OVERRIDE_CSS = `
<style id="__jenga_scroll_fix__">
  html { height: auto !important; min-height: 100% !important; overflow-x: hidden !important; overflow-y: visible !important; }
  body { height: auto !important; min-height: 100% !important; overflow-x: hidden !important; overflow-y: visible !important; }
</style>`;

const HEIGHT_REPORTER_SCRIPT = `
<script id="__jenga_height_reporter__">
  function reportHeight() {
    var h = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    parent.postMessage({ type: 'iframeHeight', height: h }, '*');
  }
  window.addEventListener('load', function() {
    reportHeight();
    setTimeout(reportHeight, 300);
    setTimeout(reportHeight, 1000);
    var ro = new ResizeObserver(reportHeight);
    ro.observe(document.body);
    ro.observe(document.documentElement);
  });
  document.addEventListener('DOMContentLoaded', reportHeight);
<\/script>`;

const injectIntoHead = (html: string, injections: string): string => {
    const headCloseIdx = html.search(/<\/head\s*>/i);
    if (headCloseIdx !== -1) {
        return html.slice(0, headCloseIdx) + injections + html.slice(headCloseIdx);
    }
    const htmlOpenIdx = html.search(/<html[^>]*>/i);
    if (htmlOpenIdx !== -1) {
        const afterHtml = html.indexOf('>', htmlOpenIdx) + 1;
        return html.slice(0, afterHtml) + '<head>' + injections + '</head>' + html.slice(afterHtml);
    }
    return injections + html;
};

const getSrcDoc = (html: string, css?: string): string => {
    const injections = SCROLL_OVERRIDE_CSS + HEIGHT_REPORTER_SCRIPT;

    if (isFullHtmlDocument(html)) {
        let doc = html;
        if (css && css.trim()) {
            doc = injectIntoHead(doc, `<style>${css}</style>`);
        }
        return injectIntoHead(doc, injections);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"><\/script>
    ${SCROLL_OVERRIDE_CSS}
    <style>
        body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; background: white; margin: 0; padding: 0; }
        ${css || ''}
    </style>
    ${HEIGHT_REPORTER_SCRIPT}
    <title>Preview</title>
</head>
<body>
    ${html}
</body>
</html>`;
};

const DeviceFrame: React.FC<{ children: React.ReactNode; device: 'mobile' | 'tablet' }> = ({ children, device }) => {
    const frameClasses = {
        mobile: 'w-[395px] h-[797px] p-4 bg-black border-4 border-brand-border/80 rounded-[40px] shadow-2xl transition-all duration-300',
        tablet: 'w-[808px] h-[1064px] p-4 bg-black border-4 border-brand-border/80 rounded-[24px] shadow-2xl transition-all duration-300',
    };
    return (
        <div className={frameClasses[device]}>
            <div className="bg-white w-full h-full rounded-[20px] overflow-auto">
                {children}
            </div>
        </div>
    );
};

const MIN_IFRAME_HEIGHT = 600;

const HtmlPreviewPanel: React.FC<HtmlPreviewPanelProps> = ({ html, css, isLoading, error, viewport }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeHeight, setIframeHeight] = useState(MIN_IFRAME_HEIGHT);

    const handleMessage = useCallback((e: MessageEvent) => {
        if (e.data && e.data.type === 'iframeHeight' && typeof e.data.height === 'number') {
            const h = Math.max(e.data.height, MIN_IFRAME_HEIGHT);
            setIframeHeight(h);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleMessage]);

    useEffect(() => {
        setIframeHeight(MIN_IFRAME_HEIGHT);
    }, [html]);

    const handleIframeLoad = () => {
        try {
            const iframe = iframeRef.current;
            if (!iframe) return;
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc) {
                const h = Math.max(
                    doc.body?.scrollHeight || 0,
                    doc.body?.offsetHeight || 0,
                    doc.documentElement?.scrollHeight || 0,
                    doc.documentElement?.offsetHeight || 0,
                    MIN_IFRAME_HEIGHT
                );
                setIframeHeight(h);
            }
        } catch {
            // cross-origin fallback — postMessage handles it
        }
    };

    if (isLoading) {
        return (
            <div className="w-full min-h-[600px] bg-brand-surface border-2 border-dashed border-brand-border rounded-lg flex flex-col items-center justify-center animate-pulse-fast">
                <GlobeAltIcon className="w-16 h-16 mb-4 text-brand-border" />
                <div className="h-4 bg-slate-800 rounded w-1/3 mt-2"></div>
                <div className="h-3 bg-slate-800 rounded w-1/4 mt-2"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full min-h-[600px] bg-red-900/20 border-2 border-dashed border-red-500/50 rounded-lg flex flex-col items-center justify-center text-red-400 p-4">
                <h3 className="text-lg font-semibold">Error</h3>
                <p className="text-sm text-center mt-2">{error}</p>
            </div>
        );
    }

    if (!html) {
        return (
            <div className="w-full min-h-[600px] bg-brand-bg/60 border border-dashed border-brand-border/50 rounded-lg flex flex-col items-center justify-center text-brand-muted">
                <GlobeAltIcon className="w-16 h-16 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-slate-300">HTML Preview</h3>
                <p className="text-sm opacity-70">Your generated UI will appear here</p>
            </div>
        );
    }

    const iframeEl = (
        <iframe
            ref={iframeRef}
            key={html.slice(0, 100)}
            srcDoc={getSrcDoc(html, css)}
            title="HTML Preview"
            sandbox="allow-scripts allow-same-origin"
            onLoad={handleIframeLoad}
            style={{
                width: '100%',
                height: `${iframeHeight}px`,
                border: 'none',
                display: 'block',
                background: 'white',
                overflow: 'hidden',
            }}
        />
    );

    if (viewport === 'mobile' || viewport === 'tablet') {
        return (
            <div className="transform scale-[0.6] sm:scale-75 origin-top">
                <DeviceFrame device={viewport}>{iframeEl}</DeviceFrame>
            </div>
        );
    }

    return (
        <div className="w-full rounded-lg shadow-lg bg-white overflow-hidden">
            {iframeEl}
        </div>
    );
};

export default HtmlPreviewPanel;
