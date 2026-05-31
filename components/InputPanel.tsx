import React, { useRef } from 'react';
import { VisualStyle, InputMode } from '../types.ts';
import { GenerateIcon, CodeBracketIcon, LoadingSpinner, GlobeAltIcon, PhotoIcon, XMarkIcon, SearchIcon } from './icons.tsx';

interface InputPanelProps {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  userInput: string;
  setUserInput: (value: string) => void;
  urlInput: string;
  setUrlInput: (value: string) => void;
  screenshots: string[];
  setScreenshots: React.Dispatch<React.SetStateAction<string[]>>;
  pastedContent: string;
  setPastedContent: (value: string) => void;
  htmlInput: string;
  setHtmlInput: (value: string) => void;
  cloneHtmlInput: string;
  setCloneHtmlInput: (value: string) => void;
  inspectHtmlInput: string;
  setInspectHtmlInput: (value: string) => void;
  selectedStyle: VisualStyle;
  setSelectedStyle: (style: VisualStyle) => void;
  visualStyles: VisualStyle[];
  onGenerate: () => void;
  isLoading: boolean;
  currentHtml?: string;
}

const STYLE_TAG_MAP: Partial<Record<VisualStyle, string>> = {
  [VisualStyle.Minimalist]: 'MIN',
  [VisualStyle.Bento]: 'BNT',
  [VisualStyle.Editorial]: 'EDI',
  [VisualStyle.Luxury]: 'LUX',
  [VisualStyle.Technical]: 'TEC',
  [VisualStyle.Atmospheric]: 'ATM',
  [VisualStyle.Corporate]: 'CRP',
  [VisualStyle.Brutalist]: 'BRT',
  [VisualStyle.Glassmorphism]: 'GLS',
  [VisualStyle.Cyberpunk]: 'CYB',
  [VisualStyle.Playful]: 'PLY',
  [VisualStyle.Vintage]: 'VTG',
};

// Section label component
const SectionLabel: React.FC<{ num: string; label: string }> = ({ num, label }) => (
  <div className="flex items-center gap-3 mb-3">
    <span style={{
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '12px',
      background: 'rgba(0,255,136,0.1)',
      border: '1px solid rgba(0,255,136,0.25)',
      padding: '2px 6px',
      letterSpacing: '0.1em',
    }}>
      {num}
    </span>
    <span style={{
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '13px',
    }}>
      {label}
    </span>
    <div style={{ flex: 1, height: '1px', background: 'var(--brand-border)' }} />
  </div>
);

const InputPanel: React.FC<InputPanelProps> = (props) => {
  const {
    inputMode, setInputMode, userInput, setUserInput, urlInput, setUrlInput,
    screenshots, setScreenshots, pastedContent, setPastedContent,
    htmlInput, setHtmlInput, cloneHtmlInput, setCloneHtmlInput,
    inspectHtmlInput, setInspectHtmlInput,
    selectedStyle, setSelectedStyle, visualStyles, onGenerate, isLoading,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGenerateDisabled = isLoading || (
    (inputMode === 'description' && !userInput.trim()) ||
    (inputMode === 'blueprint' && !userInput.trim()) ||
    (inputMode === 'design-system' && !userInput.trim()) ||
    (inputMode === 'inspect' && !inspectHtmlInput.trim()) ||
    (inputMode === 'modify' && (!htmlInput.trim() || !cloneHtmlInput.trim())) ||
    (inputMode === 'clone' && (!urlInput.trim() && screenshots.length === 0 && !pastedContent.trim()))
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      const files = Array.from(fileList) as File[];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setScreenshots(prev => [...prev, reader.result as string].slice(-4));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const mainTabs: { mode: InputMode; label: string; code: string }[] = [
    { mode: 'description', label: 'DESCRIBE', code: 'DSC' },
    { mode: 'blueprint', label: 'CONCEPT', code: 'BLP' },
    { mode: 'design-system', label: 'SYSTEM', code: 'SYS' },
    { mode: 'inspect', label: 'AUDIT', code: 'AUD' },
    { mode: 'design', label: 'DRAW', code: 'DRW' },
    { mode: 'modify', label: 'REMIX', code: 'RMX' },
    { mode: 'clone', label: 'CLONE', code: 'CLN' },
  ];

  const getButtonText = () => {
    if (isLoading) {
      if (inputMode === 'clone') return '[ ANALYZING... ]';
      if (inputMode === 'inspect') return '[ SCANNING... ]';
      if (inputMode === 'modify') return '[ REMIXING... ]';
      if (inputMode === 'blueprint') return '[ DRAFTING... ]';
      return '[ GENERATING... ]';
    }
    if (inputMode === 'modify') return '[ EXEC: REMIX_HTML ]';
    if (inputMode === 'clone') return '[ EXEC: CLONE_TARGET ]';
    if (inputMode === 'blueprint') return '[ EXEC: GEN_WIREFRAME ]';
    if (inputMode === 'design-system') return '[ EXEC: BUILD_SYSTEM ]';
    if (inputMode === 'inspect') return '[ EXEC: DEEP_SCAN ]';
    return '[ EXEC: BUILD_UI ]';
  };

  const labelStyle = {
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: '12px',
    marginBottom: '6px',
    display: 'block',
  };

  const textareaStyle = {
    width: '100%',
    background: 'rgba(0,10,5,0.8)',
    border: '1px solid var(--brand-border)',
    color: 'var(--brand-text)',
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: '14px',
    outline: 'none',
    resize: 'none' as const,
    letterSpacing: '0.03em',
    lineHeight: '1.6',
  };

  return (
    <div className="flex flex-col h-full w-full" style={{ background: 'var(--brand-surface)' }}>

      {/* Mode selector header */}
      <div style={{
        borderBottom: '1px solid var(--brand-border)',
        background: 'rgba(0,10,5,0.5)',
        padding: '0',
      }}>
        {/* Header label */}
        <div style={{
          padding: '8px 16px 4px',
          borderBottom: '1px solid rgba(0,255,136,0.05)',
        }}>
          <span style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '13px',
          }}>
            ◈ INPUT_MODULE
          </span>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide">
          {mainTabs.map(tab => {
            const active = inputMode === tab.mode;
            return (
              <button
                key={tab.mode}
                onClick={() => setInputMode(tab.mode)}
                style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: '13px',
                  padding: '10px 14px',
                  minHeight: 40,
                  whiteSpace: 'nowrap',
                  background: active ? 'rgba(0,255,136,0.08)' : 'transparent',
                  color: active ? 'var(--brand-primary)' : 'var(--brand-text-dim)',
                  borderBottom: active ? '1px solid var(--brand-primary)' : '1px solid transparent',
                  borderRight: '1px solid var(--brand-border)',
                  textShadow: active ? '0 0 8px rgba(0,255,136,0.5)' : 'none',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                disabled={isLoading}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '20px 16px' }}>

        {(inputMode === 'description' || inputMode === 'blueprint' || inputMode === 'design-system') && (
          <div className="space-y-6">
            {/* Input */}
            <div>
              <SectionLabel
                num="01"
                label={
                  inputMode === 'blueprint' ? 'STRUCTURE_DESCRIPTION' :
                  inputMode === 'design-system' ? 'BRAND_DESCRIPTION' :
                  'UI_PROMPT_INPUT'
                }
              />
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                rows={5}
                placeholder={
                  inputMode === 'blueprint' ? '> e.g., multi-step checkout form...' :
                  inputMode === 'design-system' ? '> e.g., fintech app for Gen Z...' :
                  '> e.g., sleek dark fitness dashboard...'
                }
                style={textareaStyle}
                disabled={isLoading}
              />
              {/* Char counter */}
              <div style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '11px',
                marginTop: '4px',
                letterSpacing: '0.1em',
              }}>
                {userInput.length} CHARS
              </div>
            </div>

            {/* Style matrix */}
            {inputMode === 'description' && (
              <div>
                <SectionLabel num="02" label="VISUAL_STYLE_MATRIX" />
                <div className="grid grid-cols-2 gap-1.5">
                  {visualStyles.map((style) => {
                    const isSelected = selectedStyle === style;
                    const tag = STYLE_TAG_MAP[style] || style.slice(0, 3).toUpperCase();
                    return (
                      <button
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        disabled={isLoading}
                        style={{
                          fontFamily: 'Share Tech Mono, monospace',
                          fontSize: '12px',
                          padding: '8px 10px',
                          background: isSelected ? 'rgba(0,255,136,0.1)' : 'rgba(0,10,5,0.5)',
                          border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--brand-border)',
                          color: isSelected ? 'var(--brand-primary)' : 'var(--brand-text-dim)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          textShadow: isSelected ? '0 0 6px rgba(0,255,136,0.4)' : 'none',
                        }}
                      >
                        <span style={{
                          fontSize: '11px',
                          background: isSelected ? 'var(--brand-primary)' : 'rgba(0,255,136,0.07)',
                          padding: '1px 4px',
                          minWidth: 28,
                          textAlign: 'center',
                          letterSpacing: '0.05em',
                        }}>
                          {tag}
                        </span>
                        <span style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
                          {style.toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {inputMode === 'inspect' && (
          <div>
            <SectionLabel num="01" label="HTML_INPUT_BUFFER" />
            <div style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '12px',
              lineHeight: 1.6,
              letterSpacing: '0.05em',
            }}>
              // PASTE TARGET HTML FOR DEEP DESIGN DNA EXTRACTION
            </div>
            <textarea
              value={inspectHtmlInput}
              onChange={(e) => setInspectHtmlInput(e.target.value)}
              rows={12}
              placeholder="&lt;!-- paste HTML here... --&gt;"
              style={textareaStyle}
            />
          </div>
        )}

        {inputMode === 'modify' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <SectionLabel num="01" label="BASE_HTML" />
                {props.currentHtml && (
                  <button
                    onClick={() => setHtmlInput(props.currentHtml || '')}
                    style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: '11px',
                      letterSpacing: '0.1em',
                      color: 'var(--brand-primary)',
                      border: '1px solid rgba(0,255,136,0.3)',
                      background: 'rgba(0,255,136,0.05)',
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    USE_CURRENT
                  </button>
                )}
              </div>
              <textarea
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                rows={6}
                placeholder="// paste HTML to modify..."
                style={textareaStyle}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <SectionLabel num="02" label="STYLE_REFERENCE" />
                {props.currentHtml && (
                  <button
                    onClick={() => setCloneHtmlInput(props.currentHtml || '')}
                    style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: '11px',
                      letterSpacing: '0.1em',
                      color: 'var(--brand-primary)',
                      border: '1px solid rgba(0,255,136,0.3)',
                      background: 'rgba(0,255,136,0.05)',
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    USE_CURRENT
                  </button>
                )}
              </div>
              <textarea
                value={cloneHtmlInput}
                onChange={(e) => setCloneHtmlInput(e.target.value)}
                rows={6}
                placeholder="// paste style reference HTML..."
                style={textareaStyle}
              />
            </div>
          </div>
        )}

        {inputMode === 'clone' && (
          <div className="space-y-5">
            <div>
              <SectionLabel num="01" label="TARGET_URL" />
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: '14px',
                }}>
                  ⊹
                </span>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://target.com"
                  style={{ ...textareaStyle, paddingLeft: 28, height: 40 }}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <SectionLabel num="02" label="SOURCE_HTML_OVERRIDE" />
              <textarea
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                rows={6}
                placeholder="// paste raw HTML for precision cloning..."
                style={textareaStyle}
                disabled={isLoading}
              />
            </div>
            <div>
              <SectionLabel num="03" label="ADDITIONAL_CONTEXT" />
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                rows={3}
                placeholder="// extra instructions..."
                style={textareaStyle}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {inputMode === 'design' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div style={{
              width: 64,
              height: 64,
              border: '1px solid var(--brand-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', inset: 4,
                border: '1px solid rgba(0,255,136,0.2)',
              }} />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="0" stroke="var(--brand-primary)" strokeWidth="1.5"/>
                <line x1="3" y1="8" x2="21" y2="8" stroke="var(--brand-primary)" strokeWidth="1" opacity="0.5"/>
                <circle cx="12" cy="14" r="3" stroke="var(--brand-primary)" strokeWidth="1"/>
              </svg>
            </div>
            <p style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '14px',
              marginBottom: 8,
            }}>
              CANVAS_EDITOR_ACTIVE
            </p>
            <p style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '12px',
              lineHeight: 1.6,
              maxWidth: 200,
            }}>
              // USE THE MAIN CANVAS TO DESIGN YOUR WIREFRAME VISUALLY
            </p>
          </div>
        )}
      </div>

      {/* Generate button */}
      {inputMode !== 'design' && (
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--brand-border)',
          background: 'rgba(0,10,5,0.8)',
        }}>
          <button
            onClick={onGenerate}
            disabled={isGenerateDisabled}
            style={{
              width: '100%',
              padding: '14px',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '14px',
              letterSpacing: '0.2em',
              background: isGenerateDisabled ? 'rgba(0,255,136,0.04)' : 'var(--brand-primary)',
              color: isGenerateDisabled ? 'var(--brand-text-dim)' : 'var(--brand-bg)',
              border: isGenerateDisabled
                ? '1px solid var(--brand-border)'
                : '1px solid var(--brand-primary)',
              cursor: isGenerateDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              textShadow: isGenerateDisabled ? 'none' : '0 0 12px rgba(0,0,0,0.8)',
              boxShadow: isGenerateDisabled ? 'none' : '0 0 20px rgba(0,255,136,0.2), inset 0 0 20px rgba(0,255,136,0.05)',
            }}
          >
            {isLoading && (
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
                <LoadingSpinner style={{ width: 16, height: 16 }} />
              </span>
            )}
            {getButtonText()}
          </button>

          {/* Progress bar when loading */}
          {isLoading && (
            <div style={{
              marginTop: 6,
              height: 2,
              background: 'var(--brand-border)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                background: 'var(--brand-primary)',
                width: '30%',
                animation: 'loading-bar 1.5s ease-in-out infinite',
                boxShadow: '0 0 8px var(--brand-primary)',
              }} />
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); width: 40%; }
          50% { width: 60%; }
          100% { transform: translateX(350%); width: 40%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InputPanel;
