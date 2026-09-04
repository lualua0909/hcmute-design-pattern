import { Link, NavLink, Outlet } from 'react-router-dom';
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
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Cards' },
  { to: '/orders', label: 'My orders' },
];

export function ShopLayout() {
  const { profile, isAdmin, signOut } = useAuth();
  const cart = useCart();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="container flex h-16 items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <img src="/pokeball.svg" alt="" className="h-6 w-6" />
            PokeShop
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn('rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                    isActive ? 'font-medium text-foreground' : 'text-muted-foreground')}
              >
                {item.label}
              </NavLink>
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
                    <p className="text-sm font-medium">{profile.displayName || 'Trainer'}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/orders"><User className="h-4 w-4" />My orders</Link></DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild><Link to="/cms"><LayoutDashboard className="h-4 w-4" />CMS</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => signOut()}><LogOut className="h-4 w-4" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm"><Link to="/login">Sign in</Link></Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground md:flex-row">
          <p>PokeShop — microservices demo (C4 + RabbitMQ + Firebase)</p>
          <p>HCMUTE · Component Design &amp; System Architecture</p>
        </div>
      </footer>
    </div>
  );
}
