
import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header.tsx';
import InputPanel from './components/InputPanel.tsx';
import HistoryPanel from './components/HistoryPanel.tsx';
import InspirationPanel from './components/InspirationPanel.tsx';
import OutputTabs from './components/OutputTabs.tsx';
import { enhancePrompt, generateImagePreview, modifyHtml, generateHtmlFromPrompt, cloneWebsite } from './services/geminiService.ts';
import { VisualStyle, HistoryItem, InputMode, Template, GroundingSource } from './types.ts';

const VISUAL_STYLES: VisualStyle[] = [
    VisualStyle.Minimalist,
    VisualStyle.Neumorphic,
    VisualStyle.Cyberpunk,
    VisualStyle.Glassmorphism,
    VisualStyle.Brutalist,
    VisualStyle.Corporate,
    VisualStyle.Playful,
    VisualStyle.Vintage,
];

const TEMPLATES: Template[] = [
    { id: 'login-form', name: 'Minimalist Login Form', prompt: 'A clean, simple login form with email, password fields, and a submit button.', style: VisualStyle.Minimalist },
    { id: 'product-card', name: 'Cyberpunk Product Card', prompt: 'A futuristic product card with a holographic image placeholder, glowing text, and sharp angles.', style: VisualStyle.Cyberpunk },
    { id: 'pricing-table', name: 'Corporate Pricing Table', prompt: 'A professional pricing table with three tiers (Basic, Pro, Enterprise), feature lists, and clear call-to-action buttons.', style: VisualStyle.Corporate },
    { id: 'user-profile', name: 'Playful User Profile', prompt: 'A fun user profile card with a circular avatar, progress bars for stats, and bright, cheerful colors.', style: VisualStyle.Playful },
];


const App: React.FC = () => {
    // Input state
    const [inputMode, setInputMode] = useState<InputMode>('description');
    const [userInput, setUserInput] = useState<string>(''); 
    const [urlInput, setUrlInput] = useState<string>('');
    const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(VISUAL_STYLES[0]);
    
    // Modify Mode State
    const [htmlInput, setHtmlInput] = useState<string>('');
    const [cloneHtmlInput, setCloneHtmlInput] = useState<string>('');
    
    // Output state
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [htmlOutput, setHtmlOutput] = useState<string>('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
    
    // Template State
    const [generatedTemplates, setGeneratedTemplates] = useState<Record<string, string>>({});
    const [templateLoading, setTemplateLoading] = useState<Record<string, boolean>>({});

    // App status state
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<{ prompt?: string, image?: string, html?: string }>({});
    const [history, setHistory] = useState<HistoryItem[]>([]);

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
        if (history.length > 0) {
            localStorage.setItem('promptHistory', JSON.stringify(history));
        }
    }, [history]);

    const resetOutputs = () => {
        setIsLoading(true);
        setError({});
        setGeneratedPrompt('');
        setHtmlOutput('');
        setPreviewImage(null);
        setGroundingSources([]);
    };

    const handleGenerateTemplate = useCallback(async (templateId: string, prompt: string, style: VisualStyle) => {
        setTemplateLoading(prev => ({ ...prev, [templateId]: true }));
        try {
            const html = await generateHtmlFromPrompt(`${prompt} Style: ${style}`);
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


    const handleGenerate = useCallback(async () => {
        resetOutputs();

        try {
            if (inputMode === 'description') {
                const finalPrompt = await enhancePrompt(userInput, selectedStyle);
                setGeneratedPrompt(finalPrompt);
                
                const [img, html] = await Promise.all([
                    generateImagePreview(finalPrompt).catch(() => null),
                    generateHtmlFromPrompt(finalPrompt).catch(() => null)
                ]);

                if (img) setPreviewImage(img);
                if (html) setHtmlOutput(html);

                setHistory(prev => [{
                    id: Date.now().toString(),
                    input: userInput,
                    style: selectedStyle,
                    output: finalPrompt,
                    previewImage: img,
                    htmlOutput: html || undefined,
                    inputMode,
                }, ...prev.slice(0, 19)]);

            } else if (inputMode === 'modify') {
                const generatedHtml = await modifyHtml(htmlInput, cloneHtmlInput);
                setHtmlOutput(generatedHtml);
                setHistory(prev => [{
                    id: Date.now().toString(),
                    input: 'HTML Remix',
                    inputMode,
                    htmlInput,
                    cloneHtmlInput,
                    htmlOutput: generatedHtml,
                }, ...prev.slice(0, 19)]);
            } else if (inputMode === 'clone') {
                if (!urlInput.trim()) {
                    alert('Please enter a website URL to clone.');
                    setIsLoading(false);
                    return;
                }
                const { html, sources } = await cloneWebsite(urlInput);
                setHtmlOutput(html);
                setGroundingSources(sources);
                setHistory(prev => [{
                    id: Date.now().toString(),
                    input: `Clone: ${urlInput}`,
                    inputMode,
                    urlInput,
                    htmlOutput: html,
                    groundingSources: sources,
                }, ...prev.slice(0, 19)]);
            }
        } catch (err: any) {
            console.error(err);
            setError({ html: err.message || 'Generation failed' });
        } finally {
            setIsLoading(false);
        }
    }, [userInput, selectedStyle, inputMode, htmlInput, cloneHtmlInput, urlInput]);
    
    const loadFromHistory = (item: HistoryItem) => {
        window.scrollTo(0, 0);
        setInputMode(item.inputMode);
        setHtmlOutput(item.htmlOutput || '');
        
        if (item.inputMode === 'description') {
            setUserInput(item.input);
            setSelectedStyle(item.style || VISUAL_STYLES[0]);
            setGeneratedPrompt(item.output || '');
            setPreviewImage(item.previewImage || null);
        } else if (item.inputMode === 'modify') {
            setHtmlInput(item.htmlInput || '');
            setCloneHtmlInput(item.cloneHtmlInput || '');
        } else if (item.inputMode === 'clone') {
            setUrlInput(item.urlInput || '');
            setGroundingSources(item.groundingSources || []);
        }
    };

    return (
        <div className="animate-fade-in">
            <Header />
            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-2 flex flex-col gap-6 animate-slide-up">
                        <InputPanel
                            inputMode={inputMode}
                            setInputMode={setInputMode}
                            userInput={userInput}
                            setUserInput={setUserInput}
                            urlInput={urlInput}
                            setUrlInput={setUrlInput}
                            htmlInput={htmlInput}
                            setHtmlInput={setHtmlInput}
                            cloneHtmlInput={cloneHtmlInput}
                            setCloneHtmlInput={setCloneHtmlInput}
                            selectedStyle={selectedStyle}
                            setSelectedStyle={setSelectedStyle}
                            visualStyles={VISUAL_STYLES}
                            onGenerate={handleGenerate}
                            isLoading={isLoading}
                        />
                    </div>

                    <div className="lg:col-span-3 flex flex-col gap-8 animate-slide-up">
                        <OutputTabs
                            previewImage={previewImage}
                            generatedPrompt={generatedPrompt}
                            htmlOutput={htmlOutput}
                            groundingSources={groundingSources}
                            isLoading={isLoading}
                            errors={error}
                            inputMode={inputMode}
                         />
                    </div>
                </div>
                
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-8 animate-slide-up">
                     <div className="lg:col-span-3">
                        <InspirationPanel
                           templates={TEMPLATES}
                           generatedTemplates={generatedTemplates}
                           loadingStates={templateLoading}
                           onGenerate={handleGenerateTemplate}
                           onUse={handleUseTemplate}
                        />
                     </div>
                     <div className="lg:col-span-2">
                        {history.length > 0 && (
                            <HistoryPanel 
                              history={history} 
                              clearHistory={() => setHistory([])} 
                              loadHistoryItem={loadFromHistory} 
                            />
                        )}
                     </div>
                </div>
            </main>
        </div>
    );
};

export default App;
