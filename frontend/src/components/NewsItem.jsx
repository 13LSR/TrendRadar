import React, { useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';

export function NewsEntry({ item, number, children, compact = false }) {
  return (
    <article className={`news-row${compact ? ' news-row-related' : ''}`}>
      <span className="news-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>
      <div className="news-content">
        <div className="news-metadata">
          <span className="news-source">{item.source}</span>
          {item.rank && item.rank !== '-' && <span className="news-rank">来源排名 {item.rank}</span>}
          {item.isNew && <span className="news-new">新增</span>}
        </div>
        <a className="news-title" href={item.url} target="_blank" rel="noopener noreferrer">
          {compact ? <h4>{item.title}</h4> : <h3>{item.title}</h3>}
        </a>
        {(item.time || item.views || children) && (
          <div className="news-details">
            {item.time && <span><Clock size={12} aria-hidden="true" />{item.time === 'JUST NOW' ? '本次新增' : item.time}</span>}
            {item.views && item.views !== 'NEW' && <span>{item.views}</span>}
            {children}
          </div>
        )}
      </div>
    </article>
  );
}

export default function NewsItemGroup({ group, number, groupId }) {
  const [expanded, setExpanded] = useState(false);
  const hasDuplicates = group.duplicates.length > 0;
  return (
    <div className="news-item-group">
      <NewsEntry item={group.mainItem} number={number}>
        {hasDuplicates && (
          <button className="news-sources-toggle" onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded} aria-controls={`sources-${groupId}`}>
            +{group.duplicates.length} 来源
            <ChevronDown size={14} className={expanded ? 'is-expanded' : ''} aria-hidden="true" />
          </button>
        )}
      </NewsEntry>
      {hasDuplicates && expanded && (
        <div id={`sources-${groupId}`} className="news-related">
          {group.duplicates.map((item, index) => (
            <NewsEntry key={`${groupId}-${index}`} item={item} number={index + 1} compact />
          ))}
        </div>
      )}
    </div>
  );
}
