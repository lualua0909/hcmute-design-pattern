import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));

export const formatDate = (value) =>
  value ? new Date(String(value).replace(' ', 'T')).toLocaleString() : '—';

export const RARITY_LABELS = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  holo_rare: 'Holo Rare',
  ultra_rare: 'Ultra Rare',
  secret_rare: 'Secret Rare',
};

export const RARITY_STYLES = {
  common: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  uncommon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rare: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  holo_rare: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  ultra_rare: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  secret_rare: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

export const ORDER_STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  reserved: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};
