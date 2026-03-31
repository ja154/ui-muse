
import React, { useState } from 'react';
import { Settings, Zap, ZapOff, Sliders } from 'lucide-react';
import { useAnimation } from '../AnimationContext.tsx';

const AnimationSettings: React.FC = () => {
  const { settings, updateSettings } = useAnimation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-brand-border/50 transition-colors text-brand-muted hover:text-brand-primary flex items-center gap-2"
        title="Animation Settings"
      >
        <Settings className="w-5 h-5" />
        <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider">Animations</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-brand-surface border border-brand-border rounded-xl shadow-2xl p-4 z-40 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-primary" />
                Animation Settings
              </h3>
              <button 
                onClick={() => updateSettings({ enabled: !settings.enabled })}
                className={`p-1.5 rounded-md transition-all ${
                  settings.enabled 
                    ? 'bg-brand-primary/20 text-brand-primary' 
                    : 'bg-brand-border text-brand-muted'
                }`}
              >
                {settings.enabled ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            </div>

            <div className={`space-y-4 transition-opacity duration-200 ${settings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-brand-muted">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3 h-3" />
                    Intensity
                  </span>
                  <span className="font-mono text-brand-primary">{Math.round(settings.intensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.intensity}
                  onChange={(e) => updateSettings({ intensity: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
                <div className="flex justify-between text-[10px] text-brand-muted/50 font-mono">
                  <span>MIN</span>
                  <span>MAX</span>
                </div>
              </div>

              <div className="pt-2 border-t border-brand-border/50">
                <p className="text-[10px] text-brand-muted leading-relaxed">
                  Adjust the speed and distance of UI transitions. Setting to 0% effectively disables movement while keeping fade effects.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnimationSettings;
