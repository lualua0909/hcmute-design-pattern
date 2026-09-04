import { useEffect, useState } from 'react';
import { Loader2, PackagePlus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { cn, formatDate, MOVEMENT_KIND_LABELS } from '@/lib/utils';

export function InventoryAdmin() {
  const [stock, setStock] = useState(null);
  const [movements, setMovements] = useState([]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [quantity, setQuantity] = useState('10');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.inventory.list().then(setStock).catch((err) => { setStock([]); toast.error(err.message); });
    api.inventory.movements(30).then(setMovements).catch(() => {});
  };

  useEffect(load, []);

  const restock = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.inventory.restock({ productId: target.productId, sku: target.sku, quantity: Number(quantity) });
      toast.success('Đã cập nhật tồn kho', { description: 'Do Inventory Service (Go) xử lý.' });
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kho hàng</h1>
          <p className="text-sm text-muted-foreground">Do service Go quản lý — giữ hàng và trừ kho đi qua RabbitMQ.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" />Làm mới</Button>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Tồn kho</TabsTrigger>
          <TabsTrigger value="movements">Biến động kho</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardContent className="p-0">
              {stock === null ? (
                <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Trong kho</TableHead>
                      <TableHead>Đang giữ</TableHead>
                      <TableHead>Có thể bán</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stock.map((row) => (
                      <TableRow key={row.productId}>
                        <TableCell>#{row.productId}</TableCell>
                        <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                        <TableCell>{row.onHand}</TableCell>
                        <TableCell>{row.reserved}</TableCell>
                        <TableCell className={cn(row.available <= 5 && 'text-destructive font-medium')}>{row.available}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline" size="sm"
                            onClick={() => { setTarget(row); setQuantity('10'); setOpen(true); }}
                          >
                            <PackagePlus className="h-4 w-4" />Nhập thêm
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader><CardTitle>Biến động gần đây</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời điểm</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Đơn hàng</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số lượng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
                      <TableCell>#{m.productId}</TableCell>
                      <TableCell className="font-mono text-xs">{m.orderId || '—'}</TableCell>
                      <TableCell>{MOVEMENT_KIND_LABELS[m.kind] || m.kind}</TableCell>
                      <TableCell>{m.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nhập thêm {target?.sku}</DialogTitle>
            <DialogDescription>Cộng thêm số lượng vào tồn kho. Không nhận giá trị âm.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={restock}>
            <div className="space-y-1.5">
              <Label htmlFor="qty">Số lượng cần thêm</Label>
              <Input id="qty" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Nhập kho
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
