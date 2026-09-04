import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { cn, formatCurrency, GENDER_LABELS, GENDER_STYLES } from '@/lib/utils';

export function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setProduct(null);
    api.products.get(slug).then(setProduct).catch(() => setProduct(false));
  }, [slug]);

  if (product === false) {
    return (
      <div className="container py-20 text-center">
        <p className="text-lg font-medium">Product not found</p>
        <Button variant="link" asChild><Link to="/products">Back to the shop</Link></Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container grid gap-10 py-10 md:grid-cols-2">
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  const soldOut = product.stock <= 0;

  return (
    <div className="container py-10">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4" />Back
      </Button>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden bg-muted">
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn('border-0', GENDER_STYLES[product.gender])}>
                {GENDER_LABELS[product.gender] || product.gender}
              </Badge>
              {product.categoryName && <Badge variant="outline">{product.categoryName}</Badge>}
              {product.sport && <Badge variant="outline">{product.sport}</Badge>}
            </div>
            <h1 className="display text-3xl">{product.name}</h1>
            <p className="text-sm text-muted-foreground">SKU {product.sku}</p>
          </div>

          <p className="text-4xl font-semibold">{formatCurrency(product.price)}</p>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {product.description || 'No description provided for this product yet.'}
          </p>

          <Separator />

          <div className="space-y-4">
            <p className={cn('text-sm', soldOut ? 'text-destructive' : 'text-muted-foreground')}>
              {soldOut ? 'Out of stock' : `${product.stock} available`}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-md border">
                <Button variant="ghost" size="icon" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => setQuantity((q) => Math.min(product.stock || 1, q + 1))}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button size="lg" className="rounded-full" disabled={soldOut} onClick={() => cart.add(product, quantity)}>
                <ShoppingCart className="h-4 w-4" />Add to cart
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
