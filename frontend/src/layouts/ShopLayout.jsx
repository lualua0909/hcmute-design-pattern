import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, ShoppingCart, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/products?gender=men', label: 'Nam' },
  { to: '/products?gender=women', label: 'Nữ' },
  { to: '/products?gender=kids', label: 'Trẻ em' },
  { to: '/products', label: 'Tất cả' },
  { to: '/orders', label: 'Đơn hàng' },
];

export function ShopLayout() {
  const { profile, isAdmin, signOut } = useAuth();
  const cart = useCart();
  const location = useLocation();
  // NavLink ignores the query string, and the gender links only differ by it.
  const current = `${location.pathname}${location.search}`;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b bg-secondary">
        <div className="container flex h-9 items-center justify-end gap-4 text-xs font-medium">
          <span className="text-muted-foreground">Miễn phí giao hàng cho đơn từ 2.000.000 ₫</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Đổi trả trong 30 ngày</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="container flex h-16 items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <img src="/sporthub.svg" alt="" className="h-8 w-8" />
            <span className="display text-xl">SportHub</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn('px-3 py-2 text-sm font-medium transition-colors hover:text-foreground',
                  current === item.to ? 'text-foreground underline underline-offset-8' : 'text-muted-foreground')}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link to="/cart">
                <ShoppingCart className="h-5 w-5" />
                {cart.count > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {cart.count}
                  </span>
                )}
              </Link>
            </Button>

            {profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Avatar>
                      {profile.photoUrl && <AvatarImage src={profile.photoUrl} alt={profile.displayName || profile.email} />}
                      <AvatarFallback>{(profile.displayName || profile.email || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{profile.displayName || 'Athlete'}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/orders"><User className="h-4 w-4" />Đơn hàng của tôi</Link></DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild><Link to="/cms"><LayoutDashboard className="h-4 w-4" />Trang quản trị</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => signOut()}><LogOut className="h-4 w-4" />Đăng xuất</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm"><Link to="/login">Đăng nhập</Link></Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground md:flex-row">
          <p>SportHub — đồ án microservices (C4 + RabbitMQ + Firebase)</p>
          <p>HCMUTE · Thiết kế thành phần &amp; Kiến trúc hệ thống</p>
        </div>
      </footer>
    </div>
  );
}
