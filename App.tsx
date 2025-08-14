import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header.tsx';
import InputPanel from './components/InputPanel.tsx';
import HistoryPanel from './components/HistoryPanel.tsx';
import InspirationPanel from './components/InspirationPanel.tsx';
import OutputTabs from './components/OutputTabs.tsx';
import { enhancePrompt, generateImagePreview, findInspiration, modifyHtml, generateHtmlFromPrompt } from './services/geminiService.ts';
import { VisualStyle, HistoryItem, InputMode, InspirationLink } from './types.ts';

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
    const [inspirationLinks, setInspirationLinks] = useState<InspirationLink[]>([]);

    // App status state
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<{ prompt?: string, image?: string, inspiration?: string, html?: string }>({});
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
        setInspirationLinks([]);
    };

    const handleGenerate = useCallback(async () => {
        resetOutputs();

        if (inputMode === 'description') {
            if (!userInput.trim()) {
                alert('Please describe your UI idea.');
                setIsLoading(false);
                return;
            }

            let finalPrompt = '';
            let generatedLinks: InspirationLink[] = [];
            let generatedImage: string | null = null;
            let generatedHtml: string | null = null;
            
            try {
                const promptPromise = enhancePrompt(userInput, selectedStyle).then(p => {
                    finalPrompt = p;
                    setGeneratedPrompt(p);
                }).catch(err => {
                    console.error("Prompt Enhancement Error:", err);
                    setError(prev => ({ ...prev, prompt: 'Failed to enhance prompt.' }));
                    throw err; // Stop further execution on critical failure
                });

                const inspirationPromise = findInspiration(userInput, selectedStyle).then(links => {
                    generatedLinks = links;
                    setInspirationLinks(links);
                }).catch(err => {
                    console.error("Inspiration Error:", err);
                    setError(prev => ({ ...prev, inspiration: 'Failed to fetch inspiration.' }));
                });

                await Promise.all([promptPromise, inspirationPromise]);
                
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
                    inspirationLinks: generatedLinks,
                    htmlOutput: generatedHtml || undefined,
                    inputMode,
                }, ...prev.slice(0, 19)]);

            } catch (err) {
                console.error("A primary generation task failed in description mode:", err);
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
            setInspirationLinks(item.inspirationLinks || []);
            setHtmlOutput(item.htmlOutput || '');
            setHtmlInput('');
            setCloneHtmlInput('');
        } else { // modify mode
            setSelectedStyle(VISUAL_STYLES[0]); // Reset to default
            setGeneratedPrompt('');
            setPreviewImage(null);
            setInspirationLinks([]);
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
                
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up" style={{ animationDelay: '300ms' }}>
                     <InspirationPanel 
                        links={inspirationLinks}
                        isLoading={isLoading && inspirationLinks.length === 0 && !error.inspiration && inputMode === 'description'}
                        error={error.inspiration || null}
                     />
                     {history.length > 0 && (
                        <HistoryPanel 
                          history={history} 
                          clearHistory={clearHistory} 
                          loadHistoryItem={loadFromHistory} 
                        />
                     )}
                </div>
            </main>
        </div>
    );
};

export default App;