"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Users,
  Activity,
  DollarSign,
  RefreshCw,
  Download,
} from "lucide-react";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { AreaChart, Area, CartesianGrid, XAxis, BarChart, Bar, Legend, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { Tooltip as HTooltip } from "@heroui/react";
// removed duplicate Select import (already imported above)

interface AnalyticsData {
  overview: {
    total_users: number;
    active_users: number;
    total_revenue: number;
    total_cases: number;
    api_calls_today: number;
    growth_rate: number;
  };
  user_analytics: {
    new_registrations: Array<{ date: string; count: number }>;
    user_activity: Array<{ date: string; active_users: number }>;
    retention_rate: number;
  };
  financial_analytics: {
    subscription_distribution: Array<{ plan: string; count: number; percentage: number }>;
  };
  system_analytics: {
    api_usage: Array<{ endpoint: string; calls: number; avg_response_time: number }>;
    error_rate: number;
    uptime: number;
  };
}

type Timeseries = { days: string[]; payments_count: number[]; revenue_amount: number[] };
type UsersTs = { days: string[]; new_users: number[] };
type UsersByRoleTs = { days: string[]; roles: { client: number[]; operator: number[]; admin: number[]; other: number[] } };

// Response shape for /admin/dashboard/stats
interface AdminDashboardStats {
  users?: { total?: number; active?: number };
  subscriptions?: { revenue?: number; active?: number; trial?: number };
  apiUsage?: { totalCalls?: number; todayCalls?: number; avgResponseTime?: number; uptime?: number };
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [ts, setTs] = useState<Timeseries | null>(null);
  const [usersTs, setUsersTs] = useState<UsersTs | null>(null);
  const [usersByRoleTs, setUsersByRoleTs] = useState<UsersByRoleTs | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [timeRange, setTimeRange] = useState<"7d"|"30d"|"90d">("30d");

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  useEffect(() => {
    fetchFinancialTs();
    fetchUsersTs();
    fetchUsersByRoleTs();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { authAPI } = await import("@/lib/api/auth");
      const stats = await authAPI.makeRequest<AdminDashboardStats>('GET', '/admin/dashboard/stats', undefined, true);

      const mapped: AnalyticsData = {
        overview: {
          total_users: stats.users?.total ?? 0,
          active_users: stats.users?.active ?? 0,
          total_revenue: stats.subscriptions?.revenue ?? 0,
          total_cases: stats.apiUsage?.totalCalls ?? 0,
          api_calls_today: stats.apiUsage?.todayCalls ?? 0,
          growth_rate: 0,
        },
        user_analytics: {
          new_registrations: [],
          user_activity: [],
          retention_rate: 0,
        },
        financial_analytics: {
          subscription_distribution: [
            { plan: "Aktywne", count: stats.subscriptions?.active ?? 0, percentage: 0 },
            { plan: "Trial", count: stats.subscriptions?.trial ?? 0, percentage: 0 },
          ],
        },
        system_analytics: {
          api_usage: [
            { endpoint: "/api/v1/*", calls: stats.apiUsage?.totalCalls ?? 0, avg_response_time: Math.round(stats.apiUsage?.avgResponseTime ?? 0) },
          ],
          error_rate: 0,
          uptime: stats.apiUsage?.uptime ?? 99.9,
        },
      };
      const total = mapped.financial_analytics.subscription_distribution.reduce((s, p) => s + p.count, 0) || 1;
      mapped.financial_analytics.subscription_distribution = mapped.financial_analytics.subscription_distribution.map(p => ({...p, percentage: Math.round((p.count/total)*100)}));
      setAnalytics(mapped);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialTs = async () => {
    try {
      const periodDays = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
      const { authAPI } = await import("@/lib/api/auth");
      const data = await authAPI.makeRequest<Timeseries>('GET', `/admin/analytics/financial-timeseries?days=${periodDays}`, undefined, true);
      setTs(data);
    } catch {}
  };

  // Fetch new users per day
  const fetchUsersTs = async () => {
    try {
      const periodDays = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
      const { authAPI } = await import("@/lib/api/auth");
      const data = await authAPI.makeRequest<UsersTs>('GET', `/admin/analytics/users-timeseries?days=${periodDays}`, undefined, true);
      setUsersTs(data as UsersTs);
    } catch {}
  };

  // Fetch registrations by role per day
  const fetchUsersByRoleTs = async () => {
    try {
      const periodDays = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
      const { authAPI } = await import("@/lib/api/auth");
      const data = await authAPI.makeRequest<UsersByRoleTs>('GET', `/admin/analytics/users-by-role-timeseries?days=${periodDays}`, undefined, true);
      setUsersByRoleTs(data as UsersByRoleTs);
    } catch {}
  };

  const exportJSON = () => {
    if (!analytics) return;
    const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!analytics) return;
    const rows = [
      ["metric","value"],
      ["total_users", analytics.overview.total_users],
      ["active_users", analytics.overview.active_users],
      ["total_revenue", analytics.overview.total_revenue],
      ["total_cases", analytics.overview.total_cases],
      ["api_calls_today", analytics.overview.api_calls_today],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPNG = async () => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svg.clientWidth || 1200;
      canvas.height = svg.clientHeight || 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const dl = document.createElement('a');
        dl.href = URL.createObjectURL(blob);
        dl.download = `admin-analytics-chart-${Date.now()}.png`;
        dl.click();
      }, 'image/png');
    };
    img.src = url;
  };

  const exportPDF = () => {
    window.print();
  };

  const exportDOC = () => {
    // Export a simple HTML snapshot that Word can open
    const html = document.documentElement.cloneNode(true) as HTMLElement;
    const blob = new Blob([`<!DOCTYPE html>${html.outerHTML}`], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${Date.now()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Analityka</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const donutGradient = (percentage: number) => ({
    background: `conic-gradient(var(--primary) 0 ${percentage}%, var(--muted) ${percentage}% 100%)`,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analityka</h1>
          <p className="text-muted-foreground">Szczegółowe raporty i statystyki</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dni</SelectItem>
              <SelectItem value="30d">30 dni</SelectItem>
              <SelectItem value="90d">90 dni</SelectItem>
            </SelectContent>
          </Select>
          <HTooltip content={<div className="px-1 py-2"><div className="text-small font-bold">Odśwież</div><div className="text-tiny">Pobierz najnowsze dane</div></div>}>
            <Button variant="outline" onClick={() => { fetchAnalytics(); fetchFinancialTs(); }}><RefreshCw className="h-4 w-4 mr-2"/>Odśwież</Button>
          </HTooltip>
          <HTooltip content={<div className="px-1 py-2"><div className="text-small font-bold">Eksport CSV</div><div className="text-tiny">Tabela zbiorcza</div></div>}>
            <Button variant="outline" onClick={exportCSV}>Eksport CSV</Button>
          </HTooltip>
          <HTooltip content={<div className="px-1 py-2"><div className="text-small font-bold">Eksport PNG</div><div className="text-tiny">Zapisz wykres</div></div>}>
            <Button variant="outline" onClick={exportPNG}>Eksport PNG</Button>
          </HTooltip>
          <HTooltip content={<div className="px-1 py-2"><div className="text-small font-bold">Eksport PDF</div><div className="text-tiny">Wydrukuj stronę</div></div>}>
            <Button variant="outline" onClick={exportPDF}>Eksport PDF</Button>
          </HTooltip>
          <HTooltip content={<div className="px-1 py-2"><div className="text-small font-bold">Eksport DOC</div><div className="text-tiny">Eksport do Word</div></div>}>
            <Button onClick={exportDOC}><Download className="h-4 w-4 mr-2"/>Eksport DOC</Button>
          </HTooltip>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Użytkownicy</p><p className="text-2xl font-bold">{analytics.overview.total_users}</p></div><Users className="h-6 w-6 text-blue-600"/></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Aktywni</p><p className="text-2xl font-bold">{analytics.overview.active_users}</p></div><Badge variant="secondary">{analytics.overview.total_users ? Math.round((analytics.overview.active_users/analytics.overview.total_users)*100) : 0}%</Badge></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Przychody</p><p className="text-2xl font-bold">{analytics.overview.total_revenue.toLocaleString()} PLN</p></div><DollarSign className="h-6 w-6 text-purple-600"/></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Sprawy</p><p className="text-2xl font-bold">{analytics.overview.total_cases}</p></div><BarChart3 className="h-6 w-6 text-orange-600"/></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">API (dziś)</p><p className="text-2xl font-bold">{analytics.overview.api_calls_today}</p></div><Activity className="h-6 w-6 text-cyan-600"/></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Uptime</p><p className="text-2xl font-bold">{analytics.system_analytics.uptime}%</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Użytkownicy</TabsTrigger>
          <TabsTrigger value="financial">Finanse</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* New users per day */}
          <Card className="pt-0">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
              <div className="grid flex-1 gap-1">
                <CardTitle>Nowi użytkownicy dziennie</CardTitle>
                <CardDescription>Rejestracje w wybranym okresie</CardDescription>
              </div>
              <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                <SelectTrigger className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex" aria-label="Select a value">
                  <SelectValue placeholder="Zakres czasu" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="90d" className="rounded-lg">Ostatnie 3 mies.</SelectItem>
                  <SelectItem value="30d" className="rounded-lg">Ostatnie 30 dni</SelectItem>
                  <SelectItem value="7d" className="rounded-lg">Ostatnie 7 dni</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              <ChartContainer
                config={{ users: { label: 'Nowi użytkownicy', color: 'var(--chart-3)' } } as any}
                className="aspect-auto h-[250px] w-full"
              >
                <AreaChart data={(usersTs?.days || []).map((d, i) => ({ date: d, users: usersTs?.new_users?.[i] || 0 }))}>
                  <defs>
                    <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
                    tickFormatter={(value: string) => new Date(value).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(value) => new Date(String(value)).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })} indicator="dot" />} />
                  <Area dataKey="users" type="natural" fill="url(#fillUsers)" stroke="var(--color-users)" name="Nowi użytkownicy" />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Users by role stacked chart */}
          <Card className="pt-0">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
              <div className="grid flex-1 gap-1">
                <CardTitle>Rejestracje według roli</CardTitle>
                <CardDescription>Rozkład ról w czasie</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              <ChartContainer
                config={{ client: { label: 'Klient', color: 'var(--chart-1)' }, operator: { label: 'Operator', color: 'var(--chart-2)' }, admin: { label: 'Admin', color: 'var(--chart-5)' }, other: { label: 'Inne', color: 'var(--muted-foreground)' } } as any}
                className="aspect-auto h-[250px] w-full"
              >
                <AreaChart data={(usersByRoleTs?.days || []).map((d, i) => ({
                  date: d,
                  client: usersByRoleTs?.roles?.client?.[i] || 0,
                  operator: usersByRoleTs?.roles?.operator?.[i] || 0,
                  admin: usersByRoleTs?.roles?.admin?.[i] || 0,
                  other: usersByRoleTs?.roles?.other?.[i] || 0,
                }))}>
                  <defs>
                    <linearGradient id="fillClient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-client)" stopOpacity={0.8} /><stop offset="95%" stopColor="var(--color-client)" stopOpacity={0.1} /></linearGradient>
                    <linearGradient id="fillOperator" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-operator)" stopOpacity={0.8} /><stop offset="95%" stopColor="var(--color-operator)" stopOpacity={0.1} /></linearGradient>
                    <linearGradient id="fillAdmin" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-admin)" stopOpacity={0.8} /><stop offset="95%" stopColor="var(--color-admin)" stopOpacity={0.1} /></linearGradient>
                    <linearGradient id="fillOther" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-other)" stopOpacity={0.8} /><stop offset="95%" stopColor="var(--color-other)" stopOpacity={0.1} /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
                    tickFormatter={(value: string) => new Date(value).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(value) => new Date(String(value)).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })} indicator="dot" />} />
                  <Area dataKey="client" type="natural" fill="url(#fillClient)" stroke="var(--color-client)" stackId="roles" name="Klient" />
                  <Area dataKey="operator" type="natural" fill="url(#fillOperator)" stroke="var(--color-operator)" stackId="roles" name="Operator" />
                  <Area dataKey="admin" type="natural" fill="url(#fillAdmin)" stroke="var(--color-admin)" stackId="roles" name="Admin" />
                  <Area dataKey="other" type="natural" fill="url(#fillOther)" stroke="var(--color-other)" stackId="roles" name="Inne" />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card className="pt-0">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
              <div className="grid flex-1 gap-1">
                <CardTitle>Area Chart - Interactive</CardTitle>
                <CardDescription>Przychód i płatności w wybranym okresie</CardDescription>
              </div>
              <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                <SelectTrigger className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex" aria-label="Select a value">
                  <SelectValue placeholder="Last 3 months" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
                  <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
                  <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              <div ref={chartRef}>
                <ChartContainer
                  config={{
                    desktop: { label: 'Przychód (PLN)', color: 'var(--chart-1)' },
                    mobile: { label: 'Płatności', color: 'var(--chart-2)' },
                  } as ChartConfig}
                  className="aspect-auto h-[250px] w-full"
                >
                  <AreaChart data={(ts?.days || []).map((d, i) => ({
                    date: d,
                    desktop: ts?.revenue_amount?.[i] || 0,
                    mobile: ts?.payments_count?.[i] || 0,
                  }))}>
                    <defs>
                      <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value: string) => new Date(value).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent labelFormatter={(value) => new Date(String(value)).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })} indicator="dot" />}
                    />
                    <Area dataKey="mobile" type="natural" fill="url(#fillMobile)" stroke="var(--color-mobile)" stackId="a" name="Płatności" />
                    <Area dataKey="desktop" type="natural" fill="url(#fillDesktop)" stroke="var(--color-desktop)" stackId="a" name="Przychód (PLN)" />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {/* API usage bars */}
          <Card>
            <CardHeader><CardTitle>Statystyki API</CardTitle><CardDescription>Wywołania i średni czas</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.system_analytics.api_usage.map((u) => (
                  <div key={u.endpoint} className="space-y-1">
                    <div className="flex justify-between text-sm"><span className="font-mono">{u.endpoint}</span><span>{u.calls.toLocaleString()} calls</span></div>
                    <div className="h-2 bg-muted rounded">
                      <div className="h-2 bg-primary rounded" style={{width: `${Math.min(100, (u.calls/(analytics.overview.total_cases||1))*100)}%`}}/>
                    </div>
                    <div className="text-xs text-muted-foreground">Avg: {u.avg_response_time}ms</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}