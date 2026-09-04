import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, GENDER_LABELS } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';

export function ProductCard({ product }) {
  const cart = useCart();
  const soldOut = product.stock <= 0;

  return (
    <div className="group flex flex-col">
      <Link to={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
        )}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-semibold uppercase tracking-widest">
            Sold out
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 pt-4">
        <p className="text-sm font-medium text-destructive">{product.sport}</p>
        <Link to={`/products/${product.slug}`} className="font-medium hover:underline">
          {product.name}
        </Link>
        <p className="text-sm text-muted-foreground">
          {GENDER_LABELS[product.gender] || product.gender}
          {product.categoryName ? ` · ${product.categoryName}` : ''}
        </p>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="font-medium">{formatCurrency(product.price)}</p>
            <p className={cn('text-xs', soldOut ? 'text-destructive' : 'text-muted-foreground')}>
              {soldOut ? 'Out of stock' : `${product.stock} in stock`}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={soldOut}
            onClick={() => cart.add(product)}
          >
            <ShoppingCart className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
