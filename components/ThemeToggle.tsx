
import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggleTheme = () => {
        const nextDark = !isDark;
        setIsDark(nextDark);
        if (nextDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-primary hover:border-brand-primary transition-all duration-200"
            aria-label="Toggle Theme"
        >
            {isDark ? (
                <Sun className="w-5 h-5 transition-transform duration-300 rotate-0 scale-100" />
            ) : (
                <Moon className="w-5 h-5 transition-transform duration-300 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
            )}
        </button>
    );
};

export default ThemeToggle;
