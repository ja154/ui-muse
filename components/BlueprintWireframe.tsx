
import React from 'react';
import { Layout, Type, Palette, MousePointer2, Code2, Layers, History, Sparkles, Wand2, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';

const BlueprintWireframe: React.FC = () => {
    return (
        <div className="w-full h-full min-h-[600px] bg-slate-900 text-cyan-100 font-mono p-8 rounded-xl overflow-auto relative border border-cyan-500/30">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#06b6d420_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>
            
            {/* Header Blueprint */}
            <div className="relative z-10 flex items-center justify-between mb-12 border-b border-cyan-500/30 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-600 rounded flex items-center justify-center border border-cyan-400">
                        <Layers size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tighter text-white">JENGA_UI_v1.0</h1>
                        <p className="text-[10px] text-cyan-400 uppercase tracking-widest">AI-Powered UI Reconstruction Engine</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="px-3 py-1 border border-cyan-500/50 rounded text-[10px] flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        SYSTEM_READY
                    </div>
                    <div className="px-3 py-1 bg-cyan-600/20 border border-cyan-500 rounded text-[10px] text-cyan-300">
                        AUTH: USER_01
                    </div>
                </div>
            </div>

            {/* Main Layout Blueprint */}
            <div className="relative z-10 grid grid-cols-12 gap-8">
                
                {/* Left Column: Input Controls */}
                <div className="col-span-4 flex flex-col gap-6">
                    <div className="p-4 border border-cyan-500/30 rounded-lg bg-slate-800/50">
                        <div className="flex items-center gap-2 mb-4 text-cyan-400 text-[10px] uppercase font-bold">
                            <Monitor size={14} />
                            Input_Module
                        </div>
                        
                        {/* Mode Switcher Blueprint */}
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            {['BUILD', 'CLONE', 'REMIX'].map((mode, i) => (
                                <div key={mode} className={`text-center py-2 border rounded text-[10px] cursor-pointer transition-colors ${i === 0 ? 'bg-cyan-600 border-cyan-400 text-white' : 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'}`}>
                                    {mode}
                                </div>
                            ))}
                        </div>

                        {/* Prompt Area Blueprint */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-cyan-400 uppercase">Description_Buffer</label>
                                <div className="w-full h-32 bg-slate-900 border border-cyan-500/30 rounded p-3 text-[11px] text-cyan-200 relative">
                                    "A futuristic dashboard for a space station..."
                                    <div className="absolute bottom-2 right-2 w-1 h-4 bg-cyan-500 animate-pulse"></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-cyan-400 uppercase">Visual_Style_Matrix</label>
                                <div className="w-full p-2 border border-cyan-500/30 rounded flex items-center justify-between text-[11px]">
                                    <span>CYBERPUNK_NEON</span>
                                    <Palette size={14} className="text-cyan-500" />
                                </div>
                            </div>

                            <button className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-xs flex items-center justify-center gap-2 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                                <Sparkles size={16} />
                                EXECUTE_GENERATION
                            </button>
                        </div>
                    </div>

                    {/* History Blueprint */}
                    <div className="p-4 border border-cyan-500/30 rounded-lg bg-slate-800/50">
                        <div className="flex items-center gap-2 mb-4 text-cyan-400 text-[10px] uppercase font-bold">
                            <History size={14} />
                            Temporal_Logs
                        </div>
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="p-2 border border-cyan-500/10 rounded flex items-center justify-between text-[10px] hover:bg-cyan-500/5 cursor-pointer">
                                    <span className="truncate opacity-60">GEN_ID_0x{i}F4...</span>
                                    <span className="text-cyan-500">LOAD</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Output Workspace */}
                <div className="col-span-8 flex flex-col gap-6">
                    <div className="flex-1 border border-cyan-500/30 rounded-lg bg-slate-800/50 flex flex-col overflow-hidden">
                        {/* Tab Bar Blueprint */}
                        <div className="flex border-b border-cyan-500/30 bg-slate-900/50">
                            {['PREVIEW', 'BLUEPRINT', 'HTML_SRC', 'CSS_SRC'].map((tab, i) => (
                                <div key={tab} className={`px-6 py-3 text-[10px] font-bold cursor-pointer border-r border-cyan-500/30 ${i === 1 ? 'bg-cyan-600/20 text-white border-b-2 border-b-cyan-400' : 'text-cyan-400 hover:bg-cyan-500/10'}`}>
                                    {tab}
                                </div>
                            ))}
                        </div>

                        {/* Workspace Content Blueprint */}
                        <div className="flex-1 p-8 relative overflow-hidden">
                            {/* Blueprint Visualization */}
                            <div className="w-full h-full border border-dashed border-cyan-500/40 rounded-lg relative flex items-center justify-center">
                                <div className="absolute top-4 left-4 text-[9px] text-cyan-500/50">CANVAS_COORD: [0,0]</div>
                                
                                {/* Mock UI Elements in Blueprint style */}
                                <div className="w-3/4 h-3/4 border border-cyan-500/30 rounded bg-cyan-500/5 p-6 flex flex-col gap-4">
                                    <div className="h-8 w-1/3 border border-cyan-500/30 rounded-sm"></div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="h-24 border border-cyan-500/30 rounded-sm bg-cyan-500/10"></div>
                                        <div className="h-24 border border-cyan-500/30 rounded-sm bg-cyan-500/10"></div>
                                        <div className="h-24 border border-cyan-500/30 rounded-sm bg-cyan-500/10"></div>
                                    </div>
                                    <div className="flex-1 border border-cyan-500/30 rounded-sm flex items-center justify-center">
                                        <div className="text-[10px] text-cyan-500/40">MAIN_CONTENT_AREA</div>
                                    </div>
                                </div>

                                {/* Measurement Lines */}
                                <div className="absolute top-0 left-1/2 w-px h-full bg-cyan-500/10"></div>
                                <div className="absolute top-1/2 left-0 w-full h-px bg-cyan-500/10"></div>
                                
                                {/* Corner Accents */}
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
                            </div>
                        </div>

                        {/* Status Bar Blueprint */}
                        <div className="px-4 py-2 bg-slate-900 border-t border-cyan-500/30 flex items-center justify-between text-[9px] text-cyan-500">
                            <div className="flex gap-4">
                                <span>RENDER_ENGINE: VITE_HMR</span>
                                <span>LLM_MODEL: GEMINI_3.1_PRO</span>
                            </div>
                            <div className="flex gap-4">
                                <span>W: 1440px</span>
                                <span>H: 900px</span>
                                <span className="text-green-500">SYNC_OK</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Blueprint Labels */}
            <div className="mt-12 grid grid-cols-4 gap-4">
                {[
                    { icon: <Wand2 size={14} />, label: 'AI_ENHANCEMENT', desc: 'Contextual prompt expansion' },
                    { icon: <Monitor size={14} />, label: 'PIXEL_PERFECT', desc: 'High-fidelity reconstruction' },
                    { icon: <Code2 size={14} />, label: 'CLEAN_SOURCE', desc: 'Tailwind-optimized output' },
                    { icon: <Globe size={14} />, label: 'WEB_SCRAPE', desc: 'Live DOM inspection' },
                ].map((item, i) => (
                    <div key={i} className="p-3 border border-cyan-500/20 rounded bg-slate-800/30">
                        <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-bold mb-1">
                            {item.icon}
                            {item.label}
                        </div>
                        <p className="text-[9px] text-cyan-500/60 leading-tight">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BlueprintWireframe;
