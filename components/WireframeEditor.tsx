import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Transformer, Group, Image as KonvaImage } from 'react-konva';
import { MousePointer2, Square, Circle as CircleIcon, Type, Image as ImageIcon, Trash2, Download, Sparkles, LayoutTemplate, AppWindow, AlignLeft, MousePointerClick, Upload, TextCursorInput, CheckSquare, ToggleLeft, UserCircle, Minus, CreditCard, Tag, ChevronRight, ListOrdered, Layout, FoldVertical, AlertCircle, Activity, SlidersHorizontal } from 'lucide-react';
import useImage from 'use-image';

const URLImage = ({ image }: { image: ShapeData }) => {
    const [img] = useImage(image.imageUrl || '');
    return (
        <KonvaImage
            image={img}
            x={0}
            y={0}
            width={image.width}
            height={image.height}
            cornerRadius={4}
        />
    );
};

export type ToolType = 'select' | 'rectangle' | 'circle' | 'text' | 'image' | 'button' | 'paragraph' | 'browser' | 'input' | 'checkbox' | 'toggle' | 'avatar' | 'divider' | 'card' | 'badge' | 'breadcrumb' | 'pagination' | 'tabs' | 'accordion' | 'alert' | 'progress' | 'slider';

export interface ShapeData {
    id: string;
    type: ToolType;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    stroke: string;
    text?: string;
    fontSize?: number;
    cornerRadius?: number;
    imageUrl?: string;
}

interface WireframeEditorProps {
    onGenerate: (base64Image: string) => void;
    isGenerating: boolean;
    setInputMode: (mode: any) => void;
}

const SHAPE_DEFAULTS = {
    rectangle: { width: 100, height: 100, fill: '#e2e8f0', stroke: '#94a3b8', cornerRadius: 0 },
    circle: { width: 100, height: 100, fill: '#e2e8f0', stroke: '#94a3b8' },
    text: { width: 200, height: 50, fill: 'transparent', stroke: 'transparent', text: 'Text element', fontSize: 16 },
    image: { width: 150, height: 150, fill: '#f1f5f9', stroke: '#cbd5e1' }, // Will draw a cross inside
    button: { width: 120, height: 40, fill: '#3b82f6', stroke: '#2563eb', text: 'Button', fontSize: 14, cornerRadius: 4 },
    paragraph: { width: 200, height: 60, fill: '#cbd5e1', stroke: 'transparent' },
    browser: { width: 600, height: 400, fill: '#ffffff', stroke: '#cbd5e1', cornerRadius: 8 },
    input: { width: 200, height: 40, fill: '#ffffff', stroke: '#cbd5e1', text: 'Input field', fontSize: 14, cornerRadius: 4 },
    checkbox: { width: 20, height: 20, fill: '#ffffff', stroke: '#cbd5e1', cornerRadius: 4 },
    toggle: { width: 40, height: 20, fill: '#e2e8f0', stroke: '#cbd5e1', cornerRadius: 10 },
    avatar: { width: 40, height: 40, fill: '#e2e8f0', stroke: '#cbd5e1' },
    divider: { width: 200, height: 2, fill: '#cbd5e1', stroke: 'transparent' },
    card: { width: 250, height: 150, fill: '#ffffff', stroke: '#cbd5e1', cornerRadius: 8 },
    badge: { width: 60, height: 24, fill: '#e2e8f0', stroke: '#94a3b8', text: 'Badge', fontSize: 10, cornerRadius: 12 },
    breadcrumb: { width: 200, height: 20, fill: 'transparent', stroke: 'transparent', text: 'Home / Category / Page', fontSize: 12 },
    pagination: { width: 150, height: 32, fill: '#ffffff', stroke: '#cbd5e1', cornerRadius: 4 },
    tabs: { width: 300, height: 40, fill: '#f1f5f9', stroke: '#cbd5e1', cornerRadius: 4 },
    accordion: { width: 300, height: 40, fill: '#ffffff', stroke: '#cbd5e1', cornerRadius: 4 },
    alert: { width: 300, height: 60, fill: '#fef2f2', stroke: '#fecaca', cornerRadius: 6, text: 'Alert message', fontSize: 14 },
    progress: { width: 200, height: 8, fill: '#e2e8f0', stroke: 'transparent', cornerRadius: 4 },
    slider: { width: 200, height: 4, fill: '#e2e8f0', stroke: 'transparent', cornerRadius: 2 },
};

const WireframeEditor: React.FC<WireframeEditorProps> = ({ onGenerate, isGenerating, setInputMode }) => {
    const [shapes, setShapes] = useState<ShapeData[]>([]);
    const [history, setHistory] = useState<ShapeData[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [tool, setTool] = useState<ToolType>('select');
    const [isDrawing, setIsDrawing] = useState(false);
    const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
    
    const stageRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const trRef = useRef<any>(null);

    const handleUndo = () => {
        if (historyStep === 0) return;
        setHistoryStep(historyStep - 1);
        setShapes(history[historyStep - 1]);
        setSelectedId(null);
    };

    const handleRedo = () => {
        if (historyStep === history.length - 1) return;
        setHistoryStep(historyStep + 1);
        setShapes(history[historyStep + 1]);
        setSelectedId(null);
    };

    const saveHistory = (newShapes: ShapeData[]) => {
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newShapes);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    useEffect(() => {
        if (!containerRef.current) return;
        
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setStageSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        
        resizeObserver.observe(containerRef.current);
        
        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        if (selectedId && trRef.current) {
            const node = stageRef.current.findOne(`#${selectedId}`);
            if (node) {
                trRef.current.nodes([node]);
                trRef.current.getLayer().batchDraw();
            }
        } else if (trRef.current) {
            trRef.current.nodes([]);
            trRef.current.getLayer().batchDraw();
        }
    }, [selectedId, shapes]);

    const checkDeselect = (e: any) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
            setSelectedId(null);
        }
    };

    const handleMouseDown = (e: any) => {
        if (tool !== 'select') {
            const stage = e.target.getStage();
            const pointerPosition = stage.getPointerPosition();
            
            if (!pointerPosition) return;

            const defaults = SHAPE_DEFAULTS[tool as keyof typeof SHAPE_DEFAULTS];
            
            const generateId = () => {
                if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                    return crypto.randomUUID();
                }
                return Math.random().toString(36).substring(2, 15);
            };

            const newShape: ShapeData = {
                id: generateId(),
                type: tool,
                x: pointerPosition.x,
                y: pointerPosition.y,
                width: defaults.width,
                height: defaults.height,
                fill: defaults.fill,
                stroke: defaults.stroke,
                text: (defaults as any).text,
                fontSize: (defaults as any).fontSize,
                cornerRadius: (defaults as any).cornerRadius,
            };

            const newShapes = [...shapes, newShape];
            setShapes(newShapes);
            setSelectedId(newShape.id);
            
            if (tool === 'text') {
                // Text doesn't need dragging to size, just click
                saveHistory(newShapes);
                setTool('select');
            } else {
                setIsDrawing(true);
            }
        } else {
            checkDeselect(e);
        }
    };

    const handleMouseMove = (e: any) => {
        if (!isDrawing || !selectedId) return;

        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

        const newShapes = shapes.map((shape) => {
            if (shape.id === selectedId) {
                return {
                    ...shape,
                    width: Math.max(5, pointerPosition.x - shape.x),
                    height: Math.max(5, pointerPosition.y - shape.y),
                };
            }
            return shape;
        });

        setShapes(newShapes);
    };

    const handleDragEnd = (e: any) => {
        const id = e.target.id();
        const newShapes = shapes.map((shape) => {
            if (shape.id === id) {
                return {
                    ...shape,
                    x: e.target.x(),
                    y: e.target.y(),
                };
            }
            return shape;
        });
        setShapes(newShapes);
        saveHistory(newShapes);
    };

    const handleTransformEnd = (e: any) => {
        const node = stageRef.current.findOne(`#${selectedId}`);
        if (!node) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        const newShapes = shapes.map((shape) => {
            if (shape.id === selectedId) {
                return {
                    ...shape,
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(5, node.width() * scaleX),
                    height: Math.max(5, node.height() * scaleY),
                };
            }
            return shape;
        });
        setShapes(newShapes);
        saveHistory(newShapes);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            if (e.shiftKey) {
                handleRedo();
            } else {
                handleUndo();
            }
            e.preventDefault();
            return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (selectedId) {
                const newShapes = shapes.filter(s => s.id !== selectedId);
                setShapes(newShapes);
                saveHistory(newShapes);
                setSelectedId(null);
            }
        }
        if (e.key === 'Escape') {
            setSelectedId(null);
            setTool('select');
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, shapes, history, historyStep]);

    useEffect(() => {
        const handleWindowMouseUp = () => {
            if (isDrawing) {
                setIsDrawing(false);
                saveHistory(shapes);
                setTool('select');
            }
        };

        if (isDrawing) {
            window.addEventListener('mouseup', handleWindowMouseUp);
            window.addEventListener('touchend', handleWindowMouseUp);
        }

        return () => {
            window.removeEventListener('mouseup', handleWindowMouseUp);
            window.removeEventListener('touchend', handleWindowMouseUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDrawing, shapes]);

    const updateSelectedShape = (updates: Partial<ShapeData>) => {
        if (!selectedId) return;
        const newShapes = shapes.map(s => s.id === selectedId ? { ...s, ...updates } : s);
        setShapes(newShapes);
        saveHistory(newShapes);
    };

    const selectedShape = shapes.find(s => s.id === selectedId);

    const handleGenerateClick = () => {
        if (!stageRef.current) return;
        // Deselect before capturing
        setSelectedId(null);
        setTimeout(() => {
            const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
            onGenerate(dataURL);
        }, 100);
    };

    return (
        <div className="flex flex-col h-[800px] w-full bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden shadow-2xl font-sans">
            {/* Top Bar */}
            <div className="h-12 bg-[#252525] border-b border-white/10 flex items-center justify-between px-4 z-20">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setInputMode('description')}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Back to Describe"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <div className="w-px h-4 bg-white/10"></div>
                    <div className="flex items-center gap-2 text-slate-200 text-sm font-medium">
                        <LayoutTemplate className="w-4 h-4 text-brand-primary" />
                        Design Mode
                    </div>
                </div>
                <button 
                    onClick={handleGenerateClick}
                    disabled={isGenerating || shapes.length === 0}
                    className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-slate-900 text-sm font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Generate UI
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar - Tools */}
                <div className="w-14 bg-[#252525] border-r border-white/10 flex flex-col items-center py-3 gap-2 z-10 overflow-y-auto">
                    <button onClick={() => setTool('select')} className={`p-2.5 rounded-lg transition-colors ${tool === 'select' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Select (V)">
                        <MousePointer2 className="w-4 h-4" />
                    </button>
                    <div className="w-6 h-px bg-white/10 my-1"></div>
                    <button onClick={() => setTool('rectangle')} className={`p-2.5 rounded-lg transition-colors ${tool === 'rectangle' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Rectangle (R)">
                        <Square className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('circle')} className={`p-2.5 rounded-lg transition-colors ${tool === 'circle' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Ellipse (O)">
                        <CircleIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('text')} className={`p-2.5 rounded-lg transition-colors ${tool === 'text' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Text (T)">
                        <Type className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('image')} className={`p-2.5 rounded-lg transition-colors ${tool === 'image' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Image Placeholder (I)">
                        <ImageIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('button')} className={`p-2.5 rounded-lg transition-colors ${tool === 'button' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Button (B)">
                        <MousePointerClick className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('paragraph')} className={`p-2.5 rounded-lg transition-colors ${tool === 'paragraph' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Paragraph (P)">
                        <AlignLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('browser')} className={`p-2.5 rounded-lg transition-colors ${tool === 'browser' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Browser Window (W)">
                        <AppWindow className="w-4 h-4" />
                    </button>
                    <div className="w-6 h-px bg-white/10 my-1"></div>
                    <button onClick={() => setTool('input')} className={`p-2.5 rounded-lg transition-colors ${tool === 'input' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Input Field">
                        <TextCursorInput className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('checkbox')} className={`p-2.5 rounded-lg transition-colors ${tool === 'checkbox' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Checkbox">
                        <CheckSquare className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('toggle')} className={`p-2.5 rounded-lg transition-colors ${tool === 'toggle' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Toggle Switch">
                        <ToggleLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('avatar')} className={`p-2.5 rounded-lg transition-colors ${tool === 'avatar' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Avatar">
                        <UserCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('divider')} className={`p-2.5 rounded-lg transition-colors ${tool === 'divider' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Divider">
                        <Minus className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('card')} className={`p-2.5 rounded-lg transition-colors ${tool === 'card' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Card">
                        <CreditCard className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('badge')} className={`p-2.5 rounded-lg transition-colors ${tool === 'badge' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Badge">
                        <Tag className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('breadcrumb')} className={`p-2.5 rounded-lg transition-colors ${tool === 'breadcrumb' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Breadcrumb">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('pagination')} className={`p-2.5 rounded-lg transition-colors ${tool === 'pagination' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Pagination">
                        <ListOrdered className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('tabs')} className={`p-2.5 rounded-lg transition-colors ${tool === 'tabs' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Tabs">
                        <Layout className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('accordion')} className={`p-2.5 rounded-lg transition-colors ${tool === 'accordion' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Accordion">
                        <FoldVertical className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('alert')} className={`p-2.5 rounded-lg transition-colors ${tool === 'alert' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Alert">
                        <AlertCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('progress')} className={`p-2.5 rounded-lg transition-colors ${tool === 'progress' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Progress Bar">
                        <Activity className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTool('slider')} className={`p-2.5 rounded-lg transition-colors ${tool === 'slider' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`} title="Slider">
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                    <div className="w-6 h-px bg-white/10 my-1"></div>
                    <button onClick={handleUndo} disabled={historyStep === 0} className={`p-2.5 rounded-lg transition-colors text-slate-400 hover:bg-white/5 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed`} title="Undo">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                    </button>
                    <button onClick={handleRedo} disabled={historyStep === history.length - 1} className={`p-2.5 rounded-lg transition-colors text-slate-400 hover:bg-white/5 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed`} title="Redo">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
                    </button>
                    <div className="w-6 h-px bg-white/10 my-1"></div>
                    <button onClick={() => {
                        setShapes([]);
                        saveHistory([]);
                        setSelectedId(null);
                    }} disabled={shapes.length === 0} className={`p-2.5 rounded-lg transition-colors text-slate-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed`} title="Clear All">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Center - Canvas */}
                <div className="flex-1 flex flex-col relative bg-[#1e1e1e] overflow-hidden" ref={containerRef}>
                    {/* Dot Grid Background */}
                    <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    
                    <Stage
                        width={stageSize.width}
                        height={stageSize.height}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onTouchStart={handleMouseDown}
                        onTouchMove={handleMouseMove}
                        ref={stageRef}
                        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
                    >
                        <Layer>
                            {/* White background for the frame */}
                            <Rect
                                x={0}
                                y={0}
                                width={stageSize.width}
                                height={stageSize.height}
                                fill="transparent"
                                listening={false}
                            />
                            
                            {shapes.map((shape) => {
                                const isSelected = shape.id === selectedId;
                                
                                if (shape.type === 'rectangle') {
                                    return (
                                        <Rect
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            fill={shape.fill}
                                            stroke={shape.stroke}
                                            cornerRadius={shape.cornerRadius}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        />
                                    );
                                }
                                
                                if (shape.type === 'circle') {
                                    return (
                                        <Circle
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x + shape.width / 2}
                                            y={shape.y + shape.height / 2}
                                            radius={Math.min(shape.width, shape.height) / 2}
                                            fill={shape.fill}
                                            stroke={shape.stroke}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        />
                                    );
                                }

                                if (shape.type === 'text') {
                                    return (
                                        <Text
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            text={editingTextId === shape.id ? '' : shape.text}
                                            fontSize={shape.fontSize}
                                            fill="#0f172a"
                                            fontFamily="Inter, sans-serif"
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDblClick={() => tool === 'select' && setEditingTextId(shape.id)}
                                            onDblTap={() => tool === 'select' && setEditingTextId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        />
                                    );
                                }

                                if (shape.type === 'image') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            {shape.imageUrl ? (
                                                <URLImage image={shape} />
                                            ) : (
                                                <>
                                                    <Rect
                                                        width={shape.width}
                                                        height={shape.height}
                                                        fill={shape.fill}
                                                        stroke={shape.stroke}
                                                        dash={[4, 4]}
                                                        cornerRadius={4}
                                                    />
                                                    <Text
                                                        x={0}
                                                        y={shape.height / 2 - 8}
                                                        width={shape.width}
                                                        text="IMAGE"
                                                        align="center"
                                                        fill="#94a3b8"
                                                        fontSize={12}
                                                        fontFamily="Inter, sans-serif"
                                                        fontStyle="600"
                                                    />
                                                </>
                                            )}
                                        </Group>
                                    );
                                }

                                if (shape.type === 'button') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDblClick={() => tool === 'select' && setEditingTextId(shape.id)}
                                            onDblTap={() => tool === 'select' && setEditingTextId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Text
                                                width={shape.width}
                                                height={shape.height}
                                                text={editingTextId === shape.id ? '' : shape.text}
                                                fontSize={shape.fontSize}
                                                fill="#ffffff"
                                                align="center"
                                                verticalAlign="middle"
                                                fontFamily="Inter, sans-serif"
                                            />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'paragraph') {
                                    const lineCount = Math.max(1, Math.floor(shape.height / 15));
                                    const lines = [];
                                    for (let i = 0; i < lineCount; i++) {
                                        const lineWidth = i === lineCount - 1 && lineCount > 1 ? shape.width * 0.6 : shape.width;
                                        lines.push(
                                            <Rect
                                                key={i}
                                                y={i * 15}
                                                width={lineWidth}
                                                height={8}
                                                fill={shape.fill}
                                                cornerRadius={4}
                                            />
                                        );
                                    }
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            {lines}
                                        </Group>
                                    );
                                }

                                if (shape.type === 'browser') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Rect
                                                width={shape.width}
                                                height={30}
                                                fill="#f1f5f9"
                                                stroke={shape.stroke}
                                                cornerRadius={[shape.cornerRadius || 0, shape.cornerRadius || 0, 0, 0]}
                                            />
                                            <Circle x={15} y={15} radius={4} fill="#ef4444" />
                                            <Circle x={30} y={15} radius={4} fill="#eab308" />
                                            <Circle x={45} y={15} radius={4} fill="#22c55e" />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'input') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                            onDblClick={() => {
                                                if (tool === 'select') {
                                                    setEditingTextId(shape.id);
                                                }
                                            }}
                                            onDblTap={() => {
                                                if (tool === 'select') {
                                                    setEditingTextId(shape.id);
                                                }
                                            }}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Text
                                                text={editingTextId === shape.id ? '' : shape.text}
                                                width={shape.width - 20}
                                                height={shape.height}
                                                x={10}
                                                y={0}
                                                fill="#94a3b8"
                                                fontSize={shape.fontSize}
                                                align="left"
                                                verticalAlign="middle"
                                                fontFamily="Inter, sans-serif"
                                            />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'checkbox') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Text
                                                text="✓"
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.stroke}
                                                fontSize={shape.height * 0.8}
                                                align="center"
                                                verticalAlign="middle"
                                                fontFamily="Inter, sans-serif"
                                            />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'toggle') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Circle
                                                x={shape.height / 2}
                                                y={shape.height / 2}
                                                radius={shape.height / 2 - 2}
                                                fill="#ffffff"
                                                stroke={shape.stroke}
                                                strokeWidth={1}
                                            />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'avatar') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Circle
                                                x={shape.width / 2}
                                                y={shape.height / 2}
                                                radius={Math.min(shape.width, shape.height) / 2}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                            />
                                            <Circle
                                                x={shape.width / 2}
                                                y={shape.height / 2 - shape.height * 0.15}
                                                radius={Math.min(shape.width, shape.height) * 0.2}
                                                fill={shape.stroke}
                                            />
                                            <Circle
                                                x={shape.width / 2}
                                                y={shape.height / 2 + shape.height * 0.25}
                                                radius={Math.min(shape.width, shape.height) * 0.3}
                                                fill={shape.stroke}
                                                scaleY={0.5}
                                            />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'divider') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                            />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'card') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                                cornerRadius={shape.cornerRadius}
                                                shadowBlur={4}
                                                shadowOpacity={0.1}
                                            />
                                            <Rect
                                                width={shape.width}
                                                height={shape.height * 0.4}
                                                fill="#f8fafc"
                                                cornerRadius={[shape.cornerRadius || 0, shape.cornerRadius || 0, 0, 0]}
                                            />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'badge') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Text
                                                width={shape.width}
                                                height={shape.height}
                                                text={shape.text}
                                                fontSize={shape.fontSize}
                                                fill="#475569"
                                                align="center"
                                                verticalAlign="middle"
                                                fontFamily="Inter, sans-serif"
                                            />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'breadcrumb') {
                                    return (
                                        <Text
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            text={shape.text}
                                            fontSize={shape.fontSize}
                                            fill="#64748b"
                                            fontFamily="Inter, sans-serif"
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        />
                                    );
                                }

                                if (shape.type === 'pagination') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Group x={10} y={6}>
                                                {[1, 2, 3].map((n, i) => (
                                                    <Rect key={i} x={i * 24} width={20} height={20} fill={i === 0 ? '#3b82f6' : '#f1f5f9'} cornerRadius={2} />
                                                ))}
                                            </Group>
                                        </Group>
                                    );
                                }

                                if (shape.type === 'tabs') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Rect x={10} y={5} width={60} height={30} fill="#ffffff" cornerRadius={4} />
                                            <Rect x={80} y={5} width={60} height={30} fill="transparent" />
                                            <Rect x={150} y={5} width={60} height={30} fill="transparent" />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'accordion') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Text x={15} y={12} text="Accordion Item" fontSize={14} fill="#1e293b" />
                                            <Rect x={shape.width - 30} y={15} width={10} height={10} fill="#94a3b8" />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'alert') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                stroke={shape.stroke}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Text
                                                x={15}
                                                y={0}
                                                width={shape.width - 30}
                                                height={shape.height}
                                                text={shape.text}
                                                fontSize={shape.fontSize}
                                                fill="#991b1b"
                                                verticalAlign="middle"
                                                fontFamily="Inter, sans-serif"
                                            />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'progress') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Rect
                                                width={shape.width * 0.6}
                                                height={shape.height}
                                                fill="#3b82f6"
                                                cornerRadius={shape.cornerRadius}
                                            />
                                        </Group>
                                    );
                                }

                                if (shape.type === 'slider') {
                                    return (
                                        <Group
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            draggable={tool === 'select'}
                                            onClick={() => tool === 'select' && setSelectedId(shape.id)}
                                            onTap={() => tool === 'select' && setSelectedId(shape.id)}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleTransformEnd}
                                        >
                                            <Rect
                                                width={shape.width}
                                                height={shape.height}
                                                fill={shape.fill}
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Rect
                                                width={shape.width * 0.4}
                                                height={shape.height}
                                                fill="#3b82f6"
                                                cornerRadius={shape.cornerRadius}
                                            />
                                            <Circle
                                                x={shape.width * 0.4}
                                                y={shape.height / 2}
                                                radius={8}
                                                fill="#ffffff"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                            />
                                        </Group>
                                    );
                                }

                                return null;
                            })}
                            <Transformer
                                ref={trRef}
                                boundBoxFunc={(oldBox, newBox) => {
                                    if (newBox.width < 5 || newBox.height < 5) return oldBox;
                                    return newBox;
                                }}
                            />
                        </Layer>
                    </Stage>
                    {editingTextId && (
                        <textarea
                            autoFocus
                            value={shapes.find(s => s.id === editingTextId)?.text || ''}
                            onChange={(e) => {
                                const newShapes = shapes.map(s => s.id === editingTextId ? { ...s, text: e.target.value } : s);
                                setShapes(newShapes);
                            }}
                            onBlur={() => {
                                saveHistory(shapes);
                                setEditingTextId(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setEditingTextId(null);
                                }
                            }}
                            style={{
                                position: 'absolute',
                                top: shapes.find(s => s.id === editingTextId)?.y,
                                left: shapes.find(s => s.id === editingTextId)?.x,
                                width: shapes.find(s => s.id === editingTextId)?.width,
                                height: shapes.find(s => s.id === editingTextId)?.height,
                                fontSize: shapes.find(s => s.id === editingTextId)?.fontSize,
                                fontFamily: 'Inter, sans-serif',
                                border: 'none',
                                padding: shapes.find(s => s.id === editingTextId)?.type === 'button' 
                                    ? `${((shapes.find(s => s.id === editingTextId)?.height || 0) - (shapes.find(s => s.id === editingTextId)?.fontSize || 0)) / 2}px 0` 
                                    : (shapes.find(s => s.id === editingTextId)?.type === 'input' ? `${((shapes.find(s => s.id === editingTextId)?.height || 0) - (shapes.find(s => s.id === editingTextId)?.fontSize || 0)) / 2}px 10px` : 0),
                                margin: 0,
                                overflow: 'hidden',
                                background: 'none',
                                outline: 'none',
                                resize: 'none',
                                color: shapes.find(s => s.id === editingTextId)?.type === 'button' ? '#ffffff' : (shapes.find(s => s.id === editingTextId)?.type === 'input' ? '#94a3b8' : '#0f172a'),
                                textAlign: shapes.find(s => s.id === editingTextId)?.type === 'button' ? 'center' : 'left',
                                zIndex: 10,
                            }}
                        />
                    )}
                </div>

                {/* Right Sidebar - Properties */}
                <div className="w-64 bg-[#252525] border-l border-white/10 flex flex-col z-10">
                    <div className="h-10 border-b border-white/10 flex items-center px-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Design
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto">
                        {selectedShape ? (
                            <div className="space-y-6">
                                {/* Dimensions */}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-[10px] text-slate-500 font-medium w-3">X</label>
                                        <input 
                                            type="number" 
                                            value={Math.round(selectedShape.x)} 
                                            onChange={(e) => updateSelectedShape({ x: Number(e.target.value) })}
                                            className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:border-brand-primary outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-[10px] text-slate-500 font-medium w-3">Y</label>
                                        <input 
                                            type="number" 
                                            value={Math.round(selectedShape.y)} 
                                            onChange={(e) => updateSelectedShape({ y: Number(e.target.value) })}
                                            className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:border-brand-primary outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-[10px] text-slate-500 font-medium w-3">W</label>
                                        <input 
                                            type="number" 
                                            value={Math.round(selectedShape.width)} 
                                            onChange={(e) => updateSelectedShape({ width: Number(e.target.value) })}
                                            className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:border-brand-primary outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-[10px] text-slate-500 font-medium w-3">H</label>
                                        <input 
                                            type="number" 
                                            value={Math.round(selectedShape.height)} 
                                            onChange={(e) => updateSelectedShape({ height: Number(e.target.value) })}
                                            className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:border-brand-primary outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="w-full h-px bg-white/5"></div>

                                {/* Text specific */}
                                {['text', 'button', 'input', 'badge', 'breadcrumb', 'alert'].includes(selectedShape.type) && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Content</label>
                                            <textarea 
                                                value={selectedShape.text} 
                                                onChange={(e) => updateSelectedShape({ text: e.target.value })}
                                                className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2 py-1.5 text-xs text-slate-200 min-h-[60px] focus:border-brand-primary outline-none transition-colors resize-none"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-[10px] text-slate-500 font-medium w-12">Size</label>
                                            <input 
                                                type="number" 
                                                value={selectedShape.fontSize} 
                                                onChange={(e) => updateSelectedShape({ fontSize: Number(e.target.value) })}
                                                className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:border-brand-primary outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Image specific */}
                                {selectedShape.type === 'image' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Image Source</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (event) => {
                                                                updateSelectedShape({ imageUrl: event.target?.result as string });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                    className="hidden"
                                                    id="image-upload"
                                                />
                                                <label
                                                    htmlFor="image-upload"
                                                    className="w-full flex items-center justify-center gap-2 bg-[#1e1e1e] border border-white/10 hover:border-brand-primary rounded px-2 py-1.5 text-xs text-slate-200 cursor-pointer transition-colors"
                                                >
                                                    <Upload className="w-3.5 h-3.5" />
                                                    Upload Image
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Appearance */}
                                {selectedShape.type !== 'text' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Fill</label>
                                            <div className="flex items-center gap-2 bg-[#1e1e1e] border border-white/10 rounded p-1 focus-within:border-brand-primary transition-colors">
                                                <div className="relative w-6 h-6 rounded overflow-hidden border border-white/10 flex-shrink-0">
                                                    <input 
                                                        type="color" 
                                                        value={selectedShape.fill} 
                                                        onChange={(e) => updateSelectedShape({ fill: e.target.value })}
                                                        className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer"
                                                    />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={selectedShape.fill} 
                                                    onChange={(e) => updateSelectedShape({ fill: e.target.value })}
                                                    className="flex-1 bg-transparent border-none px-1 text-xs text-slate-200 uppercase outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Stroke</label>
                                            <div className="flex items-center gap-2 bg-[#1e1e1e] border border-white/10 rounded p-1 focus-within:border-brand-primary transition-colors">
                                                <div className="relative w-6 h-6 rounded overflow-hidden border border-white/10 flex-shrink-0">
                                                    <input 
                                                        type="color" 
                                                        value={selectedShape.stroke} 
                                                        onChange={(e) => updateSelectedShape({ stroke: e.target.value })}
                                                        className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer"
                                                    />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={selectedShape.stroke} 
                                                    onChange={(e) => updateSelectedShape({ stroke: e.target.value })}
                                                    className="flex-1 bg-transparent border-none px-1 text-xs text-slate-200 uppercase outline-none"
                                                />
                                            </div>
                                        </div>
                                        {['rectangle', 'button', 'browser', 'input', 'checkbox', 'toggle', 'card', 'badge', 'pagination', 'tabs', 'accordion', 'alert', 'progress', 'slider'].includes(selectedShape.type) && (
                                            <div className="flex items-center gap-2 pt-2">
                                                <label className="text-[10px] text-slate-500 font-medium w-12">Radius</label>
                                                <input 
                                                    type="number" 
                                                    value={selectedShape.cornerRadius || 0} 
                                                    onChange={(e) => updateSelectedShape({ cornerRadius: Number(e.target.value) })}
                                                    className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:border-brand-primary outline-none transition-colors"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="w-full h-px bg-white/5"></div>

                                {/* Actions */}
                                <div>
                                    <button 
                                        onClick={() => {
                                            const newShapes = shapes.filter(s => s.id !== selectedId);
                                            setShapes(newShapes);
                                            saveHistory(newShapes);
                                            setSelectedId(null);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 py-1.5 rounded transition-colors text-xs font-medium border border-transparent hover:border-red-500/20"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center px-4">
                                <MousePointer2 className="w-6 h-6 mb-3 opacity-40" />
                                Select an element to edit its properties
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WireframeEditor;
