import React, { useState, useLayoutEffect, useCallback } from 'react';
import TrendRadar from './components/TrendRadar';
import IntroSequence from './components/IntroSequence';
import { readPreference, writePreference, INTRO_KEY, THEME_KEY } from './lib/preferences';

function App() {
  const [isSystemReady, setIsSystemReady] = useState(() => readPreference(INTRO_KEY) === 'seen');
  const [theme, setTheme] = useState(() => readPreference(THEME_KEY) === 'dark' ? 'dark' : 'light');

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
    writePreference(THEME_KEY, theme);
    const favicon = document.getElementById('favicon');
    if (favicon) favicon.href = theme === 'light' ? 'https://tc.lcxj.dpdns.org/docs/mgb.ico' : 'https://tc.lcxj.dpdns.org/docs/mgh.ico';
  }, [theme]);

  const completeIntro = useCallback(() => {
    writePreference(INTRO_KEY, 'seen');
    setIsSystemReady(true);
  }, []);

  return isSystemReady
    ? <TrendRadar theme={theme} toggleTheme={() => setTheme(value => value === 'dark' ? 'light' : 'dark')} />
    : <IntroSequence onComplete={completeIntro} />;
}

export default App;
