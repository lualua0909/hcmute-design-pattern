import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatCurrency, GENDER_LABELS } from '@/lib/utils';

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#64748b'];

export function AnalyticsAdmin() {
  const [days, setDays] = useState('30');
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    const window = Number(days);
    Promise.all([
      api.analytics.revenue(window),
      api.analytics.topProducts(8, window),
      api.analytics.genderMix(window),
    ])
      .then(([revenue, top, mix]) => setData({ revenue: revenue.series, top: top.items, mix: mix.items }))
      .catch(() => setData({ revenue: [], top: [], mix: [] }));
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Báo cáo</h1>
          <p className="text-sm text-muted-foreground">Số liệu do service FastAPI tính từ bảng fact bán hàng.</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 ngày gần nhất</SelectItem>
            <SelectItem value="30">30 ngày gần nhất</SelectItem>
            <SelectItem value="90">90 ngày gần nhất</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!data ? (
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Doanh thu &amp; đơn hàng</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenue} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tickFormatter={(d) => d.slice(5)} tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Doanh thu" />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Đơn hàng" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sản phẩm doanh thu cao nhất</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.top} layout="vertical" margin={{ left: 24, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis type="category" dataKey="sku" width={110} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Doanh thu theo đối tượng</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.mix}
                    dataKey="revenue"
                    nameKey="gender"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {data.mix.map((entry, index) => <Cell key={entry.gender} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [formatCurrency(value), GENDER_LABELS[name] || name]} />
                  <Legend formatter={(value) => GENDER_LABELS[value] || value} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
