import { Link, NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Boxes, LayoutDashboard, Package, Receipt, Store, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const LINKS = [
  { to: '/cms', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/cms/products', label: 'Products', icon: Package },
  { to: '/cms/inventory', label: 'Inventory', icon: Boxes },
  { to: '/cms/orders', label: 'Orders', icon: Receipt },
  { to: '/cms/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/cms/users', label: 'Users', icon: Users },
];

export function AdminLayout() {
  const { profile } = useAuth();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 border-r bg-background lg:block">
        <div className="flex h-16 items-center gap-2 border-b px-6 font-semibold">
          <img src="/pokeball.svg" alt="" className="h-5 w-5" />
          PokeShop CMS
        </div>
        <nav className="space-y-1 p-3">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-secondary font-medium' : 'text-muted-foreground hover:bg-accent')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
          <div className="lg:hidden font-semibold">PokeShop CMS</div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{profile?.email}</span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/"><Store className="h-4 w-4" />Storefront</Link>
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-x-hidden p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
