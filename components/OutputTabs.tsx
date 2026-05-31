import React, { useState, useEffect } from 'react';
import PreviewPanel from './PreviewPanel.tsx';
import OutputPanelContent from './OutputPanel.tsx';
import HtmlOutputPanelContent from './HtmlOutputPanel.tsx';
import CssOutputPanelContent from './CssOutputPanel.tsx';
import HtmlPreviewPanel from './HtmlPreviewPanel.tsx';
import BlueprintWireframe from './BlueprintWireframe.tsx';
import AnalysisReport from './AnalysisReport.tsx';
import {
  PhotoIcon,
  SparkleIcon,
  CodeBracketIcon,
  CopyIcon,
  CheckIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ComputerDesktopIcon,
  ArrowTopRightOnSquareIcon,
  LinkIcon,
  SearchIcon,
} from './icons.tsx';
import { InputMode, GroundingSource, AnalysisResult } from '../types.ts';

type Tab = 'preview' | 'prompt' | 'code' | 'css' | 'blueprint' | 'analysis';
type Viewport = 'mobile' | 'tablet' | 'desktop';

interface OutputTabsProps {
  previewImage: string | null;
  generatedPrompt: string;
  htmlOutput: string;
  cssOutput?: string;
  analysisResult?: AnalysisResult | null;
  groundingSources?: GroundingSource[];
  isLoading: boolean;
  errors: { prompt?: string; image?: string; html?: string; css?: string };
  inputMode: InputMode;
}

const GroundingSources: React.FC<{ sources: GroundingSource[] }> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;
  return (
    <div style={{
      marginTop: 16,
      padding: '10px 14px',
      background: 'rgba(0,10,5,0.6)',
      border: '1px solid var(--brand-border)',
    }}>
      <div style={{
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: '12px',
        letterSpacing: '0.2em',
        marginBottom: 8,
      }}>
        ◈ GROUNDING_SOURCES
      </div>
      {sources.map((s, i) => s.web && (
        <a
          key={i}
          href={s.web.uri}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '13px',
            textDecoration: 'none',
            marginBottom: 4,
            letterSpacing: '0.03em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          &gt; {s.web.title || s.web.uri}
        </a>
      ))}
    </div>
  );
};

const OutputTabs: React.FC<OutputTabsProps> = ({
  previewImage, generatedPrompt, htmlOutput, cssOutput,
  analysisResult, groundingSources = [], isLoading, errors, inputMode,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [copiedStates, setCopiedStates] = useState({ prompt: false, code: false, css: false });
  const [viewport, setViewport] = useState<Viewport>('desktop');

  const isModifyOrClone = inputMode === 'modify' || inputMode === 'clone' || inputMode === 'design';

  useEffect(() => {
    if (inputMode === 'inspect' && analysisResult) setActiveTab('analysis');
  }, [inputMode, analysisResult]);

  useEffect(() => {
    if (isModifyOrClone && activeTab === 'prompt') setActiveTab('preview');
  }, [inputMode, activeTab, isModifyOrClone]);

  useEffect(() => {
    if (isLoading) setActiveTab('preview');
  }, [isLoading]);

  const handleCopy = (type: 'prompt' | 'code' | 'css') => {
    const textMap = { prompt: generatedPrompt, code: htmlOutput, css: cssOutput || '' };
    const text = textMap[type];
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [type]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [type]: false })), 2000);
    }
  };

  const handleOpenInNewTab = () => {
    if (!htmlOutput) return;
    const isFullHtml = /<html\s*|<!DOCTYPE\s*html/i.test(htmlOutput);
    let fullHtml = htmlOutput;
    if (!isFullHtml) {
      fullHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><style>body{-webkit-font-smoothing:antialiased;margin:0;}${cssOutput || ''}</style></head><body>${htmlOutput}</body></html>`;
    }
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const tabsConfig: { id: Tab; label: string; shortLabel: string }[] = [];

  if (inputMode === 'inspect') {
    tabsConfig.push(
      { id: 'analysis', label: 'AUDIT_REPORT', shortLabel: 'AUD' },
      { id: 'preview', label: 'HTML_VIEW', shortLabel: 'PRV' },
      { id: 'code', label: 'RAW_HTML', shortLabel: 'HTM' },
    );
  } else if (isModifyOrClone) {
    tabsConfig.push(
      { id: 'preview', label: 'PREVIEW', shortLabel: 'PRV' },
    );
    if (inputMode !== 'design') {
      tabsConfig.push({ id: 'blueprint', label: 'BLUEPRINT', shortLabel: 'BLP' });
    }
    tabsConfig.push(
      { id: 'code', label: 'HTML_SRC', shortLabel: 'HTM' },
      { id: 'css', label: 'CSS_SRC', shortLabel: 'CSS' },
    );
  } else {
    tabsConfig.push(
      { id: 'preview', label: 'PREVIEW', shortLabel: 'PRV' },
      { id: 'blueprint', label: 'BLUEPRINT', shortLabel: 'BLP' },
      { id: 'prompt', label: 'PROMPT', shortLabel: 'PRM' },
      { id: 'code', label: 'HTML_SRC', shortLabel: 'HTM' },
      { id: 'css', label: 'CSS_SRC', shortLabel: 'CSS' },
    );
  }

  const PreviewComponent = (inputMode === 'clone' || inputMode === 'modify') || htmlOutput ? (
    <HtmlPreviewPanel
      html={htmlOutput}
      css={cssOutput}
      isLoading={isLoading && !htmlOutput}
      error={errors.html || null}
      viewport={viewport}
    />
  ) : (
    <PreviewPanel
      imageUrl={previewImage}
      isLoading={isLoading && !previewImage}
      error={errors.image || null}
      viewport={viewport}
    />
  );

  // Viewport shortlabels
  const VIEWPORT_OPTIONS: { key: Viewport; icon: React.ReactNode; label: string }[] = [
    { key: 'mobile', icon: <DevicePhoneMobileIcon className="w-4 h-4" />, label: 'MOB' },
    { key: 'tablet', icon: <DeviceTabletIcon className="w-4 h-4" />, label: 'TAB' },
    { key: 'desktop', icon: <ComputerDesktopIcon className="w-4 h-4" />, label: 'DSK' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--brand-bg)' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: '1px solid var(--brand-border)',
        background: 'rgba(4,15,8,0.95)',
        minHeight: 48,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        {/* Output module label */}
        <div style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '13px',
        }}
          className="lg:block"
        >
          ◈ OUTPUT
        </div>

        {/* Tabs */}
        <div className="flex items-center overflow-x-auto scrollbar-hide flex-1">
          {tabsConfig.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: '13px',
                  height: 48,
                  whiteSpace: 'nowrap',
                  background: active ? 'rgba(0,255,136,0.07)' : 'transparent',
                  color: active ? 'var(--brand-primary)' : 'var(--brand-text-dim)',
                  borderBottom: active ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  borderRight: '1px solid rgba(0,255,136,0.06)',
                  textShadow: active ? '0 0 8px rgba(0,255,136,0.5)' : 'none',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'preview' && !isLoading && htmlOutput && (
            <>
              {/* Viewport toggles */}
              <div style={{
                display: 'flex',
                border: '1px solid var(--brand-border)',
                background: 'rgba(0,10,5,0.5)',
              }}>
                {VIEWPORT_OPTIONS.map(vp => (
                  <button
                    key={vp.key}
                    onClick={() => setViewport(vp.key)}
                    title={vp.key}
                    style={{
                      width: 36,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: viewport === vp.key ? 'rgba(0,255,136,0.12)' : 'transparent',
                      color: viewport === vp.key ? 'var(--brand-primary)' : 'var(--brand-text-dim)',
                      borderRight: '1px solid var(--brand-border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {vp.icon}
                  </button>
                ))}
              </div>

              {/* Open in new tab */}
              <button
                onClick={handleOpenInNewTab}
                title="Open in new tab"
                style={{
                  width: 32,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,10,5,0.5)',
                  border: '1px solid var(--brand-border)',
                  color: 'var(--brand-text-dim)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </button>
            </>
          )}

          {(activeTab === 'code' || activeTab === 'css' || activeTab === 'prompt') && (
            <button
              onClick={() => handleCopy(activeTab as any)}
              style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '12px',
                background: copiedStates[activeTab as 'prompt' | 'code' | 'css']
                  ? 'rgba(0,255,136,0.15)'
                  : 'rgba(0,10,5,0.5)',
                border: copiedStates[activeTab as 'prompt' | 'code' | 'css']
                  ? '1px solid var(--brand-primary)'
                  : '1px solid var(--brand-border)',
                color: copiedStates[activeTab as 'prompt' | 'code' | 'css']
                  ? 'var(--brand-primary)'
                  : 'var(--brand-text-dim)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {copiedStates[activeTab as 'prompt' | 'code' | 'css']
                ? <><CheckIcon className="w-3 h-3" /> COPIED</>
                : <><CopyIcon className="w-3 h-3" /> COPY</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div
        className="flex-1 flex flex-col items-start justify-start animate-fade-in overflow-y-auto"
        style={{ minHeight: 500, padding: '0' }}
      >
        {/* Status bar when loading */}
        {isLoading && (
          <div style={{
            width: '100%',
            padding: '8px 16px',
            borderBottom: '1px solid var(--brand-border)',
            background: 'rgba(0,10,5,0.8)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span className="status-online" />
            <span style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '13px',
            }}>
              PROCESSING_REQUEST<span className="animate-blink">_</span>
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--brand-border)', marginLeft: 8 }} />
            <span style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '11px',
            }}>
              GEMINI_3.1_PRO
            </span>
          </div>
        )}

        <div className="w-full h-full" style={{ padding: activeTab === 'preview' ? 0 : '20px' }}>
          {activeTab === 'analysis' && analysisResult && (
            <AnalysisReport result={analysisResult} />
          )}
          {activeTab === 'preview' && PreviewComponent}
          {activeTab === 'blueprint' && (
            <div className="w-full" style={{ minHeight: 600 }}>
              <BlueprintWireframe />
            </div>
          )}
          {activeTab === 'prompt' && !isModifyOrClone && (
            <OutputPanelContent prompt={generatedPrompt} isLoading={isLoading} error={errors.prompt || null} />
          )}
          {activeTab === 'code' && (
            <HtmlOutputPanelContent html={htmlOutput} isLoading={isLoading} error={errors.html || null} />
          )}
          {activeTab === 'css' && (
            <CssOutputPanelContent css={cssOutput || ''} isLoading={isLoading} error={errors.css || null} />
          )}

          {!isLoading && groundingSources.length > 0 && inputMode === 'clone' && (
            <GroundingSources sources={groundingSources} />
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      <div style={{
        height: 28,
        borderTop: '1px solid var(--brand-border)',
        background: 'rgba(0,10,5,0.9)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 16,
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '12px',
        }}>
          MODE: {inputMode.toUpperCase()}
        </span>
        <div style={{ width: 1, height: 12, background: 'var(--brand-border)' }} />
        <span style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '12px',
          letterSpacing: '0.12em',
        }}>
          {htmlOutput ? `OUTPUT: ${htmlOutput.length} CHARS` : 'AWAITING_INPUT'}
        </span>
        {isLoading && (
          <>
            <div style={{ width: 1, height: 12, background: 'var(--brand-border)' }} />
            <span style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '12px',
              letterSpacing: '0.12em',
              animation: 'blink 1s step-end infinite',
            }}>
              ● GENERATING
            </span>
          </>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default OutputTabs;
