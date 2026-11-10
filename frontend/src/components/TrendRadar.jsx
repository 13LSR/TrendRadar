import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowUp, ChevronDown, List, Moon, RefreshCw, Sun, X } from 'lucide-react';
import NewsItemGroup from './NewsItem';
import ExportMenu from './ExportMenu';
import { groupSimilarItems } from '../lib/newsGroups';
import '../report.css';

const TrendRadar = ({ theme, toggleTheme }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [showToc, setShowToc] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const sectionRefs = useRef({});
  const mobileToc = useRef(null);
  const tocTrigger = useRef(null);
  const pendingSection = useRef(null);
  const tocScrollPosition = useRef(0);
  const groups = useMemo(() => data?.groups.map(group => ({
    ...group, name: group.name.replace(/^NEW_ARRIVALS\s*\/\/\s*/, ''),
    isArrival: /^NEW_ARRIVALS\s*\/\//.test(group.name), stories: groupSimilarItems(group.items),
  })) || [], [data]);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetch(`./data.json?t=${Date.now()}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('新闻暂时无法加载，请稍后重试。');
        return response.json();
      })
      .then(json => {
        if (!json.meta || !Array.isArray(json.groups) || json.groups.some(group => !Array.isArray(group.items))) throw new Error('Invalid report');
        if (!controller.signal.aborted) { setData(json); setActiveSection(json.groups[0]?.id); }
      })
      .catch(err => { if (!controller.signal.aborted) setError('新闻暂时无法加载，请检查网络连接后重试。'); });
    return () => controller.abort();
  }, [attempt]);

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
    if (showToc && !dialog.open) {
      tocScrollPosition.current = window.scrollY;
      dialog.showModal();
    }
    else if (!showToc && dialog.open) dialog.close();
  }, [showToc]);

  const scrollBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  const focusSection = id => {
    setActiveSection(id);
    sectionRefs.current[id]?.querySelector('h2')?.focus({ preventScroll: true });
    sectionRefs.current[id]?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  };
  const navigateTo = id => {
    if (mobileToc.current?.open) {
      pendingSection.current = id;
      setShowToc(false);
    } else focusSection(id);
  };
  const closeToc = () => {
    setShowToc(false);
    if (pendingSection.current != null) {
      focusSection(pendingSection.current);
      pendingSection.current = null;
    } else {
      tocTrigger.current?.focus({ preventScroll: true });
      window.scrollTo({ top: tocScrollPosition.current, behavior: 'instant' });
    }
  };

  if (error) return (
    <main className="report-state font-mono">
      <div role="alert"><AlertCircle size={32} aria-hidden="true" /><h1>新闻加载失败</h1><p>{error}</p></div>
      <button className="report-button report-button-primary" onClick={() => { setError(null); setAttempt(value => value + 1); }}><RefreshCw size={16} aria-hidden="true" />重新加载</button>
    </main>
  );
  if (!data) return <main className="report-state font-mono" role="status"><p>正在加载新闻…</p></main>;

  const contents = label => (
    <nav aria-label={label} className="report-toc">
      {groups.map(group => (
        <a key={group.id} className={group.isArrival ? 'report-toc-arrivals' : undefined} href={`#section-${group.id}`} aria-current={activeSection === group.id ? 'location' : undefined}
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
          <div className="report-system-status"><span>{data.meta.type}</span><span>{groups.length} 个新闻模块</span></div>
          <button className="report-icon-button" onClick={toggleTheme} disabled={saving}
            aria-label={theme === 'dark' ? '切换浅色主题' : '切换深色主题'} title={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}>
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>

      <div className="report-shell" id="top">
        <section className="report-overview" aria-labelledby="report-title">
          <div className="report-heading-row">
            <div><h1 id="report-title" className="font-display">热点新闻</h1><p>{data.meta.type} · 按主题阅读</p></div>
            <ExportMenu groups={groups} meta={data.meta} theme={theme} activeSection={activeSection} onBusyChange={setSaving} />
          </div>
          <dl className="report-stats">
            <div><dt>采集新闻</dt><dd className="font-display">{data.meta.total}<span>条</span></dd></div>
            <div><dt>匹配热点</dt><dd className="font-display report-hot-value">{data.meta.hot}<span>条</span></dd></div>
            <div><dt>更新时间</dt><dd className="report-time">{data.meta.generatedAt}</dd></div>
            <div><dt>新闻模块</dt><dd className="report-ready">{groups.length} 个</dd></div>
          </dl>
        </section>

        <div className="report-layout">
          <aside className="report-sidebar">
            <div className="report-sidebar-heading"><h2>内容目录</h2><span>{groups.length} 个模块</span></div>
            {contents('内容目录')}
          </aside>
          <main id="news-content" className="report-content" tabIndex={-1}>
            <div className="report-mobile-navigation">
              <button ref={tocTrigger} className="report-button" onClick={() => setShowToc(true)} aria-haspopup="dialog" aria-expanded={showToc} aria-controls="mobile-toc">
                <List size={17} aria-hidden="true" />目录<span className="report-current-module">{groups.find(group => group.id === activeSection)?.name || '选择模块'}</span><ChevronDown size={15} aria-hidden="true" />
              </button>
            </div>
            {!groups.length && <p className="report-empty">暂无匹配的热点新闻，下一次更新后可在这里查看。</p>}
            {groups.map(group => (
              <section className="news-section" key={group.id} id={`section-${group.id}`}
                ref={element => { sectionRefs.current[group.id] = element; }} aria-labelledby={`heading-${group.id}`}>
                <header className="news-section-header">
                  <h2 id={`heading-${group.id}`} tabIndex={-1}>{group.name}</h2>
                  <div className="news-section-summary">
                    {group.isHot && <span className="news-heat"><AlertCircle size={13} aria-hidden="true" />热度较高</span>}
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
              <div className="report-warning"><h3><AlertCircle size={16} aria-hidden="true" />部分来源采集失败</h3><p>本次未能获取：{data.failed_ids.join('、')}。可在下次更新后查看。</p></div>
            )}
            <footer className="report-footer"><span>已浏览全部模块 · TrendRadar</span><a href="https://github.com/sansan0/TrendRadar" target="_blank" rel="noopener noreferrer">原项目 GitHub</a></footer>
          </main>
        </div>
      </div>

      <dialog ref={mobileToc} id="mobile-toc" className="report-toc-dialog" onCancel={() => setShowToc(false)}
        onClose={closeToc}
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
