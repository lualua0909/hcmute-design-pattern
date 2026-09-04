import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/EmptyState';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export function Cart() {
  const cart = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkout = async () => {
    if (!isAuthenticated) return navigate('/login?redirect=/cart');
    setSubmitting(true);
    try {
      const order = await api.orders.create(
        cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        note || undefined
      );
      cart.clear();
      toast.success('Order placed', { description: 'Inventory is reserving your cards — watch for the confirmation push.' });
      navigate(`/orders?highlight=${order.id}`);
    } catch (err) {
      toast.error('Checkout failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="container py-16">
        <EmptyState
          title="Your cart is empty"
          description="Add a few cards and they will show up here."
          action={<Button asChild><Link to="/products">Browse cards</Link></Button>}
        />
      </div>
    );
  }

  return (
    <div className="container grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>

        {cart.items.map((item) => (
          <div key={item.productId} className="flex gap-4 rounded-xl border p-4">
            <div className="h-24 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain p-1" />}
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.sku}</p>
              <div className="mt-auto flex items-center gap-2">
                <div className="flex items-center rounded-md border">
                  <Button variant="ghost" size="sm" onClick={() => cart.setQuantity(item.productId, item.quantity - 1)}>−</Button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <Button variant="ghost" size="sm" onClick={() => cart.setQuantity(item.productId, item.quantity + 1)}>+</Button>
                </div>
                <Button variant="ghost" size="icon" onClick={() => cart.remove(item.productId)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>

      <Card className="h-fit">
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Items</span><span>{cart.count}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span><span>Free</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span><span>{formatCurrency(cart.total)}</span>
          </div>

          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Order note (optional)" />

          <Button className="w-full" size="lg" onClick={checkout} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isAuthenticated ? 'Place order' : 'Sign in to checkout'}
          </Button>
          <p className="text-xs text-muted-foreground">
            The order is accepted immediately and confirmed once inventory and analytics both commit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
