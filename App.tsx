
import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header.tsx';
import InputPanel from './components/InputPanel.tsx';
import HistoryPanel from './components/HistoryPanel.tsx';
import InspirationPanel from './components/InspirationPanel.tsx';
import OutputTabs from './components/OutputTabs.tsx';
import { enhancePrompt, generateImagePreview, modifyHtml, generateHtmlFromPrompt } from './services/geminiService.ts';
import { VisualStyle, HistoryItem, InputMode, Template } from './types.ts';

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
    { id: 'nav-bar', name: 'Glassmorphism Nav Bar', prompt: 'A translucent navigation bar with frosted glass effect, containing a logo and several navigation links.', style: VisualStyle.Glassmorphism },
    { id: 'testimonial-card', name: 'Vintage Testimonial Card', prompt: 'A retro-styled testimonial card featuring a user photo, quote, and name in a classic serif font.', style: VisualStyle.Vintage },
];


const App: React.FC = () => {
    // Input state
    const [inputMode, setInputMode] = useState<InputMode>('description');
    const [userInput, setUserInput] = useState<string>(''); // For text description
    const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(VISUAL_STYLES[0]);
    
    // Modify Mode State
    const [htmlInput, setHtmlInput] = useState<string>('');
    const [cloneHtmlInput, setCloneHtmlInput] = useState<string>('');
    
    // Output state
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [htmlOutput, setHtmlOutput] = useState<string>('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    
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
            console.error("Failed to parse history from localStorage", e);
            localStorage.removeItem('promptHistory');
        }
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (history.length > 0) {
                 localStorage.setItem('promptHistory', JSON.stringify(history));
            } else {
                 localStorage.removeItem('promptHistory');
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [history]);

    const resetOutputs = () => {
        setIsLoading(true);
        setError({});
        setGeneratedPrompt('');
        setHtmlOutput('');
        setPreviewImage(null);
    };

    const handleGenerateTemplate = useCallback(async (templateId: string, prompt: string, style: VisualStyle) => {
        setTemplateLoading(prev => ({ ...prev, [templateId]: true }));
        try {
            // Re-use the existing function for generating HTML from a prompt
            const html = await generateHtmlFromPrompt(`
                ${prompt}
                
                Ensure the generated component is visually complete and styled according to the "${style}" aesthetic.
            `);
            setGeneratedTemplates(prev => ({ ...prev, [templateId]: html }));
        } catch (err) {
            console.error(`Failed to generate template ${templateId}:`, err);
            alert(`Sorry, there was an error generating the template for "${prompt}". Please try again.`);
        } finally {
            setTemplateLoading(prev => ({ ...prev, [templateId]: false }));
        }
    }, []);

    const handleUseTemplate = useCallback((html: string, target: 'base' | 'style') => {
        setInputMode('modify');
        if (target === 'base') {
            setHtmlInput(html);
        } else {
            setCloneHtmlInput(html);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);


    const handleGenerate = useCallback(async () => {
        resetOutputs();

        if (inputMode === 'description') {
            if (!userInput.trim()) {
                alert('Please describe your UI idea.');
                setIsLoading(false);
                return;
            }

            let finalPrompt = '';
            let generatedImage: string | null = null;
            let generatedHtml: string | null = null;
            
            try {
                // We no longer fetch inspiration here, just generate the main assets.
                finalPrompt = await enhancePrompt(userInput, selectedStyle);
                setGeneratedPrompt(finalPrompt);
                
                if (finalPrompt) {
                    const imageGenPromise = generateImagePreview(finalPrompt).then(url => {
                        generatedImage = url;
                        setPreviewImage(url);
                    }).catch(err => {
                        console.error("Image Preview Error:", err);
                        setError(prev => ({ ...prev, image: 'Failed to generate preview.' }));
                    });

                    const htmlGenPromise = generateHtmlFromPrompt(finalPrompt).then(html => {
                        generatedHtml = html;
                        setHtmlOutput(html);
                    }).catch(err => {
                        console.error("HTML Generation Error:", err);
                        setError(prev => ({ ...prev, html: 'Failed to generate HTML from prompt.' }));
                    });

                    await Promise.all([imageGenPromise, htmlGenPromise]);
                }
                
                 setHistory(prev => [{
                    id: Date.now().toString(),
                    input: userInput,
                    style: selectedStyle,
                    output: finalPrompt,
                    previewImage: generatedImage,
                    htmlOutput: generatedHtml || undefined,
                    inputMode,
                }, ...prev.slice(0, 19)]);

            } catch (err) {
                console.error("A primary generation task failed in description mode:", err);
                setError(prev => ({ ...prev, prompt: 'Failed to enhance prompt.' }));
            } finally {
                setIsLoading(false);
            }

        } else if (inputMode === 'modify') {
            if (!htmlInput.trim() || !cloneHtmlInput.trim()) {
                alert('Please provide both your existing HTML and the HTML to clone the style from.');
                setIsLoading(false);
                return;
            }
            
            let generatedHtml: string = '';
            try {
                generatedHtml = await modifyHtml(htmlInput, cloneHtmlInput);
                setHtmlOutput(generatedHtml);

                setHistory(prev => [{
                    id: Date.now().toString(),
                    input: '',
                    inputMode,
                    htmlInput: htmlInput,
                    cloneHtmlInput: cloneHtmlInput,
                    htmlOutput: generatedHtml || undefined,
                }, ...prev.slice(0, 19)]);
                
            } catch (err) {
                console.error("HTML Modification Error:", err);
                setError(prev => ({ ...prev, html: 'Failed to modify HTML.' }));
            } finally {
                setIsLoading(false);
            }
        }
    }, [userInput, selectedStyle, inputMode, htmlInput, cloneHtmlInput]);
    
    const loadFromHistory = (item: HistoryItem) => {
        window.scrollTo(0, 0);
        setInputMode(item.inputMode);
        setUserInput(item.input);

        if (item.inputMode === 'description') {
            setSelectedStyle(item.style || VISUAL_STYLES[0]);
            setGeneratedPrompt(item.output || '');
            setPreviewImage(item.previewImage || null);
            setHtmlOutput(item.htmlOutput || '');
            setHtmlInput('');
            setCloneHtmlInput('');
        } else { // modify mode
            setSelectedStyle(VISUAL_STYLES[0]); // Reset to default
            setGeneratedPrompt('');
            setPreviewImage(null);
            setHtmlInput(item.htmlInput || '');
            setCloneHtmlInput(item.cloneHtmlInput || '');
            setHtmlOutput(item.htmlOutput || '');
        }
        setError({});
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('promptHistory');
    };

    return (
        <div className="animate-fade-in">
            <Header />
            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-2 flex flex-col gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                        <InputPanel
                            inputMode={inputMode}
                            setInputMode={setInputMode}
                            userInput={userInput}
                            setUserInput={setUserInput}
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

                    <div className="lg:col-span-3 flex flex-col gap-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
                        <OutputTabs
                            previewImage={previewImage}
                            generatedPrompt={generatedPrompt}
                            htmlOutput={htmlOutput}
                            isLoading={isLoading}
                            errors={error}
                            inputMode={inputMode}
                         />
                    </div>
                </div>
                
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-8 animate-slide-up" style={{ animationDelay: '300ms' }}>
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
                              clearHistory={clearHistory} 
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
