import { useEffect, useState } from 'react';
import { RefreshCw, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export function OrdersAdmin() {
  const [orders, setOrders] = useState(null);

  const load = () => api.orders.list().then(setOrders).catch((err) => { setOrders([]); toast.error(err.message); });

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, []);

  const retry = async (id) => {
    try {
      await api.orders.retry(id);
      toast.success('Đã phát lại saga', { description: 'Sự kiện order.created đã được gửi lại.' });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Đơn hàng</h1>
          <p className="text-sm text-muted-foreground">Trạng thái được dựng lại từ các sự kiện saga trên RabbitMQ.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" />Làm mới</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders === null ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Số lượng</TableHead>
                  <TableHead>Tổng tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Đặt lúc</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell className="text-xs">{order.userId}</TableCell>
                    <TableCell>{order.items.reduce((n, i) => n + i.quantity, 0)}</TableCell>
                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                      {order.failReason && <p className="mt-1 max-w-56 text-xs text-destructive">{order.failReason}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {['pending', 'failed'].includes(order.status) && (
                        <Button variant="ghost" size="sm" onClick={() => retry(order.id)}>
                          <RotateCw className="h-4 w-4" />Phát lại
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
