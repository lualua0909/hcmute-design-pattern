import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { api } from '@/lib/api';
import { GENDER_LABELS } from '@/lib/utils';

const SORTS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá: thấp đến cao' },
  { value: 'price_desc', label: 'Giá: cao đến thấp' },
  { value: 'name', label: 'Tên A–Z' },
];

export function Products() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [sports, setSports] = useState([]);
  const [search, setSearch] = useState(params.get('q') || '');

  const query = useMemo(() => ({
    q: params.get('q') || undefined,
    category: params.get('category') || undefined,
    gender: params.get('gender') || undefined,
    sport: params.get('sport') || undefined,
    sort: params.get('sort') || 'newest',
    page: Number(params.get('page') || 1),
    limit: 12,
  }), [params]);

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
    api.products.facets().then((r) => setSports(r.sports)).catch(() => {});
  }, []);

  useEffect(() => {
    setData(null);
    api.products.list(query).then(setData).catch(() => setData({ items: [], pagination: { page: 1, pages: 0 } }));
  }, [query]);

  const patch = (next) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === 'all') merged.delete(key);
      else merged.set(key, value);
    });
    if (!('page' in next)) merged.delete('page');
    setParams(merged);
  };

  return (
    <div className="container space-y-8 py-10">
      <div className="space-y-2">
        <h1 className="display text-3xl">
          {GENDER_LABELS[params.get('gender')] ? `Đồ thể thao ${GENDER_LABELS[params.get('gender')]}` : 'Tất cả sản phẩm'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.pagination.total} sản phẩm` : 'Đang tải danh mục…'}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form
          className="relative flex-1"
          onSubmit={(e) => { e.preventDefault(); patch({ q: search }); }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, SKU hoặc môn thể thao…"
            className="pl-9"
          />
        </form>

        <Select value={params.get('category') || 'all'} onValueChange={(v) => patch({ category: v })}>
          <SelectTrigger className="md:w-48"><SelectValue placeholder="Danh mục" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={params.get('gender') || 'all'} onValueChange={(v) => patch({ gender: v })}>
          <SelectTrigger className="md:w-40"><SelectValue placeholder="Đối tượng" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi đối tượng</SelectItem>
            {Object.entries(GENDER_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={params.get('sport') || 'all'} onValueChange={(v) => patch({ sport: v })}>
          <SelectTrigger className="md:w-44"><SelectValue placeholder="Môn thể thao" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả bộ môn</SelectItem>
            {sports.map((s) => <SelectItem key={s.sport} value={s.sport}>{s.sport} · {s.count}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={query.sort} onValueChange={(v) => patch({ sort: v })}>
          <SelectTrigger className="md:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {data === null && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      )}

      {data && data.items.length === 0 && (
        <EmptyState title="Không có sản phẩm nào khớp bộ lọc" description="Thử xoá từ khoá tìm kiếm hoặc chọn bộ môn khác." />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>

          {data.pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline" size="sm"
                disabled={data.pagination.page <= 1}
                onClick={() => patch({ page: String(data.pagination.page - 1) })}
              >
                Trang trước
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {data.pagination.page} / {data.pagination.pages}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={data.pagination.page >= data.pagination.pages}
                onClick={() => patch({ page: String(data.pagination.page + 1) })}
              >
                Trang sau
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
