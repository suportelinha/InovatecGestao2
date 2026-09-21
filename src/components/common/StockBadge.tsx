import React from 'react';
import { StockStatus } from '../../types';
import { getStockStatusDisplay } from '../../utils/formatters';

interface StockBadgeProps {
  status: StockStatus;
  showEmoji?: boolean;
  size?: 'sm' | 'md';
}

export const StockBadge: React.FC<StockBadgeProps> = ({ status, showEmoji = true, size = 'md' }) => {
  const info = getStockStatusDisplay(status);

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5 font-medium' 
    : 'text-xs px-2.5 py-1 font-semibold';

  return (
    <span
      id={`stock-badge-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full ${info.badgeClass} ${sizeClasses} whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`} />
      <span>{info.label}</span>
      {showEmoji && <span className="text-[10px] leading-none">{info.emoji}</span>}
    </span>
  );
};
