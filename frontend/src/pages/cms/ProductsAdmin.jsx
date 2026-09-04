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
import { cn, formatCurrency, GENDER_LABELS, GENDER_STYLES, PRODUCT_STATUS_LABELS } from '@/lib/utils';

const EMPTY = {
  sku: '', name: '', slug: '', description: '', imageUrl: '',
  price: '', categoryId: '', gender: 'unisex', sport: '', status: 'published', stock: '',
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
      gender: product.gender, sport: product.sport || '', status: product.status,
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
      gender: form.gender,
      sport: form.sport || null,
      status: form.status,
      ...(form.stock === '' ? {} : { stock: Number(form.stock) }),
    };

    try {
      if (editing) {
        await api.products.update(editing.id, payload);
        toast.success('Đã cập nhật sản phẩm', { description: 'Inventory Service đã được báo qua RabbitMQ.' });
      } else {
        await api.products.create(payload);
        toast.success('Đã tạo sản phẩm', { description: 'Inventory Service đang mở dòng tồn kho tương ứng.' });
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error('Lưu thất bại', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Lưu trữ "${product.name}"? Lịch sử đơn hàng vẫn được giữ lại.`)) return;
    try {
      await api.products.remove(product.id);
      toast.success('Đã lưu trữ sản phẩm');
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
          <h1 className="text-2xl font-semibold tracking-tight">Sản phẩm</h1>
          <p className="text-sm text-muted-foreground">Tạo, sửa và lưu trữ danh mục sản phẩm.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Thêm sản phẩm</Button>
      </div>

      <form className="relative max-w-sm" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Tìm sản phẩm…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </form>

      <Card>
        <CardContent className="p-0">
          {rows === null ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Đối tượng</TableHead>
                  <TableHead>Giá</TableHead>
                  <TableHead>Tồn kho</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden bg-muted">
                          {product.imageUrl && <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border-0', GENDER_STYLES[product.gender])}>
                        {GENDER_LABELS[product.gender]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell className={cn(product.stock <= 5 && 'text-destructive')}>{product.stock}</TableCell>
                    <TableCell>{PRODUCT_STATUS_LABELS[product.status] || product.status}</TableCell>
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
            <DialogTitle>{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle>
            <DialogDescription>
              Khi lưu, hệ thống phát sự kiện <code>product.*</code>; Inventory Service sẽ cập nhật tồn kho.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" required {...field('sku')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Tên sản phẩm</Label>
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
              <Label htmlFor="price">Giá (VND)</Label>
              <Input id="price" type="number" step="1000" min="0" required {...field('price')} />
            </div>

            <div className="space-y-1.5">
              <Label>Danh mục</Label>
              <Select value={form.categoryId || 'none'} onValueChange={(v) => setForm((p) => ({ ...p, categoryId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Chưa phân loại" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chưa phân loại</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Đối tượng</Label>
              <Select value={form.gender} onValueChange={(v) => setForm((p) => ({ ...p, gender: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GENDER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sport">Môn thể thao</Label>
              <Input id="sport" placeholder="Chạy bộ, Bóng rổ…" {...field('sport')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stock">{editing ? 'Đặt tồn kho thành' : 'Tồn kho ban đầu'}</Label>
              <Input id="stock" type="number" min="0" placeholder="để trống nếu giữ nguyên" {...field('stock')} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="imageUrl">Đường dẫn ảnh</Label>
              <Input id="imageUrl" type="url" {...field('imageUrl')} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea id="description" {...field('description')} />
            </div>

            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Đang bán</SelectItem>
                  <SelectItem value="draft">Bản nháp</SelectItem>
                  <SelectItem value="archived">Đã lưu trữ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
