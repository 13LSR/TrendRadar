import React, { useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Check, ChevronDown, Download, X } from 'lucide-react';
import { NewsEntry } from './NewsItem';
import { exportModulePages, packageImages } from '../lib/exportModules';

export default function ExportMenu({ groups, meta, theme, activeSection, onBusyChange }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => {
    const first = groups.find(group => group.items.length);
    return new Set(first ? [first.id] : []);
  });
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [exportGroup, setExportGroup] = useState(null);
  const wrapper = useRef(null);
  const trigger = useRef(null);
  const panel = useRef(null);
  const source = useRef(null);
  const busy = useRef(false);
  const hasOpened = useRef(false);

  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  useEffect(() => { setResult(null); setError(null); }, [selected]);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector('input')?.focus({ preventScroll: true });
    const dismissOutside = event => {
      if (!wrapper.current?.contains(event.target)) setOpen(false);
    };
    const dismissEscape = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [open]);

  const toggleOpen = () => {
    if (!hasOpened.current && groups.some(group => group.id === activeSection && group.items.length)) {
      setSelected(new Set([activeSection]));
    }
    hasOpened.current = true;
    setOpen(value => !value);
  };

  const toggleModule = id => setSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const download = async () => {
    if (busy.current || !selected.size) return;
    busy.current = true;
    setSaving(true);
    onBusyChange(true);
    setError(null);
    setResult(null);
    try {
      const files = [];
      for (const group of groups.filter(group => selected.has(group.id))) {
        flushSync(() => setExportGroup(group));
        files.push(...await exportModulePages(source.current, group, theme, setProgress));
      }
      setProgress('正在准备下载…');
      const timestamp = meta.generatedAt.replace(/[^0-9]/g, '');
      const file = await packageImages(files, timestamp);
      const url = URL.createObjectURL(file.blob);
      setResult({ url, filename: file.filename, imageCount: file.imageCount });
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      try { link.click(); } finally { link.remove(); }
    } catch (err) {
      console.error('Module export failed:', err);
      setError(err.message || '图片生成失败，请重新选择模块后重试');
    } finally {
      setExportGroup(null);
      setSaving(false);
      onBusyChange(false);
      busy.current = false;
    }
  };

  const count = groups.filter(group => selected.has(group.id)).reduce((total, group) => total + group.items.length, 0);
  return (
    <div className="export-menu" ref={wrapper}>
      <button className="report-button report-button-primary" ref={trigger} onClick={toggleOpen}
        aria-expanded={open} aria-controls="export-panel" aria-haspopup="dialog">
        <Download size={17} aria-hidden="true" />
        {saving ? '正在生成…' : '保存图片'}
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="export-panel" id="export-panel" ref={panel} role="dialog" aria-labelledby="export-title">
          <div className="export-panel-heading">
            <h2 id="export-title">选择下载模块</h2>
            <button className="report-icon-button" aria-label="关闭下载选项" onClick={() => {
              setOpen(false);
              trigger.current?.focus();
            }}><X size={18} /></button>
          </div>
          <p className="export-description">每个模块单独成图，内容较多时自动分页。多张图片将打包为 ZIP。</p>
          <div className="export-selection" role="group" aria-label="需要下载的新闻模块" aria-busy={saving}>
            <div className="export-selection-actions">
              <button type="button" disabled={saving} onClick={() => setSelected(new Set(groups.filter(group => group.items.length).map(group => group.id)))}>全选</button>
              <button type="button" disabled={saving} onClick={() => setSelected(new Set())}>清空</button>
              <span>已选 {selected.size} 个模块</span>
            </div>
            <div className="export-options">
              {groups.map(group => (
                <label key={group.id} className="export-option">
                  <input type="checkbox" checked={selected.has(group.id)} disabled={saving || !group.items.length}
                    onChange={() => toggleModule(group.id)} />
                  <span>{group.name}</span>
                  <small>{group.items.length} 条</small>
                </label>
              ))}
            </div>
          </div>
          <div className="export-panel-footer">
            <p className="export-summary">{selected.size ? `${selected.size} 个模块 · ${count} 条新闻 · 高清 PNG` : '请选择至少一个模块'}</p>
            <button className="report-button report-button-primary export-submit" disabled={saving || !selected.size} onClick={download}>
              <Download size={16} aria-hidden="true" />
              {saving ? '正在生成…' : '下载所选模块'}
            </button>
            {saving && <p role="status" className="export-feedback">{progress}</p>}
            {error && <p role="alert" className="export-error">保存图片失败：{error}</p>}
            {result && !saving && (
              <div role="status" className="export-feedback export-success">
                <Check size={16} aria-hidden="true" />
                <span>已生成 {result.imageCount} 张图片。
                  <a href={result.url} download={result.filename}>重新下载 {result.imageCount > 1 ? 'ZIP' : 'PNG'}</a>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      {exportGroup && createPortal(
        <div className="export-stage" aria-hidden="true" inert="">
          <div ref={source} className="report-export-source font-mono">
            <header className="export-header">
              <div className="export-brand"><span>TREND_RADAR</span><span className="export-page-number">1 / 1</span></div>
              <h2>{exportGroup.name}</h2>
              <p>{meta.type} · {meta.generatedAt} · {exportGroup.items.length} 条新闻</p>
            </header>
            <div className="export-news-list">
              {exportGroup.items.map((item, index) => <NewsEntry key={`${item.id}-${index}`} item={item} number={index + 1} />)}
            </div>
            <footer className="export-footer">TrendRadar · {meta.generatedAt}</footer>
          </div>
        </div>, document.body,
      )}
    </div>
  );
}
