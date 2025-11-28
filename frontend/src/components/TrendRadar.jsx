import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Save, Activity, Clock, Hash, ChevronRight, AlertCircle, ExternalLink, Sun, Moon } from 'lucide-react';
import html2canvas from 'html2canvas';

const TrendRadar = ({ theme, toggleTheme }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrolled, setScrolled] = useState(0);
  const [saving, setSaving] = useState(false);
  
  const containerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    
    // Fetch data
    fetch('./data.json')
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

    return () => window.removeEventListener('scroll', handleScroll);
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
            <section key={group.id} className="relative">
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
                {group.items.map((item) => (
                  <div 
                    key={item.id} 
                    className="group relative bg-surface/40 border-l-2 border-surface hover:border-primary hover:bg-surface/80 transition-all duration-200 p-4"
                  >
                    {/* Rank Number */}
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
                        </div>

                        {/* Title */}
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="block group-hover:translate-x-1 transition-transform duration-200">
                          <h3 className="text-base md:text-lg font-bold text-bone group-hover:text-primary w-full">
                            {item.title}
                          </h3>
                        </a>
                      </div>
                      
                      {/* Link Icon */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center text-primary">
                         <ChevronRight />
                      </div>
                    </div>
                  </div>
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
