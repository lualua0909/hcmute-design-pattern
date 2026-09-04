import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, RARITY_LABELS, RARITY_STYLES } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';

export function ProductCard({ product }) {
  const cart = useCart();
  const soldOut = product.stock <= 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <Link to={`/products/${product.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-muted">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
        )}
        <Badge className={cn('absolute left-3 top-3 border-0', RARITY_STYLES[product.rarity])}>
          {RARITY_LABELS[product.rarity] || product.rarity}
        </Badge>
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-semibold">
            Sold out
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <Link to={`/products/${product.slug}`} className="line-clamp-1 font-medium hover:underline">
            {product.name}
          </Link>
          <p className="text-xs text-muted-foreground">{product.cardSet || product.sku}</p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div>
            <p className="text-lg font-semibold">{formatCurrency(product.price)}</p>
            <p className="text-xs text-muted-foreground">{product.stock} in stock</p>
          </div>
          <Button size="sm" disabled={soldOut} onClick={() => cart.add(product)}>
            <ShoppingCart className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
