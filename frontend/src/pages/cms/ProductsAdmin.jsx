import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { cn, formatCurrency, RARITY_LABELS, RARITY_STYLES } from '@/lib/utils';

const EMPTY = {
  sku: '', name: '', slug: '', description: '', imageUrl: '',
  price: '', categoryId: '', rarity: 'common', cardSet: '', status: 'published', stock: '',
};

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function ProductsAdmin() {
  const [rows, setRows] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.products.list({ limit: 60, q: search || undefined })
      .then((r) => setRows(r.items))
      .catch((err) => toast.error(err.message));

  useEffect(() => { load(); api.categories.list().then(setCategories).catch(() => {}); /* eslint-disable-next-line */ }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      sku: product.sku, name: product.name, slug: product.slug,
      description: product.description || '', imageUrl: product.imageUrl || '',
      price: String(product.price), categoryId: product.categoryId ? String(product.categoryId) : '',
      rarity: product.rarity, cardSet: product.cardSet || '', status: product.status,
      stock: String(product.stock ?? ''),
    });
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);

    // The gateway owns the product row; the stock number is forwarded to the
    // Inventory Service over RabbitMQ, never written directly.
    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      description: form.description || null,
      imageUrl: form.imageUrl || null,
      price: Number(form.price),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      rarity: form.rarity,
      cardSet: form.cardSet || null,
      status: form.status,
      ...(form.stock === '' ? {} : { stock: Number(form.stock) }),
    };

    try {
      if (editing) {
        await api.products.update(editing.id, payload);
        toast.success('Product updated', { description: 'Inventory Service notified over RabbitMQ.' });
      } else {
        await api.products.create(payload);
        toast.success('Product created', { description: 'Stock row is being opened by the Inventory Service.' });
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error('Save failed', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Archive "${product.name}"? Order history is kept.`)) return;
    try {
      await api.products.remove(product.id);
      toast.success('Product archived');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Create, edit and archive the catalogue.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />New product</Button>
      </div>

      <form className="relative max-w-sm" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </form>

      <Card>
        <CardContent className="p-0">
          {rows === null ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Rarity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-8 shrink-0 overflow-hidden rounded bg-muted">
                          {product.imageUrl && <img src={product.imageUrl} alt="" className="h-full w-full object-contain" />}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border-0', RARITY_STYLES[product.rarity])}>
                        {RARITY_LABELS[product.rarity]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell className={cn(product.stock <= 5 && 'text-destructive')}>{product.stock}</TableCell>
                    <TableCell className="capitalize">{product.status}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(product)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit product' : 'New product'}</DialogTitle>
            <DialogDescription>
              Saving publishes a <code>product.*</code> event; the Inventory Service applies the stock change.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" required {...field('sku')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name" required value={form.name}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                  slug: prev.slug && editing ? prev.slug : slugify(e.target.value),
                }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" required {...field('slug')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (USD)</Label>
              <Input id="price" type="number" step="0.01" min="0" required {...field('price')} />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId || 'none'} onValueChange={(v) => setForm((p) => ({ ...p, categoryId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Uncategorised" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorised</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Rarity</Label>
              <Select value={form.rarity} onValueChange={(v) => setForm((p) => ({ ...p, rarity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RARITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cardSet">Card set</Label>
              <Input id="cardSet" {...field('cardSet')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stock">{editing ? 'Set stock to' : 'Initial stock'}</Label>
              <Input id="stock" type="number" min="0" placeholder="leave empty to keep" {...field('stock')} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input id="imageUrl" type="url" {...field('imageUrl')} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...field('description')} />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
