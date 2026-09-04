import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Boxes, DollarSign, Package, Receipt, Users } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [top, setTop] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.analytics.overview(30),
      api.analytics.revenue(14),
      api.analytics.topProducts(5, 30),
    ])
      .then(([o, r, t]) => { setOverview(o); setRevenue(r.series); setTop(t.items); })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Analytics unavailable</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{error}</p>
          <p>Check that the Analytics Service (FastAPI) container is running on port 8000.</p>
        </CardContent>
      </Card>
    );
  }

  if (!overview) {
    return <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Last {overview.windowDays} days · served by the Analytics Service</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat icon={DollarSign} label="Revenue" value={formatCurrency(overview.revenue)} hint={`AOV ${formatCurrency(overview.averageOrderValue)}`} />
        <Stat icon={Receipt} label="Orders" value={overview.orders} hint={`${overview.ordersInFlight} in flight`} />
        <Stat icon={Boxes} label="Items sold" value={overview.itemsSold} />
        <Stat icon={Users} label="Customers" value={overview.customers} />
        <Stat icon={Package} label="Published products" value={overview.publishedProducts} hint={`${overview.unitsAvailable} units available`} />
        <Stat icon={AlertTriangle} label="Low stock" value={overview.lowStockProducts} hint="5 units or fewer" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Revenue (14 days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tickFormatter={(d) => d.slice(5)} tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top sellers</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {top.length === 0 && <p className="text-sm text-muted-foreground">No sales recorded yet.</p>}
            {top.map((item, index) => (
              <div key={item.productId} className="flex items-center gap-3">
                <span className="w-5 text-sm text-muted-foreground">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.units} sold</p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/cms/analytics">Full report</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
