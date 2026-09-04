import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/ProductCard';
import { api } from '@/lib/api';

const PERKS = [
  { icon: ShieldCheck, title: 'Hàng chính hãng 100%', text: 'Mọi sản phẩm đều lấy trực tiếp từ nhà phân phối chính thức.' },
  { icon: Truck, title: 'Miễn phí giao hàng từ 2 triệu', text: 'Đơn nào cũng có mã vận đơn để theo dõi.' },
  { icon: RotateCcw, title: 'Đổi trả trong 30 ngày', text: 'Mang thử, chạy thử, không vừa ý thì gửi lại.' },
];

const SHOP_BY = [
  { label: 'Nam', to: '/products?gender=men' },
  { label: 'Nữ', to: '/products?gender=women' },
  { label: 'Trẻ em', to: '/products?gender=kids' },
  { label: 'Chạy bộ', to: '/products?sport=Ch%E1%BA%A1y%20b%E1%BB%99' },
  { label: 'Bóng rổ', to: '/products?sport=B%C3%B3ng%20r%E1%BB%95' },
  { label: 'Bóng đá', to: '/products?sport=B%C3%B3ng%20%C4%91%C3%A1' },
];

export function Home() {
  const [featured, setFeatured] = useState(null);
  const [hero, setHero] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.products.list({ limit: 8, sort: 'price_desc' })
      .then((r) => { setFeatured(r.items); setHero(r.items[0] || null); })
      .catch(() => setFeatured([]));
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  return (
    <>
      <section className="border-b bg-secondary">
        <div className="container grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="space-y-6">
            <p className="eyebrow text-destructive">Hàng mới về</p>
            <h1 className="display text-5xl md:text-7xl">
              Bứt<br />tốc<br />hết mình.
            </h1>
            <p className="max-w-md text-muted-foreground">
              Giày, quần áo và phụ kiện cho chạy bộ, bóng rổ, bóng đá, golf và mọi bộ môn khác —
              tồn kho được giữ chỗ theo thời gian thực bởi Inventory Service.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/products">Mua sắm ngay <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/products?sport=Ch%E1%BA%A1y%20b%E1%BB%99">Đồ chạy bộ</Link>
              </Button>
            </div>
          </div>

          <div className="relative aspect-square overflow-hidden bg-background">
            {hero?.imageUrl ? (
              <Link to={`/products/${hero.slug}`}>
                <img src={hero.imageUrl} alt={hero.name} className="h-full w-full object-cover" />
              </Link>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </div>
      </section>

      <section className="container grid gap-6 py-12 md:grid-cols-3">
        {PERKS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4 border p-5">
            <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="container space-y-4 pb-8">
        <h2 className="display text-2xl">Mua theo</h2>
        <div className="flex flex-wrap gap-2">
          {SHOP_BY.map((item) => (
            <Button key={item.to} variant="outline" size="sm" className="rounded-full" asChild>
              <Link to={item.to}>{item.label}</Link>
            </Button>
          ))}
          {categories.map((c) => (
            <Button key={c.id} variant="outline" size="sm" className="rounded-full" asChild>
              <Link to={`/products?category=${c.id}`}>{c.name} · {c.productCount}</Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="container space-y-6 pb-20">
        <div className="flex items-end justify-between">
          <h2 className="display text-2xl">Đang thịnh hành</h2>
          <Button variant="ghost" asChild><Link to="/products">Xem tất cả <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured === null
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80" />)
            : featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </>
  );
}
