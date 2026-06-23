import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Panel, MetricCard, EmptyState } from "@/components/ui-bits";
import { computeSalesStats, formatINR, type Sale } from "@/lib/business";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/profit")({
  head: () => ({ meta: [{ title: "Profit Insights · ShopSaarthi AI" }] }),
  component: ProfitPage,
});

function ProfitPage() {
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("*").order("sale_date", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
  });

  const stats = computeSalesStats(sales);
  const top = stats.products[0];
  const worst = stats.products[stats.products.length - 1];

  return (
    <AppShell title="Profit Insights" subtitle="Financial performance, calculated live from your sales data.">
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      ) : sales.length === 0 ? (
        <Panel><EmptyState title="No sales to analyse" description="Record sales to see profit insights." /></Panel>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Revenue" value={formatINR(stats.revenue)} tone="success" />
            <MetricCard label="Profit" value={formatINR(stats.profit)} tone={stats.profit >= 0 ? "success" : "danger"} />
            <MetricCard label="Profit Margin" value={`${stats.margin.toFixed(1)}%`} tone="info" hint={`On ${formatINR(stats.revenue)} revenue`} />
            <MetricCard label="Total Cost" value={formatINR(stats.cost)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel title={<span className="flex items-center gap-2"><TrendingUp className="size-4 text-success" /> Top Performer</span>}>
              {top ? (
                <div>
                  <div className="text-2xl font-semibold">{top.product}</div>
                  <div className="text-sm text-muted-foreground mt-1">Profit · {formatINR(top.profit)} · {top.margin.toFixed(1)}% margin</div>
                  <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                    <div><div className="text-muted-foreground">Revenue</div><div className="font-medium tabular-nums">{formatINR(top.revenue)}</div></div>
                    <div><div className="text-muted-foreground">Units</div><div className="font-medium tabular-nums">{top.units}</div></div>
                    <div><div className="text-muted-foreground">Margin</div><div className="font-medium tabular-nums">{top.margin.toFixed(1)}%</div></div>
                  </div>
                </div>
              ) : <EmptyState title="No data" />}
            </Panel>
            <Panel title={<span className="flex items-center gap-2"><TrendingDown className="size-4 text-danger" /> Needs Attention</span>}>
              {worst && worst !== top ? (
                <div>
                  <div className="text-2xl font-semibold">{worst.product}</div>
                  <div className="text-sm text-muted-foreground mt-1">Profit · {formatINR(worst.profit)} · {worst.margin.toFixed(1)}% margin</div>
                  <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                    <div><div className="text-muted-foreground">Revenue</div><div className="font-medium tabular-nums">{formatINR(worst.revenue)}</div></div>
                    <div><div className="text-muted-foreground">Units</div><div className="font-medium tabular-nums">{worst.units}</div></div>
                    <div><div className="text-muted-foreground">Margin</div><div className="font-medium tabular-nums">{worst.margin.toFixed(1)}%</div></div>
                  </div>
                </div>
              ) : <EmptyState title="Need more products to compare" />}
            </Panel>
          </div>

          <Panel title="Product Profit Rankings" description="Profit contribution by product">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.products} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="product" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                    {stats.products.map((p, i) => (
                      <Cell key={i} fill={p.profit >= 0 ? "var(--color-success)" : "var(--color-danger)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto mt-4 -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b">
                    <th className="px-5 py-2.5 font-medium">Rank</th>
                    <th className="px-5 py-2.5 font-medium">Product</th>
                    <th className="px-5 py-2.5 font-medium text-right">Units</th>
                    <th className="px-5 py-2.5 font-medium text-right">Revenue</th>
                    <th className="px-5 py-2.5 font-medium text-right">Profit</th>
                    <th className="px-5 py-2.5 font-medium text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.products.map((p, i) => (
                    <tr key={p.product} className="border-b last:border-0">
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">#{i + 1}</td>
                      <td className="px-5 py-3 font-medium">{p.product}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{p.units}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatINR(p.revenue)}</td>
                      <td className={`px-5 py-3 text-right tabular-nums font-medium ${p.profit >= 0 ? "text-success" : "text-danger"}`}>{formatINR(p.profit)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{p.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
