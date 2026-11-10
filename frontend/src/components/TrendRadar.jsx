import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowUp, List, Moon, Sun, X } from 'lucide-react';
import NewsItemGroup from './NewsItem';
import ExportMenu from './ExportMenu';
import { groupSimilarItems } from '../lib/newsGroups';
import '../report.css';

const TrendRadar = ({ theme, toggleTheme }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [showToc, setShowToc] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const sectionRefs = useRef({});
  const mobileToc = useRef(null);
  const tocTrigger = useRef(null);
  const groups = useMemo(() => data?.groups.map(group => ({
    ...group, stories: groupSimilarItems(group.items),
  })) || [], [data]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`./data.json?t=${Date.now()}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Failed to load data');
        return response.json();
      })
      .then(json => { setData(json); setActiveSection(json.groups[0]?.id); })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let frame;
    const update = () => {
      setShowScrollTop(window.scrollY > 400);
      let current = groups[0]?.id;
      for (const group of groups) {
        if (sectionRefs.current[group.id]?.getBoundingClientRect().top <= 140) current = group.id;
      }
      setActiveSection(current);
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); };
  }, [groups]);

  useEffect(() => {
    const dialog = mobileToc.current;
    if (!dialog) return;
    if (showToc && !dialog.open) dialog.showModal();
    else if (!showToc && dialog.open) dialog.close();
  }, [showToc]);

  const scrollBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  const navigateTo = id => {
    setShowToc(false);
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  };

  if (error) return (
    <div className="report-state font-mono">
      <AlertCircle size={40} /><h1>SYSTEM ERROR</h1><p>{error}</p><p>Please check data.json connectivity.</p>
    </div>
  );
  if (!data) return <div className="report-state font-mono" role="status">INITIALIZING SYSTEM...</div>;

  const contents = label => (
    <nav aria-label={label} className="report-toc">
      {groups.map(group => (
        <a key={group.id} href={`#section-${group.id}`} aria-current={activeSection === group.id ? 'location' : undefined}
          onClick={event => { event.preventDefault(); navigateTo(group.id); }}>
          <span>{group.name}</span><small>{group.count}</small>
        </a>
      ))}
    </nav>
  );

  return (
    <div className="radar-page font-mono">
      <a className="report-skip" href="#news-content">跳转到新闻</a>
      <header className="report-topbar">
        <div className="report-shell report-topbar-inner">
          <a className="report-brand font-display" href="#top">TREND_RADAR</a>
          <div className="report-system-status"><span>MEM: 64KB OK</span><span>NET: CONNECTED</span><span>SEC: HIGH</span></div>
          <button className="report-icon-button" onClick={toggleTheme} disabled={saving}
            aria-label={theme === 'dark' ? '切换浅色主题' : '切换深色主题'} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>

      <div className="report-shell" id="top">
        <section className="report-overview" aria-labelledby="report-title">
          <div className="report-heading-row">
            <div><h1 id="report-title" className="font-display">热点新闻</h1><p>System Report // {data.meta.type}</p></div>
            <ExportMenu groups={data.groups} meta={data.meta} theme={theme} activeSection={activeSection} onBusyChange={setSaving} />
          </div>
          <dl className="report-stats">
            <div><dt>TOTAL_ITEMS</dt><dd className="font-display">{data.meta.total}<span>条</span></dd></div>
            <div><dt>HOT_TOPICS</dt><dd className="font-display report-hot-value">{data.meta.hot}<span>条</span></dd></div>
            <div><dt>SYS_TIME</dt><dd className="report-time">{data.meta.generatedAt}</dd></div>
            <div><dt>STATUS</dt><dd className="report-ready">{data.meta.status}</dd></div>
          </dl>
        </section>

        <div className="report-layout">
          <aside className="report-sidebar">
            <div className="report-sidebar-heading"><h2>内容目录</h2><span>{groups.length} 个模块</span></div>
            {contents('内容目录')}
          </aside>
          <main id="news-content" className="report-content">
            <div className="report-mobile-navigation">
              <button ref={tocTrigger} className="report-button" onClick={() => setShowToc(true)} aria-haspopup="dialog">
                <List size={17} />内容目录<span>{groups.length}</span>
              </button>
            </div>
            {!groups.length && <p className="report-empty">暂无匹配的热点新闻，下一次更新后可在这里查看。</p>}
            {groups.map(group => (
              <section className="news-section" key={group.id} id={`section-${group.id}`}
                ref={element => { sectionRefs.current[group.id] = element; }} aria-labelledby={`heading-${group.id}`}>
                <header className="news-section-header">
                  <h2 id={`heading-${group.id}`}>{group.name}</h2>
                  <div className="news-section-summary">
                    {group.isHot && <span className="news-heat"><AlertCircle size={13} />CRITICAL_HEAT</span>}
                    <span className="news-count">{group.count}<small> 条</small></span>
                  </div>
                </header>
                <div className="news-list">
                  {group.stories.map((story, index) => (
                    <NewsItemGroup key={`${group.id}-${index}`} group={story} number={index + 1} groupId={`${group.id}-${index}`} />
                  ))}
                </div>
              </section>
            ))}
            {data.failed_ids?.length > 0 && (
              <div className="report-warning"><h3><AlertCircle size={16} />SYSTEM WARNING: CONNECTION_LOST</h3><p>FAILED_TARGETS: {data.failed_ids.join(', ')}</p></div>
            )}
            <footer className="report-footer"><span>End of Line_ // TrendRadar System</span><a href="https://github.com/sansan0/TrendRadar" target="_blank" rel="noopener noreferrer">GitHub</a></footer>
          </main>
        </div>
      </div>

      <dialog ref={mobileToc} className="report-toc-dialog" onCancel={() => setShowToc(false)}
        onClose={() => { setShowToc(false); tocTrigger.current?.focus({ preventScroll: true }); }}
        onClick={event => { if (event.target === event.currentTarget) setShowToc(false); }} aria-labelledby="mobile-toc-title">
        <div className="report-toc-dialog-inner">
          <div className="report-sidebar-heading"><h2 id="mobile-toc-title">内容目录</h2><button className="report-icon-button" onClick={() => setShowToc(false)} aria-label="关闭目录"><X size={20} /></button></div>
          {contents('移动端内容目录')}
        </div>
      </dialog>
      {showScrollTop && <button className="report-back-top report-icon-button" aria-label="返回顶部" onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })}><ArrowUp size={21} /></button>}
    </div>
  );
};

export default TrendRadar;
