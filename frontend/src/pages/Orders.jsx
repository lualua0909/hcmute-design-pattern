import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export function Orders() {
  const [params] = useSearchParams();
  const highlight = params.get('highlight');
  const [orders, setOrders] = useState(null);

  const load = () => api.orders.list().then(setOrders).catch(() => setOrders([]));

  useEffect(() => {
    load();
    // Saga finishes asynchronously - poll while anything is still in flight.
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  if (orders === null) {
    return <div className="container space-y-4 py-10">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="container py-16">
        <EmptyState
          title="Chưa có đơn hàng nào"
          description="Đơn hàng và trạng thái saga của bạn sẽ hiển thị ở đây."
          action={<Button asChild><Link to="/products">Bắt đầu mua sắm</Link></Button>}
        />
      </div>
    );
  }

  return (
    <div className="container space-y-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="display text-3xl">Đơn hàng của tôi</h1>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" />Làm mới</Button>
      </div>

      {orders.map((order) => (
        <Card key={order.id} className={cn(order.id === highlight && 'ring-2 ring-ring')}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">{order.id}</CardTitle>
              <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={order.status} />
              {['pending', 'reserved'].includes(order.status) && (
                <Button
                  variant="outline" size="sm"
                  onClick={() => api.orders.cancel(order.id).then(load).then(() => toast.success('Đã huỷ đơn hàng'))}
                >
                  Huỷ đơn
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span>{item.name} <span className="text-muted-foreground">× {item.quantity}</span></span>
                <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Tổng cộng</span><span>{formatCurrency(order.totalAmount)}</span>
            </div>
            {order.failReason && <p className="text-sm text-destructive">{order.failReason}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
