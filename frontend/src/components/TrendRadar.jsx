import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Save, Activity, Clock, Hash, ChevronRight, ChevronDown, AlertCircle, ExternalLink, Sun, Moon, List, X } from 'lucide-react';
import html2canvas from 'html2canvas';

const TrendRadar = ({ theme, toggleTheme }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrolled, setScrolled] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [showToc, setShowToc] = useState(false);
  
  const containerRef = useRef(null);
  const sectionRefs = useRef({});

  // 计算两个字符串的相似度
  const calculateSimilarity = (str1, str2) => {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    if (maxLen === 0) return 1.0;
    
    // 简化版：检查较短字符串是否包含在较长字符串中
    const [shorter, longer] = len1 < len2 ? [str1, str2] : [str2, str1];
    if (longer.includes(shorter)) return 0.85;
    
    // 检查核心关键词匹配（去除数字后比较）
    const clean1 = str1.replace(/\d+/g, '').trim();
    const clean2 = str2.replace(/\d+/g, '').trim();
    if (clean1 === clean2 && clean1.length > 5) return 0.9;
    
    // 计算共同字符比例
    const set1 = new Set(str1);
    const set2 = new Set(str2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  };

  // 将相似的新闻项分组
  const groupSimilarItems = (items) => {
    const grouped = [];
    const used = new Set();

    items.forEach((item, index) => {
      if (used.has(index)) return;

      const group = {
        mainItem: item,
        duplicates: []
      };

      // 查找相似的项
      items.forEach((otherItem, otherIndex) => {
        if (otherIndex <= index || used.has(otherIndex)) return;
        
        const similarity = calculateSimilarity(item.title, otherItem.title);
        if (similarity > 0.75) { // 相似度阈值 75%
          group.duplicates.push(otherItem);
          used.add(otherIndex);
        }
      });

      grouped.push(group);
      used.add(index);
    });

    return grouped;
  };

  // 平滑滚动到指定分组
  const scrollToSection = (groupId) => {
    const element = sectionRefs.current[groupId];
    if (element) {
      const yOffset = -100; // 顶部偏移量，避免被固定导航栏遮挡
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setShowToc(false); // 关闭目录
    }
  };

  // 监听滚动，更新当前激活的分组
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY);
      
      // 检测当前在哪个分组
      if (data && data.groups) {
        const scrollPosition = window.scrollY + 200;
        
        for (const group of data.groups) {
          const element = sectionRefs.current[group.id];
          if (element) {
            const { top, bottom } = element.getBoundingClientRect();
            const absoluteTop = top + window.scrollY;
            const absoluteBottom = bottom + window.scrollY;
            
            if (scrollPosition >= absoluteTop && scrollPosition <= absoluteBottom) {
              setActiveSection(group.id);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始化

    return () => window.removeEventListener('scroll', handleScroll);
  }, [data]);

  useEffect(() => {
    // Fetch data with cache busting timestamp
    const timestamp = new Date().getTime();
    fetch(`./data.json?t=${timestamp}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load data');
        return res.json();
      })
      .then(jsonData => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading data:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSaveImage = () => {
    if (!containerRef.current) return;
    setSaving(true);
    
    // Use setTimeout to allow the UI to update to "SAVING..." before the heavy lifting starts
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(containerRef.current, {
          backgroundColor: theme === 'light' ? '#f2f2f2' : '#101012',
          scale: 1.5, // Slightly reduced scale for performance if needed, but 1.5 is usually fine
          useCORS: true,
          logging: false,
          // Optimize capture area
          windowWidth: containerRef.current.scrollWidth,
          windowHeight: containerRef.current.scrollHeight,
          onclone: (clonedDoc) => {
             // Optimize: Remove heavy CSS effects from clone to speed up rendering
             const clonedContainer = clonedDoc.body;
             
             // Remove grid pattern overlay
             const gridPattern = clonedContainer.querySelector('.bg-grid-pattern');
             if (gridPattern) gridPattern.remove();

             // Replace backdrop-blur with solid colors
             const blurredElements = clonedContainer.querySelectorAll('.backdrop-blur-sm');
             blurredElements.forEach(el => {
               el.classList.remove('backdrop-blur-sm');
               el.style.backgroundColor = theme === 'light' ? 'rgba(255,255,255,0.98)' : 'rgba(16,16,18,0.98)';
             });
          }
        });
        
        const link = document.createElement('a');
        const now = new Date();
        const filename = `TrendRadar_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.png`;
        
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Screenshot failed:", err);
        alert("保存图片失败");
      } finally {
        setSaving(false);
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center text-primary font-mono animate-pulse">
        INITIALIZING SYSTEM...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center text-secondary font-mono p-4">
        <AlertCircle size={48} className="mb-4" />
        <h1 className="text-xl font-bold mb-2">SYSTEM ERROR</h1>
        <p className="text-sm text-dim">{error}</p>
        <p className="text-xs text-dim mt-4">Please check data.json connectivity.</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-void text-bone font-mono selection:bg-primary selection:text-void overflow-x-hidden" ref={containerRef}>
      
      {/* CRT Overlay Effect (Visual Atmosphere) - Only show in Dark Mode */}
      {!saving && theme !== 'light' && (
        <>
          <div className="pointer-events-none fixed inset-0 z-50 h-full w-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none" />
          <div className="fixed inset-0 z-0 opacity-5 bg-[size:40px_40px] bg-grid-pattern pointer-events-none"></div>
        </>
      )}

      {/* Top Status Bar */}
      <header className="sticky top-0 z-40 border-b-2 border-surface bg-void/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary animate-pulse">
            <div className="w-3 h-3 bg-primary shadow-[0_0_10px_var(--tw-colors-primary)]"></div>
            <span className="font-display font-bold tracking-widest text-lg">TREND_RADAR</span>
          </div>
          {!saving && (
            <div className="hidden md:flex gap-6 text-xs text-dim uppercase tracking-widest items-center">
              <span>MEM: 64KB OK</span>
              <span>NET: CONNECTED</span>
              <span>SEC: HIGH</span>
              <button 
                onClick={toggleTheme}
                className="ml-4 p-2 hover:text-primary transition-colors border border-transparent hover:border-dim/30 rounded-full"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 目录面板 */}
      {showToc && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            onClick={() => setShowToc(false)}
          />
          
          {/* 目录内容 */}
          <div className="relative w-full max-w-2xl max-h-[70vh] overflow-y-auto bg-surface border-2 border-primary shadow-[0_0_30px_rgba(255,176,0,0.3)]">
            {/* 头部 */}
            <div className="sticky top-0 bg-surface border-b-2 border-primary p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List size={20} className="text-primary" />
                <h2 className="font-display font-bold text-xl text-primary uppercase tracking-wider">
                  内容目录
                </h2>
              </div>
              <button
                onClick={() => setShowToc(false)}
                className="p-2 hover:bg-primary/10 transition-colors"
              >
                <X size={20} className="text-dim hover:text-primary" />
              </button>
            </div>

            {/* 目录列表 */}
            <div className="p-4 space-y-2">
              {data.groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => scrollToSection(group.id)}
                  className={`w-full text-left p-3 border-l-4 transition-all ${
                    activeSection === group.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-dim/30 hover:border-tertiary hover:bg-surface/50 text-bone'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-dim font-mono">{group.index}</span>
                      <span className="font-bold text-lg">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-dim">{group.count} 条</span>
                      {group.isHot && (
                        <span className="text-xs text-secondary animate-pulse">🔥</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-4xl mx-auto p-4 md:p-8">
        
        {/* Dashboard Header Card */}
        <div className="mb-12 border-2 border-surface bg-surface/30 p-6 relative group hover:border-primary transition-colors duration-300">
          {/* Decorative Corners */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary"></div>
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary"></div>
          <div className="absolute top-0 right-0 w-16 h-0 border-t-2 border-dashed border-dim/50"></div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-bone uppercase mb-2 tracking-wide drop-shadow-lg">
                热点新闻分析
              </h1>
              <div className="flex items-center gap-2 text-primary text-sm">
                <Terminal size={16} />
                <span className="uppercase tracking-widest">System Report // {data.meta.type}</span>
              </div>
            </div>

            {/* Actions */}
            {!saving && (
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setShowToc(!showToc)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-void border-2 border-tertiary text-tertiary font-display font-bold uppercase tracking-wider hover:bg-tertiary hover:text-void hover:shadow-[4px_4px_0px_rgba(102,178,255,1)] active:translate-y-1 active:shadow-none transition-all"
                >
                  <List size={18} />
                  <span className="hidden md:inline">目录</span>
                </button>
                <button 
                  onClick={handleSaveImage}
                  disabled={saving}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-void border-2 border-primary text-primary font-display font-bold uppercase tracking-wider hover:bg-primary hover:text-void hover:shadow-[4px_4px_0px_rgba(255,176,0,1)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  <span>{saving ? 'SAVING...' : 'Save_IMG'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 border-t-2 border-surface pt-8">
            <StatBox label="TOTAL_ITEMS" value={data.meta.total} suffix="条" color="text-bone" />
            <StatBox label="HOT_TOPICS" value={data.meta.hot} suffix="条" color="text-secondary" />
            <StatBox label="SYS_TIME" value={data.meta.generatedAt.split(' ')[1]} icon={<Clock size={14}/>} color="text-tertiary" />
            <StatBox label="STATUS" value={data.meta.status} color="text-primary" />
          </div>
        </div>

        {/* Content Groups */}
        <div className="space-y-12">
          {data.groups.map((group) => (
            <section 
              key={group.id} 
              ref={(el) => (sectionRefs.current[group.id] = el)}
              className="relative"
            >
              {/* Group Header */}
              <div className="flex items-end justify-between border-b-2 border-primary mb-6 pb-2">
                <div className="flex items-center gap-4">
                  <span className="text-5xl font-display font-bold text-surface/50 absolute -left-4 -top-8 md:-left-12 select-none">
                    {group.index.split('/')[0]}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 uppercase tracking-wider">
                        SECTION_{group.index}
                      </span>
                      {group.isHot && (
                        <span className="flex items-center gap-1 text-xs text-secondary animate-pulse">
                          <AlertCircle size={12} /> CRITICAL_HEAT
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-bone">{group.name}</h2>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-display text-xl font-bold ${group.isHot ? 'text-secondary' : 'text-tertiary'}`}>
                    {group.count}
                  </span>
                  <span className="text-xs text-dim ml-2">ITEMS</span>
                </div>
              </div>

              {/* News List */}
              <div className="grid gap-4">
                {groupSimilarItems(group.items).map((itemGroup, idx) => (
                  <NewsItemGroup 
                    key={`${group.id}-item-${idx}`}
                    group={itemGroup}
                    groupId={`${group.id}-${idx}`}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Failed IDs Section */}
        {data.failed_ids && data.failed_ids.length > 0 && (
          <div className="mt-12 border-2 border-secondary bg-secondary/10 p-4">
             <h3 className="text-secondary font-bold mb-2 flex items-center gap-2">
               <AlertCircle size={16} /> SYSTEM WARNING: CONNECTION_LOST
             </h3>
             <div className="text-xs text-dim font-mono">
               FAILED_TARGETS: {data.failed_ids.join(', ')}
             </div>
          </div>
        )}

        <footer className="mt-20 border-t border-dashed border-dim/30 pt-8 text-center text-xs text-dim font-mono uppercase tracking-widest mb-10">
          <p>End of Line_ // TrendRadar System</p>
          <div className="mt-4 flex justify-center gap-4">
             <a href="https://github.com/sansan0/TrendRadar" target="_blank" className="hover:text-primary transition-colors">GitHub</a>
          </div>
        </footer>

      </main>
    </div>
  );
};

// 可折叠的新闻项组件
const NewsItemGroup = ({ group, groupId }) => {
  const [expanded, setExpanded] = useState(false);
  const hasDuplicates = group.duplicates.length > 0;
  const item = group.mainItem;

  return (
    <div className="relative">
      {/* 主新闻项 */}
      <div 
        className="group relative bg-surface/40 border-l-2 border-surface hover:border-primary hover:bg-surface/80 transition-all duration-200 p-4"
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-surface group-hover:bg-primary transition-colors"></div>
        
        <div className="flex gap-4 items-start">
          {/* ID Badge */}
          <div className="hidden md:flex flex-col items-center justify-center w-12 h-12 border border-dim/30 bg-void/50 text-dim font-display font-bold text-lg group-hover:text-primary group-hover:border-primary/50 transition-colors">
            {item.id.split('-')[1] || '00'}
          </div>

          <div className="flex-1 min-w-0">
            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono mb-2">
              <span className="text-tertiary uppercase">[{item.source}]</span>
              
              {item.rank !== '-' && (
                <span className={`px-1.5 py-0.5 font-bold ${item.rank === '1' || item.rank === '2' || item.rank === '3' ? 'bg-secondary text-void' : 'bg-dim/20 text-dim'}`}>
                  RK:{item.rank}
                </span>
              )}
              
              {item.time && (
                <span className="text-dim flex items-center gap-1">
                  <Clock size={10} /> {item.time}
                </span>
              )}
              
              {item.views && (
                <span className="text-dim">
                  :: {item.views}
                </span>
              )}

              {item.isNew && (
                <span className="ml-auto bg-primary text-void text-[10px] font-bold px-2 py-0.5 uppercase animate-pulse">
                  New_Signal
                </span>
              )}

              {/* 重复来源标识 */}
              {hasDuplicates && (
                <span className="bg-tertiary/20 text-tertiary text-[10px] font-bold px-2 py-0.5 uppercase border border-tertiary/30">
                  +{group.duplicates.length} 来源
                </span>
              )}
            </div>

            {/* Title */}
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="block group-hover:translate-x-1 transition-transform duration-200">
              <h3 className="text-base md:text-lg font-bold text-bone group-hover:text-primary w-full">
                {item.title}
              </h3>
            </a>
          </div>
          
          {/* 折叠按钮或链接图标 */}
          <div className="self-center">
            {hasDuplicates ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-2 text-dim hover:text-primary transition-colors"
                title={expanded ? "折叠" : "展开查看所有来源"}
              >
                <ChevronDown 
                  size={20}
                  className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                />
              </button>
            ) : (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                <ChevronRight />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 折叠的重复项 */}
      {hasDuplicates && expanded && (
        <div className="ml-8 md:ml-16 mt-2 space-y-2 border-l-2 border-dim/30 pl-4">
          {group.duplicates.map((dupItem, idx) => (
            <div 
              key={`${groupId}-dup-${idx}`}
              className="bg-void/30 border border-dim/20 hover:border-dim/40 p-3 transition-all"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono mb-1.5">
                <span className="text-tertiary uppercase">[{dupItem.source}]</span>
                {dupItem.rank !== '-' && (
                  <span className="px-1.5 py-0.5 bg-dim/20 text-dim font-bold">
                    RK:{dupItem.rank}
                  </span>
                )}
                {dupItem.time && (
                  <span className="text-dim flex items-center gap-1">
                    <Clock size={10} /> {dupItem.time}
                  </span>
                )}
                {dupItem.views && (
                  <span className="text-dim">:: {dupItem.views}</span>
                )}
              </div>
              <a href={dupItem.url} target="_blank" rel="noopener noreferrer" className="block hover:text-primary transition-colors">
                <h4 className="text-sm text-bone/80 hover:text-primary">
                  {dupItem.title}
                </h4>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper Component for Stats
const StatBox = ({ label, value, suffix, icon, color }) => (
  <div className="bg-void/50 border border-dim/20 p-3 hover:border-dim/50 transition-colors">
    <div className="text-[10px] text-dim uppercase tracking-wider mb-1 flex items-center gap-1">
      {icon} {label}
    </div>
    <div className={`font-display text-2xl font-bold ${color}`}>
      {value}<span className="text-xs font-mono text-dim ml-1">{suffix}</span>
    </div>
  </div>
);

export default TrendRadar;
