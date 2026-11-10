import React, { useState, useEffect } from 'react';
import TrendRadar from './components/TrendRadar';
import IntroSequence from './components/IntroSequence';

function App() {
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check system preference or saved preference
    const savedTheme = localStorage.getItem('trendradar-theme-v2');
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // Even if system is dark, we default to light per user request, unless they strictly prefer dark?
      // Let's stick to the requested default 'light' unless explicitly saved.
      // But to be safe and follow standard patterns, we can leave system check or just default to light.
      // Given the user's strong request for white default, let's ignore system dark mode for now or deprioritize it.
      setTheme('light'); 
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('trendradar-theme-v2', theme);

    // Update favicon based on theme
    const favicon = document.getElementById('favicon');
    if (favicon) {
      if (theme === 'light') {
        favicon.href = 'https://tc.lcxj.dpdns.org/docs/mgb.ico';
      } else {
        favicon.href = 'https://tc.lcxj.dpdns.org/docs/mgh.ico';
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      {!isSystemReady ? (
        <IntroSequence onComplete={() => setIsSystemReady(true)} />
      ) : (
        <TrendRadar theme={theme} toggleTheme={toggleTheme} />
      )}
    </>
  );
}

export default App;
