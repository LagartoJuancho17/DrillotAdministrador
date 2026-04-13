import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Truck
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const [chartFilter, setChartFilter] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [rawData, setRawData] = useState({ orders: [] as any[], supplies: [] as any[], adSpend: [] as any[] });
  const [stats, setStats] = useState({
    totalSales: 0,
    ordersCount: 0,
    clientsCount: 0,
    lowStockCount: 0,
    pendingOrders: 0,
    shippingCount: 0,
    totalCosts: 0,
    totalMarketing: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch Orders
      const { data: orders } = await supabase.from('orders').select('total, status, created_at');
      const totalSales = orders?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0;
      const ordersCount = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pendiente').length || 0;

      // Fetch Clients
      const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });

      // Fetch Low Stock
      const { data: allProds } = await supabase.from('products').select('stock_actual, stock_minimo');
      const lowStockCount = allProds?.filter(p => p.stock_actual < p.stock_minimo).length || 0;

      // Fetch Supplies (Costs)
      const { data: supplies } = await supabase.from('supplies').select('total_cost, purchase_date');
      const totalCosts = supplies?.reduce((acc, curr) => acc + Number(curr.total_cost), 0) || 0;

      // Fetch Marketing (Ad Spend)
      const { data: adSpend } = await supabase.from('ad_spend').select('amount, date');
      const totalMarketing = adSpend?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setRawData({
        orders: orders || [],
        supplies: supplies || [],
        adSpend: adSpend || []
      });

      setStats({
        totalSales,
        ordersCount,
        clientsCount: clientsCount || 0,
        lowStockCount: lowStockCount || 0,
        pendingOrders,
        shippingCount: 0, // Placeholder
        totalCosts,
        totalMarketing
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartDataArray = useMemo(() => {
    const { orders, supplies, adSpend } = rawData;
    const now = new Date();
    
    let buckets: Record<string, { label: string, date: Date, ganancias: number }> = {};
    let periods = 0;
    
    if (chartFilter === 'dia') {
       periods = 14;
       for (let i = periods - 1; i >= 0; i--) {
         const d = subDays(startOfDay(now), i);
         const key = format(d, 'yyyy-MM-dd');
         buckets[key] = { label: format(d, 'd MMM', { locale: es }), date: d, ganancias: 0 };
       }
    } else if (chartFilter === 'semana') {
       periods = 8;
       for (let i = periods - 1; i >= 0; i--) {
         const d = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i);
         const key = format(d, 'yyyy-ww');
         buckets[key] = { label: `Sem ${format(d, 'w')}`, date: d, ganancias: 0 };
       }
    } else {
       periods = 6;
       for (let i = periods - 1; i >= 0; i--) {
         const d = subMonths(startOfMonth(now), i);
         const key = format(d, 'yyyy-MM');
         buckets[key] = { label: format(d, 'MMM yyy', { locale: es }), date: d, ganancias: 0 };
       }
    }
    
    // Sumar Ventas (Ingresos)
    orders.forEach((o: any) => {
       const d = new Date(o.created_at);
       let key = '';
       if (chartFilter === 'dia') key = format(startOfDay(d), 'yyyy-MM-dd');
       else if (chartFilter === 'semana') key = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-ww');
       else key = format(startOfMonth(d), 'yyyy-MM');
       
       if (buckets[key]) buckets[key].ganancias += Number(o.total || 0);
    });

    // Restar Costos (Insumos)
    supplies.forEach((s: any) => {
       // if s.purchase_date is string "yyyy-mm-dd", keep it within timezone using T00:00 or let JS parse it
       const d = new Date(s.purchase_date + 'T12:00:00');
       let key = '';
       if (chartFilter === 'dia') key = format(startOfDay(d), 'yyyy-MM-dd');
       else if (chartFilter === 'semana') key = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-ww');
       else key = format(startOfMonth(d), 'yyyy-MM');
       if (buckets[key]) buckets[key].ganancias -= Number(s.total_cost || 0);
    });

    // Restar Marketing
    adSpend.forEach((a: any) => {
       const d = new Date(a.date + 'T12:00:00');
       let key = '';
       if (chartFilter === 'dia') key = format(startOfDay(d), 'yyyy-MM-dd');
       else if (chartFilter === 'semana') key = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-ww');
       else key = format(startOfMonth(d), 'yyyy-MM');
       if (buckets[key]) buckets[key].ganancias -= Number(a.amount || 0);
    });
    
    return Object.values(buckets);
  }, [chartFilter, rawData]);

  const netProfit = stats.totalSales - stats.totalCosts - stats.totalMarketing;

  return (
    <div className="space-y-8">
      {/* Profit Card Section */}
      <Card className="border-none shadow-md bg-gradient-to-r from-violet-600 to-violet-900 text-white">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-1 text-center md:text-left">
              <p className="text-violet-100 text-sm font-medium">Ganancia Neta Estimada</p>
              <h2 className="text-4xl font-bold">${netProfit.toLocaleString()}</h2>
              <p className="text-violet-200 text-xs">Ventas - (Insumos + Marketing)</p>
            </div>
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-violet-100 text-xs mb-1">Ventas</p>
                <p className="font-bold">${stats.totalSales.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-violet-100 text-xs mb-1">Insumos</p>
                <p className="font-bold text-red-200">-${stats.totalCosts.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-violet-100 text-xs mb-1">Marketing</p>
                <p className="font-bold text-red-200">-${stats.totalMarketing.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Ventas del Mes</CardTitle>
            <div className="w-8 h-8 bg-violet-50 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">${stats.totalSales.toLocaleString()}</div>
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+12.5% desde el mes pasado</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Pedidos Nuevos</CardTitle>
            <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.ordersCount}</div>
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+4 hoy</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Clientes Totales</CardTitle>
            <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.clientsCount}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span>12 clientes nuevos este mes</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Stock Bajo</CardTitle>
            <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.lowStockCount}</div>
            <p className="text-xs text-red-600 mt-1">
              <span>Requiere atención inmediata</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800">Evolución de Ganancias Netas</CardTitle>
              <CardDescription>Ventas menos costos e inversión en MKT</CardDescription>
            </div>
            <Select value={chartFilter} onValueChange={(v: any) => setChartFilter(v)}>
              <SelectTrigger className="w-32 bg-slate-50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dia">Por Día</SelectItem>
                <SelectItem value="semana">Por Semana</SelectItem>
                <SelectItem value="mes">Por Mes</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartDataArray}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ganancias" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorVentas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity / Tasks */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Tareas Pendientes</CardTitle>
            <CardDescription>Acciones que requieren tu atención</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{stats.pendingOrders} Pedidos pendientes</p>
                <p className="text-xs text-slate-500">Por confirmar o en preparación</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300" />
            </div>

            <Separator className="bg-slate-100" />

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{stats.shippingCount} Envíos en camino</p>
                <p className="text-xs text-slate-500">Seguimiento activo de transportistas</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300" />
            </div>

            <Separator className="bg-slate-100" />

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Reponer Stock</p>
                <p className="text-xs text-slate-500">{stats.lowStockCount} productos por debajo del mínimo</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300" />
            </div>

            <Button className="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white">
              Ver todos los pedidos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
