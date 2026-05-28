
import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header.tsx';
import InputPanel from './components/InputPanel.tsx';
import HistoryPanel from './components/HistoryPanel.tsx';
import InspirationPanel from './components/InspirationPanel.tsx';
import OutputTabs from './components/OutputTabs.tsx';
import WireframeEditor from './components/WireframeEditor.tsx';
import { analyzeHtml, enhancePrompt, generateImagePreview, modifyHtml, generateHtmlFromPrompt, cloneWebsite, generateBlueprint, generateFromWireframe, generateDesignSystem } from './services/geminiService.ts';
import { VisualStyle, HistoryItem, InputMode, Template, GroundingSource, AnalysisResult } from './types.ts';

const VISUAL_STYLES: VisualStyle[] = [
    VisualStyle.Minimalist,
    VisualStyle.Bento,
    VisualStyle.Editorial,
    VisualStyle.Luxury,
    VisualStyle.Technical,
    VisualStyle.Atmospheric,
    VisualStyle.Corporate,
    VisualStyle.Brutalist,
    VisualStyle.Glassmorphism,
    VisualStyle.Cyberpunk,
    VisualStyle.Playful,
    VisualStyle.Vintage,
];

const TEMPLATES: Template[] = [
    { id: 'ui-muse-wireframe', name: 'UI Muse Wireframe', prompt: 'A UI builder dashboard with a left panel for inputs (tabs for Describe, Blueprint, Remix, Clone), a right panel for outputs (tabs for Preview, Code, Prompt), and a bottom section for inspiration and history.', style: VisualStyle.Minimalist },
    { id: 'login-form', name: 'Minimalist Login Form', prompt: 'A clean, simple login form with email, password fields, and a submit button.', style: VisualStyle.Minimalist },
    { id: 'product-card', name: 'Cyberpunk Product Card', prompt: 'A futuristic product card with a holographic image placeholder, glowing text, and sharp angles.', style: VisualStyle.Cyberpunk },
    { id: 'pricing-table', name: 'Corporate Pricing Table', prompt: 'A professional pricing table with three tiers (Basic, Pro, Enterprise), feature lists, and clear call-to-action buttons.', style: VisualStyle.Corporate },
    { id: 'user-profile', name: 'Playful User Profile', prompt: 'A fun user profile card with a circular avatar, progress bars for stats, and bright, cheerful colors.', style: VisualStyle.Playful },
];

const ATOMIC_COMPONENTS: Template[] = [
    { id: 'navbar-simple', name: 'Navigation Bar', prompt: 'A modern, responsive navigation bar with a logo on the left, links in the center, and login/signup buttons on the right. Styled beautifully.', style: VisualStyle.Minimalist },
    { id: 'footer-clean', name: 'Footer', prompt: 'A comprehensive footer with multiple column links (About, Services, Legal), social media icons, and a newsletter signup form.', style: VisualStyle.Corporate },
    { id: 'hero-section', name: 'Hero Section', prompt: 'A bold hero section with a large headline, a descriptive subheadline, and a primary call to action button, accompanied by a visual placeholder.', style: VisualStyle.Atmospheric },
    { id: 'feature-grid', name: 'Feature Grid', prompt: 'A grid layout containing exactly three feature cards. Each card has an icon, a title, and a short description text. Perfect padding and spacing.', style: VisualStyle.Bento },
    { id: 'stats-bar', name: 'Stats Section', prompt: 'A horizontal bar displaying 4 key statistics/metrics in bold numbers with soft labels underneath.', style: VisualStyle.Technical },
    { id: 'testimonials', name: 'Testimonial Card', prompt: 'A quote card with a short paragraph of text, user avatar, name, and role. Subtle styling with a quotation mark icon.', style: VisualStyle.Minimalist }
];


const App: React.FC = () => {
    // Input state
    const [inputMode, setInputMode] = useState<InputMode>('description');
    const [userInput, setUserInput] = useState<string>(''); 
    const [urlInput, setUrlInput] = useState<string>('');
    const [screenshots, setScreenshots] = useState<string[]>([]);
    const [pastedContent, setPastedContent] = useState<string>('');
    const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(VISUAL_STYLES[0]);
    
    // Modify Mode State
    const [htmlInput, setHtmlInput] = useState<string>('');
    const [cloneHtmlInput, setCloneHtmlInput] = useState<string>('');
    const [inspectHtmlInput, setInspectHtmlInput] = useState<string>('');
    
    // Output state
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [htmlOutput, setHtmlOutput] = useState<string>('');
    const [cssOutput, setCssOutput] = useState<string>('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
    
    // Template State
    const [generatedTemplates, setGeneratedTemplates] = useState<Record<string, string>>({});
    const [templateLoading, setTemplateLoading] = useState<Record<string, boolean>>({});

    // App status state
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<{ prompt?: string, image?: string, html?: string, css?: string }>({});
    const [history, setHistory] = useState<HistoryItem[]>([]);

    const isInitialMount = React.useRef(true);
    
    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('promptHistory');
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (e) {
            console.error("Failed to parse history", e);
        }
    }, []);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        if (history.length > 0) {
            try {
                localStorage.setItem('promptHistory', JSON.stringify(history));
            } catch (e) {
                console.warn("Failed to save history to localStorage (quota exceeded). Attempting to save fewer items.", e);
                try {
                    // Try saving only the last 5 items
                    const reducedHistory = history.slice(0, 5);
                    localStorage.setItem('promptHistory', JSON.stringify(reducedHistory));
                } catch (e2) {
                     console.warn("Failed to save reduced history to localStorage. Attempting to save without heavy assets.", e2);
                     // If it still fails, strip images from the last 5 items
                     try {
                        const noImageHistory = history.slice(0, 5).map(item => ({
                            ...item,
                            previewImage: null,
                            screenshots: []
                        }));
                        localStorage.setItem('promptHistory', JSON.stringify(noImageHistory));
                     } catch (e3) {
                         console.error("Failed to save minimal history. Giving up.", e3);
                     }
                }
            }
        } else {
            localStorage.removeItem('promptHistory');
        }
    }, [history]);

    const resetOutputs = () => {
        setIsLoading(true);
        setError({});
        setGeneratedPrompt('');
        setHtmlOutput('');
        setCssOutput('');
        setAnalysisResult(null);
        setPreviewImage(null);
        setGroundingSources([]);
    };

    const handleGenerateTemplate = useCallback(async (templateId: string, prompt: string, style: VisualStyle) => {
        setTemplateLoading(prev => ({ ...prev, [templateId]: true }));
        try {
            const { html } = await generateHtmlFromPrompt(prompt, style);
            setGeneratedTemplates(prev => ({ ...prev, [templateId]: html }));
        } catch (err) {
            console.error(err);
        } finally {
            setTemplateLoading(prev => ({ ...prev, [templateId]: false }));
        }
    }, []);

    const handleUseTemplate = useCallback((html: string, target: 'base' | 'style') => {
        setInputMode('modify');
        if (target === 'base') setHtmlInput(html);
        else setCloneHtmlInput(html);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);


    const handleGenerateFromWireframe = useCallback(async (base64Image: string) => {
        resetOutputs();
        try {
            const { html, css } = await generateFromWireframe(base64Image);
            setHtmlOutput(html);
            setCssOutput(css);
            setPreviewImage(base64Image); // Use the drawn wireframe as the preview image
            setHistory(prev => [{
                id: Date.now().toString(),
                input: 'Interactive Wireframe',
                inputMode: 'design',
                previewImage: base64Image,
                htmlOutput: html,
                cssOutput: css,
            }, ...prev.slice(0, 19)]);
        } catch (err: any) {
            console.error(err);
            const errorMessage = err?.message || 'Generation failed';
            setError({ html: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleGenerate = useCallback(async () => {
        resetOutputs();

        try {
            if (inputMode === 'description') {
                const finalPrompt = await enhancePrompt(userInput, selectedStyle);
                setGeneratedPrompt(finalPrompt);
                
                const [img, result] = await Promise.all([
                    generateImagePreview(finalPrompt).catch(() => null),
                    generateHtmlFromPrompt(finalPrompt, selectedStyle).catch(() => null)
                ]);

                if (img) setPreviewImage(img);
                if (result) {
                    setHtmlOutput(result.html);
                    setCssOutput(result.css);
                }

                setHistory(prev => [{
                    id: Date.now().toString(),
                    input: userInput,
                    style: selectedStyle,
                    output: finalPrompt,
                    previewImage: img,
                    htmlOutput: result?.html || undefined,
                    cssOutput: result?.css || undefined,
                    inputMode,
                }, ...prev.slice(0, 19)]);

            } else if (inputMode === 'modify') {
                const { html, css } = await modifyHtml(htmlInput, userInput, selectedStyle);
                setHtmlOutput(html);
                setCssOutput(css);
                setHistory(prev => [{
                    id: Date.now().toString(),
                    input: userInput || `Remixed to ${selectedStyle}`,
                    inputMode,
                    htmlInput,
                    style: selectedStyle,
                    htmlOutput: html,
                    cssOutput: css,
                }, ...prev.slice(0, 19)]);
            } else if (inputMode === 'clone') {
                if (!urlInput.trim() && screenshots.length === 0 && !pastedContent.trim()) {
                    alert('Please enter a website URL, upload screenshots, or paste content to clone.');
                    setIsLoading(false);
                    return;
                }
                const { html, css, sources } = await cloneWebsite(urlInput, screenshots, pastedContent);
                setHtmlOutput(html);
                setCssOutput(css);
                setGroundingSources(sources);
                setHistory(prev => [{
                    id: Date.now().toString(),
                    input: urlInput ? `Clone: ${urlInput}` : 'Clone from Screenshots/Content',
                    inputMode,
                    urlInput,
                    screenshots,
                    pastedContent,
                    htmlOutput: html,
                    cssOutput: css,
                    groundingSources: sources,
                }, ...prev.slice(0, 19)]);
            } else if (inputMode === 'inspect') {
                if (!inspectHtmlInput.trim()) {
                    alert('Please paste some HTML to inspect.');
                    setIsLoading(false);
                    return;
                }
                const result = await analyzeHtml(inspectHtmlInput);
                setAnalysisResult(result);
                // Also show the original HTML in the code view
                setHtmlOutput(inspectHtmlInput);
                setHistory(prev => [{
                    id: Date.now().toString(),
                    input: 'Deep Inspect: ' + (result.architecture.layout || 'Design DNA'),
                    inputMode,
                    htmlInput: inspectHtmlInput,
                    analysisResult: result,
                }, ...prev.slice(0, 19)]);
            } else if (inputMode === 'blueprint') {
                const { html, css } = await generateBlueprint(userInput);
                setHtmlOutput(html);
                setCssOutput(css);
                setHistory(prev => [{
                    id: Date.now().toString(),
                    input: `Blueprint: ${userInput}`,
                    inputMode,
                    htmlOutput: html,
                    cssOutput: css,
                }, ...prev.slice(0, 19)]);
            } else if (inputMode === 'design-system') {
                const designSystem = await generateDesignSystem(userInput);
                
                // Now use the design system to generate a prompt for Gemini
                const systemPrompt = `Generate a high-fidelity UI based on this design system:
                - Primary Color: ${designSystem.primary_color}
                - Secondary Color: ${designSystem.secondary_color}
                - Accent Color: ${designSystem.accent_color}
                - Foreground Color: ${designSystem.foreground_color}
                - Font Family: ${designSystem.font_family}
                - Layout Type: ${designSystem.layout_type}
                - Sections: ${designSystem.sections.join(', ')}
                
                The user wants: ${userInput}`;
                
                const { html, css } = await generateHtmlFromPrompt(systemPrompt, selectedStyle);
                setHtmlOutput(html);
                setCssOutput(css);
                setGeneratedPrompt(systemPrompt);
                
                setHistory(prev => [{
                    id: Date.now().toString(),
                    input: `Design System: ${userInput}`,
                    inputMode,
                    htmlOutput: html,
                    cssOutput: css,
                }, ...prev.slice(0, 19)]);
            }
        } catch (err: any) {
            console.error(err);
            const errorMessage = err?.message || 'Generation failed';
            setError({ html: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, [userInput, selectedStyle, inputMode, htmlInput, cloneHtmlInput, urlInput, screenshots, pastedContent]);
    
    const loadFromHistory = (item: HistoryItem) => {
        window.scrollTo(0, 0);
        setInputMode(item.inputMode || 'description');
        setHtmlOutput(item.htmlOutput || '');
        setCssOutput(item.cssOutput || '');
        
        if (item.inputMode === 'description') {
            setUserInput(item.input || '');
            setSelectedStyle(item.style || VISUAL_STYLES[0]);
            setGeneratedPrompt(item.output || '');
            setPreviewImage(item.previewImage || null);
        } else if (item.inputMode === 'modify') {
            setHtmlInput(item.htmlInput || '');
            setUserInput(item.input || '');
            setSelectedStyle(item.style || VISUAL_STYLES[0]);
        } else if (item.inputMode === 'clone') {
            setUrlInput(item.urlInput || '');
            setScreenshots(item.screenshots || []);
            setPastedContent(item.pastedContent || '');
            setGroundingSources(item.groundingSources || []);
        } else if (item.inputMode === 'inspect') {
            setInspectHtmlInput(item.htmlInput || '');
            setAnalysisResult(item.analysisResult || null);
        } else if (item.inputMode === 'design-system') {
            setUserInput(item.input.replace('Design System: ', '') || '');
        } else if (item.inputMode === 'design') {
            setPreviewImage(item.previewImage || null);
        }
    };

    return (
        <div className="animate-fade-in min-h-screen flex flex-col bg-brand-bg">
            <Header />
            <main className="flex-1 flex flex-col lg:flex-row w-full max-w-[100vw]">
                {inputMode === 'design' ? (
                    <div className="flex-1 animate-slide-up flex flex-col">
                        <WireframeEditor onGenerate={handleGenerateFromWireframe} isGenerating={isLoading} setInputMode={setInputMode} />
                        {(htmlOutput || isLoading) && (
                            <div className="flex-1 bg-brand-bg">
                                <OutputTabs
                                    previewImage={previewImage}
                                    generatedPrompt={generatedPrompt}
                                    htmlOutput={htmlOutput}
                                    cssOutput={cssOutput}
                                    analysisResult={analysisResult}
                                    groundingSources={groundingSources}
                                    isLoading={isLoading}
                                    errors={error}
                                    inputMode={inputMode}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="w-full lg:w-[400px] shrink-0 border-r border-brand-border/80 flex flex-col animate-slide-up lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto custom-scrollbar bg-brand-surface/30 z-10">
                            <InputPanel
                                inputMode={inputMode}
                                setInputMode={setInputMode}
                                userInput={userInput}
                                setUserInput={setUserInput}
                                urlInput={urlInput}
                                setUrlInput={setUrlInput}
                                screenshots={screenshots}
                                setScreenshots={setScreenshots}
                                pastedContent={pastedContent}
                                setPastedContent={setPastedContent}
                                htmlInput={htmlInput}
                                setHtmlInput={setHtmlInput}
                                cloneHtmlInput={cloneHtmlInput}
                                setCloneHtmlInput={setCloneHtmlInput}
                                inspectHtmlInput={inspectHtmlInput}
                                setInspectHtmlInput={setInspectHtmlInput}
                                selectedStyle={selectedStyle}
                                setSelectedStyle={setSelectedStyle}
                                visualStyles={VISUAL_STYLES}
                                onGenerate={handleGenerate}
                                isLoading={isLoading}
                                currentHtml={htmlOutput}
                            />
                        </div>

                        <div className="flex-1 flex flex-col min-w-0">
                            <div className="flex-1 p-4 sm:p-0 lg:p-0 animate-slide-up bg-brand-bg flex flex-col">
                                <OutputTabs
                                    previewImage={previewImage}
                                    generatedPrompt={generatedPrompt}
                                    htmlOutput={htmlOutput}
                                    cssOutput={cssOutput}
                                    analysisResult={analysisResult}
                                    groundingSources={groundingSources}
                                    isLoading={isLoading}
                                    errors={error}
                                    inputMode={inputMode}
                                />
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 border-t border-brand-border/80 p-4 sm:p-6 lg:p-8 bg-brand-bg animate-slide-up">
                                <div className="xl:col-span-1">
                                    <InspirationPanel
                                        templates={TEMPLATES}
                                        atomicComponents={ATOMIC_COMPONENTS}
                                        generatedTemplates={generatedTemplates}
                                        loadingStates={templateLoading}
                                        onGenerate={handleGenerateTemplate}
                                        onUse={handleUseTemplate}
                                    />
                                </div>
                                <div className="xl:col-span-1">
                                    {history.length > 0 && (
                                        <HistoryPanel 
                                            history={history} 
                                            clearHistory={() => setHistory([])} 
                                            loadHistoryItem={loadFromHistory} 
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default App;
