import React from 'react';

interface SourceBadgeProps {
  sourceName: string;
  color: string;
}

const SOURCE_COLOR_MAP: Record<string, string> = {
  blue: '🔵',
  indigo: '🟣',
  purple: '🟪',
  pink: '🩷',
  teal: '🟦',
  orange: '🟧'
};

export const SourceBadge: React.FC<SourceBadgeProps> = ({ sourceName, color }) => {
  const emoji = SOURCE_COLOR_MAP[color] || '🔷';

  return (
    <div className="inline-flex items-center gap-1 text-xs" title={sourceName}>
      <span className="text-base leading-none">{emoji}</span>
    </div>
  );
};
