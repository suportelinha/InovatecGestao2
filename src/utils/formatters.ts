import { StockStatus } from '../types';

/**
 * Formats a number to Mozambican Metical (MT)
 * Example: 1250 -> "1.250,00 MT"
 */
export function formatCurrency(value: number | string | null | undefined): string {
  const numeric = typeof value === 'number' ? value : parseFloat(value || '0') || 0;
  
  // Format with pt-MZ style: period for thousands, comma for decimals
  const parts = numeric.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];
  
  return `${intPart},${decPart} MT`;
}

/**
 * Formats a number for quantities
 */
export function formatQuantity(value: number | string | null | undefined): string {
  const numeric = typeof value === 'number' ? value : parseFloat(value || '0') || 0;
  if (Number.isInteger(numeric)) {
    return numeric.toLocaleString('pt-MZ');
  }
  return numeric.toLocaleString('pt-MZ', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

/**
 * Formats a percentage value (e.g. 24.56 -> "24,6%")
 */
export function formatPercent(value: number | null | undefined): string {
  const numeric = typeof value === 'number' ? value : 0;
  return `${numeric.toFixed(1).replace('.', ',')}%`;
}

/**
 * Formats an ISO date string (YYYY-MM-DD or full timestamp) to DD/MM/YYYY
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateString || '-';
  }
}

/**
 * Formats an ISO timestamp to DD/MM/YYYY às HH:mm
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}

/**
 * Calculates stock status according to business rules:
 * NORMAL: estoque > estoque mínimo
 * ESTOQUE BAIXO: estoque > 0 e estoque <= estoque mínimo
 * SEM ESTOQUE: estoque = 0 (ou <= 0)
 */
export function calculateStockStatus(stock: number, minimumStock: number): StockStatus {
  const currentStock = Number(stock) || 0;
  const minStock = Number(minimumStock) || 0;
  
  if (currentStock <= 0) {
    return 'out_of_stock';
  }
  if (currentStock <= minStock) {
    return 'low_stock';
  }
  return 'normal';
}

/**
 * Provides human-readable label and visual characteristics for stock status
 */
export function getStockStatusDisplay(status: StockStatus): {
  label: string;
  emoji: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'normal':
      return {
        label: 'Normal',
        emoji: '🟢',
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        dotClass: 'bg-emerald-500'
      };
    case 'low_stock':
      return {
        label: 'Estoque baixo',
        emoji: '🟡',
        badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
        dotClass: 'bg-amber-500'
      };
    case 'out_of_stock':
      return {
        label: 'Sem estoque',
        emoji: '🔴',
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
        dotClass: 'bg-rose-500'
      };
  }
}

/**
 * Gets today's date in YYYY-MM-DD local format
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
