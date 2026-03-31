
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AnimationSettings {
  enabled: boolean;
  intensity: number; // 0 to 1
}

interface AnimationContextType {
  settings: AnimationSettings;
  updateSettings: (newSettings: Partial<AnimationSettings>) => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AnimationSettings>(() => {
    try {
      const stored = localStorage.getItem('animationSettings');
      return stored ? JSON.parse(stored) : { enabled: true, intensity: 1 };
    } catch (e) {
      return { enabled: true, intensity: 1 };
    }
  });

  useEffect(() => {
    localStorage.setItem('animationSettings', JSON.stringify(settings));
    
    // Update CSS variables
    const root = document.documentElement;
    if (settings.enabled) {
      // Intensity 1 = 0.4s/0.5s duration. Intensity 0 = 1s duration (slow).
      // Actually let's keep duration constant-ish or slightly slower for low intensity
      const durationMultiplier = settings.intensity === 0 ? 0 : (1.5 - settings.intensity * 0.5);
      
      root.style.setProperty('--anim-duration-fade', `${0.4 * durationMultiplier}s`);
      root.style.setProperty('--anim-duration-slide', `${0.5 * durationMultiplier}s`);
      root.style.setProperty('--anim-pulse-duration', `${1.5 * durationMultiplier}s`);
      root.style.setProperty('--anim-intensity', `${settings.intensity}`);
      
      if (settings.intensity === 0) {
          root.style.setProperty('--anim-duration-fade', '0s');
          root.style.setProperty('--anim-duration-slide', '0s');
          root.style.setProperty('--anim-pulse-duration', '0s');
      }
    } else {
      root.style.setProperty('--anim-duration-fade', '0s');
      root.style.setProperty('--anim-duration-slide', '0s');
      root.style.setProperty('--anim-pulse-duration', '0s');
      root.style.setProperty('--anim-intensity', '0');
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AnimationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <AnimationContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};
