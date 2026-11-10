import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Terminal } from 'lucide-react';
import { INTRO_KEY, writePreference } from '../lib/preferences';
import '../report.css';

export default function IntroSequence({ onComplete }) {
  const [logs, setLogs] = useState([]);
  const terminal = useRef(null);
  const progress = logs.at(-1)?.progress || 0;

  useEffect(() => {
    // Count the visit even when the reader refreshes before the animation ends.
    writePreference(INTRO_KEY, 'seen');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finishOnReducedMotion = () => { if (motion.matches) onComplete(); };
    if (motion.matches) { onComplete(); return; }
    const messages = [
      'TREND_RADAR // BOOT_SEQUENCE',
      `LOCAL_TIME ........ ${new Date().toLocaleDateString('en-CA')}`,
      `THEME_PROFILE ..... ${document.documentElement.classList.contains('dark') ? 'DARK' : 'LIGHT'}`,
      `VIEWPORT .......... ${window.innerWidth} x ${window.innerHeight}`,
      'READER_LAYOUT ..... TOPIC_INDEX',
      'NEWS_VIEW ......... MULTI_SOURCE',
      'SOURCE_GROUPS ..... EXPANDABLE',
      'IMAGE_EXPORT ...... PNG / ZIP',
      'EXPORT_WIDTH ...... 1800 PX',
      'KEYBOARD_NAV ...... ENABLED',
      'BOOT_SEQUENCE ..... COMPLETE',
      'OPENING_REPORT ....',
    ];
    setLogs([]);
    const timers = messages.map((text, index) => window.setTimeout(() => {
      const now = new Date();
      setLogs(previous => [...previous, {
        text, time: now.toLocaleTimeString('en-GB', { hour12: false }),
        progress: Math.round((index + 1) / messages.length * 100),
      }]);
    }, index * 240));
    timers.push(window.setTimeout(onComplete, 3100));
    motion.addEventListener('change', finishOnReducedMotion);
    return () => {
      timers.forEach(window.clearTimeout);
      motion.removeEventListener('change', finishOnReducedMotion);
    };
  }, [onComplete]);

  useEffect(() => {
    if (terminal.current) terminal.current.scrollTop = terminal.current.scrollHeight;
  }, [logs]);

  return (
    <main className="intro-page font-mono">
      <div className="intro-content" aria-labelledby="intro-title">
        <header className="intro-terminal-heading">
          <h1 id="intro-title"><Terminal size={18} aria-hidden="true" />BOOT_SEQUENCE.EXE</h1>
          <span aria-hidden="true">{progress < 100 ? 'RUNNING' : 'COMPLETE'}</span>
        </header>
        <p className="sr-only" role="status">正在播放启动动画，即将进入新闻。可以跳过动画直接阅读。</p>
        <div className="intro-terminal" ref={terminal} aria-hidden="true">
          {logs.map((log, index) => (
            <div className="intro-log" key={index}>
              <span className="intro-log-time">[{log.time}]</span>
              <span className="intro-log-prompt">&gt;</span>
              <span className={index >= 10 ? 'intro-log-complete' : undefined}>{log.text}</span>
            </div>
          ))}
          <div className="intro-command"><span>&gt;_</span><span className="intro-cursor" /></div>
        </div>
        <div className="intro-progress-label" aria-hidden="true"><span>启动动画</span><span>{String(progress).padStart(3, '0')}%</span></div>
        <div className="intro-timeline" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
        <div className="intro-actions">
          <p>仅首次播放 · 即将进入新闻</p>
          <button className="report-button report-button-primary" onClick={onComplete}>
            跳过，直接阅读 <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}
