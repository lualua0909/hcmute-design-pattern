import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/ProductCard';
import { api } from '@/lib/api';

const PERKS = [
  { icon: ShieldCheck, title: 'Graded & authentic', text: 'Every single card is verified before it ships.' },
  { icon: Truck, title: 'Tracked shipping', text: 'Sleeved, toploadered and sent with tracking.' },
  { icon: Sparkles, title: 'Live stock', text: 'Stock is reserved the moment you order.' },
];

export function Home() {
  const [featured, setFeatured] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.products.list({ limit: 8, sort: 'price_desc' }).then((r) => setFeatured(r.items)).catch(() => setFeatured([]));
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  return (
    <>
      <section className="border-b bg-gradient-to-b from-muted/60 to-background">
        <div className="container grid gap-10 py-20 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Pokémon TCG marketplace</p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Collect the cards<br />you actually want.
            </h1>
            <p className="max-w-md text-muted-foreground">
              Singles, sealed boosters and elite trainer boxes — priced fairly, shipped safely,
              with stock reserved in real time by our inventory service.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/products">Browse cards <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/products?rarity=secret_rare">Chase cards</Link></Button>
            </div>
          </div>

          <div className="relative aspect-square rounded-2xl border bg-card p-8">
            <img
              src="https://images.pokemontcg.io/swsh12/186_hires.png"
              alt="Featured Pokémon card"
              className="h-full w-full object-contain drop-shadow-xl"
            />
          </div>
        </div>
      </section>

      <section className="container grid gap-6 py-12 md:grid-cols-3">
        {PERKS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4 rounded-xl border p-5">
            <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {categories.length > 0 && (
        <section className="container pb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Button key={c.id} variant="outline" size="sm" asChild>
                <Link to={`/products?category=${c.id}`}>{c.name} · {c.productCount}</Link>
              </Button>
            ))}
          </div>
        </section>
      )}

      <section className="container space-y-6 pb-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Featured</h2>
            <p className="text-sm text-muted-foreground">The most valuable cards in the vault right now.</p>
          </div>
          <Button variant="ghost" asChild><Link to="/products">View all <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured === null
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80" />)
            : featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </>
  );
}
