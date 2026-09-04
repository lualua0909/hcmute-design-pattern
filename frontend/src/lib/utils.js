import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    .format(Number(value || 0));

export const formatDate = (value) =>
  value ? new Date(String(value).replace(' ', 'T')).toLocaleString('vi-VN') : '—';

export const GENDER_LABELS = {
  men: 'Nam',
  women: 'Nữ',
  kids: 'Trẻ em',
  unisex: 'Unisex',
};

export const GENDER_STYLES = {
  men: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  women: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  kids: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  unisex: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const ORDER_STATUS_LABELS = {
  pending: 'Chờ xử lý',
  reserved: 'Đã giữ hàng',
  confirmed: 'Đã xác nhận',
  failed: 'Thất bại',
  cancelled: 'Đã huỷ',
};

export const MOVEMENT_KIND_LABELS = {
  reserve: 'Giữ hàng',
  release: 'Nhả hàng',
  commit: 'Trừ kho',
  restock: 'Nhập kho',
  adjust: 'Điều chỉnh',
};

export const ROLE_LABELS = { admin: 'Quản trị', customer: 'Khách hàng' };

export const ORDER_STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  reserved: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};
