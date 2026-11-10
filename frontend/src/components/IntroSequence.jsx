import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { INTRO_KEY, writePreference } from '../lib/preferences';
import '../report.css';

export default function IntroSequence({ onComplete }) {
  useEffect(() => {
    // Count the visit even when the reader refreshes before the animation ends.
    writePreference(INTRO_KEY, 'seen');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finishOnReducedMotion = () => { if (motion.matches) onComplete(); };
    if (motion.matches) { onComplete(); return; }
    const timer = window.setTimeout(onComplete, 2600);
    motion.addEventListener('change', finishOnReducedMotion);
    return () => {
      window.clearTimeout(timer);
      motion.removeEventListener('change', finishOnReducedMotion);
    };
  }, [onComplete]);

  return (
    <main className="intro-page font-mono">
      <div className="intro-content">
        <h1 className="intro-brand font-display">TREND_RADAR<span aria-hidden="true">_</span></h1>
        <p className="intro-description">在信息之间，找到值得关注的新闻。</p>
        <div className="intro-features">
          <p>按主题浏览热点</p><p>查看不同来源</p><p>保存清晰的模块图片</p>
        </div>
        <div className="intro-actions">
          <p>即将进入 · 启动动画仅首次播放</p>
          <button className="report-button report-button-primary" onClick={onComplete}>
            跳过，直接阅读 <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="intro-timeline" aria-hidden="true"><span /></div>
      </div>
    </main>
  );
}
