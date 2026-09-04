import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { CartProvider } from '@/hooks/useCart';
import { ShopLayout } from '@/layouts/ShopLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Home } from '@/pages/Home';
import { Products } from '@/pages/Products';
import { ProductDetail } from '@/pages/ProductDetail';
import { Cart } from '@/pages/Cart';
import { Orders } from '@/pages/Orders';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/cms/Dashboard';
import { ProductsAdmin } from '@/pages/cms/ProductsAdmin';
import { InventoryAdmin } from '@/pages/cms/InventoryAdmin';
import { OrdersAdmin } from '@/pages/cms/OrdersAdmin';
import { AnalyticsAdmin } from '@/pages/cms/AnalyticsAdmin';
import { UsersAdmin } from '@/pages/cms/UsersAdmin';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function RequireAuth({ children, admin = false }) {
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;
  if (!isAuthenticated) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route element={<ShopLayout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:slug" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="orders" element={<RequireAuth><Orders /></RequireAuth>} />
            <Route path="login" element={<Login />} />
          </Route>

          <Route path="/cms" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductsAdmin />} />
            <Route path="inventory" element={<InventoryAdmin />} />
            <Route path="orders" element={<OrdersAdmin />} />
            <Route path="analytics" element={<AnalyticsAdmin />} />
            <Route path="users" element={<UsersAdmin />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster position="top-right" richColors closeButton />
      </CartProvider>
    </AuthProvider>
  );
}
