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
import { RARITY_LABELS } from '@/lib/utils';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

export function Products() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(params.get('q') || '');

  const query = useMemo(() => ({
    q: params.get('q') || undefined,
    category: params.get('category') || undefined,
    rarity: params.get('rarity') || undefined,
    sort: params.get('sort') || 'newest',
    page: Number(params.get('page') || 1),
    limit: 12,
  }), [params]);

  useEffect(() => { api.categories.list().then(setCategories).catch(() => {}); }, []);

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
        <h1 className="text-3xl font-semibold tracking-tight">Pokémon cards</h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.pagination.total} products` : 'Loading catalogue…'}
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
            placeholder="Search by name, SKU or set…"
            className="pl-9"
          />
        </form>

        <Select value={params.get('category') || 'all'} onValueChange={(v) => patch({ category: v })}>
          <SelectTrigger className="md:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={params.get('rarity') || 'all'} onValueChange={(v) => patch({ rarity: v })}>
          <SelectTrigger className="md:w-44"><SelectValue placeholder="Rarity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rarities</SelectItem>
            {Object.entries(RARITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
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
        <EmptyState title="No cards match those filters" description="Try clearing the search or picking another rarity." />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>

          {data.pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline" size="sm"
                disabled={data.pagination.page <= 1}
                onClick={() => patch({ page: String(data.pagination.page - 1) })}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.pages}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={data.pagination.page >= data.pagination.pages}
                onClick={() => patch({ page: String(data.pagination.page + 1) })}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
