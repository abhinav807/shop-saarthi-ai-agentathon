import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { MetricCard, Panel, StatusPill, EmptyState } from "@/components/ui-bits";
import {
  computeHealthScore,
  computeInventoryHealth,
  computeSalesStats,
  formatINR,
  stockStatus,
  type InventoryItem,
  type Sale,
  type AIReport,
} from "@/lib/business";
import { seedDemoData } from "@/lib/seed";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowUpRight, Lightbulb, Plus, Sparkles, Activity, PackageX, IndianRupee, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · ShopSaarthi AI" },
      { name: "description", content: "AI Business Manager for small Indian businesses — inventory, sales, profit, risks and opportunities at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);

  const inv = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as InventoryItem[];
    },
  });
  const sal = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("*").order("sale_date", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
  });
  const rep = useQuery({
    queryKey: ["latest-coach"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_reports").select("*").eq("report_type", "coach").order("created_at", { ascending: false }).limit(1);
      return (data?.[0] as AIReport | undefined) ?? null;
    },
  });

  const items = inv.data ?? [];
  const sales = sal.data ?? [];
  const loading = inv.isLoading || sal.isLoading;

  const health = computeHealthScore(items, sales);
  const invHealth = computeInventoryHealth(items);
  const stats = computeSalesStats(sales);
  const lowStock = items.filter((i) => stockStatus(i) !== "healthy");
  const recent = [
    ...sales.slice(0, 5).map((s) => ({ type: "sale" as const, date: s.sale_date, label: `Sold ${s.quantity_sold} × ${s.product}`, amount: Number(s.selling_price) * Number(s.quantity_sold) })),
    ...items.slice(0, 3).map((i) => ({ type: "stock" as const, date: i.created_at, label: `Added ${i.quantity}${i.unit} ${i.name}`, amount: 0 })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 8);

  const reportContent = rep.data?.content as any;

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedDemoData();
      toast.success("Demo data loaded");
      router.invalidate();
      inv.refetch();
      sal.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to seed");
    } finally {
      setSeeding(false);
    }
  }

  const isEmpty = !loading && items.length === 0 && sales.length === 0;

  return (
    <AppShell
      title="Business Overview"
      subtitle="Live snapshot of your store's health, sales and AI insights."
      actions={
        <>
          {isEmpty && (
            <Button onClick={handleSeed} disabled={seeding} variant="outline">
              <Sparkles className="size-4" /> Load demo data
            </Button>
          )}
          <Button asChild>
            <Link to="/sales"><Plus className="size-4" /> Record sale</Link>
          </Button>
        </>
      }
    >
      {isEmpty ? (
        <Panel>
          <EmptyState
            icon={<Activity className="size-5" />}
            title="Welcome to ShopSaarthi AI"
            description="Load demo data to explore the full experience, or start adding your own inventory and sales."
            action={
              <div className="flex gap-2 justify-center">
                <Button onClick={handleSeed} disabled={seeding}>
                  <Sparkles className="size-4" /> Load demo data
                </Button>
                <Button variant="outline" asChild><Link to="/inventory">Add inventory</Link></Button>
              </div>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {/* Hero: health score + key metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4">
              <HealthScoreCard score={health.total} breakdown={health.breakdown} />
            </div>
            <div className="lg:col-span-8 grid grid-cols-2 gap-4">
              <MetricCard
                label="Total Revenue"
                value={formatINR(stats.revenue)}
                hint={`${sales.length} sales recorded`}
                tone="success"
                icon={<IndianRupee className="size-4" />}
              />
              <MetricCard
                label="Total Profit"
                value={formatINR(stats.profit)}
                hint={`${stats.margin.toFixed(1)}% margin`}
                tone={stats.profit >= 0 ? "success" : "danger"}
                icon={<TrendingUp className="size-4" />}
              />
              <MetricCard
                label="Inventory Health"
                value={`${invHealth.score}/100`}
                hint={`${invHealth.healthy} healthy · ${invHealth.low} low · ${invHealth.critical} critical`}
                tone={invHealth.critical > 0 ? "danger" : invHealth.low > 0 ? "warning" : "success"}
                icon={<Activity className="size-4" />}
              />
              <MetricCard
                label="Low Stock Alerts"
                value={lowStock.length}
                hint={lowStock.length > 0 ? "Action required" : "All good"}
                tone={lowStock.length > 0 ? "warning" : "success"}
                icon={<PackageX className="size-4" />}
              />
            </div>
          </div>

          {/* AI feeds */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel
              title={<span className="flex items-center gap-2"><Lightbulb className="size-4 text-info" /> AI Opportunities</span>}
              description="Growth signals spotted by your AI coach"
              actions={<Button size="sm" variant="ghost" asChild><Link to="/ai-coach">Open coach <ArrowUpRight className="size-3" /></Link></Button>}
            >
              {reportContent?.opportunities?.length ? (
                <ul className="space-y-3">
                  {reportContent.opportunities.slice(0, 3).map((o: any, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="size-1.5 rounded-full bg-info mt-2 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{o.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{o.detail}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={<Sparkles className="size-4" />} title="No AI report yet" description="Visit the AI Coach to generate growth opportunities." />
              )}
            </Panel>
            <Panel
              title={<span className="flex items-center gap-2"><AlertTriangle className="size-4 text-danger" /> AI Risks</span>}
              description="Issues threatening your business"
            >
              {reportContent?.risks?.length ? (
                <ul className="space-y-3">
                  {reportContent.risks.slice(0, 3).map((o: any, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="size-1.5 rounded-full bg-danger mt-2 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{o.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{o.detail}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={<AlertTriangle className="size-4" />} title="No risks identified yet" description="Generate an AI report to surface business risks." />
              )}
            </Panel>
          </div>

          {/* Low stock + recent activity + quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Low Stock" description="Items below minimum threshold" className="lg:col-span-1">
              {lowStock.length === 0 ? (
                <EmptyState title="Everything is stocked" description="No items need attention right now." />
              ) : (
                <ul className="divide-y -m-5">
                  {lowStock.slice(0, 6).map((i) => {
                    const s = stockStatus(i);
                    return (
                      <li key={i.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{i.name}</div>
                          <div className="text-xs text-muted-foreground">{Number(i.quantity)} {i.unit} · min {Number(i.minimum_stock)}</div>
                        </div>
                        <StatusPill tone={s === "critical" ? "danger" : "warning"}>{s}</StatusPill>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Recent Activity" description="Latest sales and inventory changes" className="lg:col-span-1">
              {recent.length === 0 ? (
                <EmptyState title="No activity yet" />
              ) : (
                <ul className="space-y-3">
                  {recent.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className={`size-1.5 rounded-full mt-2 shrink-0 ${r.type === "sale" ? "bg-success" : "bg-info"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{r.label}</div>
                        <div className="text-xs text-muted-foreground">{new Date(r.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
                      </div>
                      {r.amount > 0 && <span className="text-xs font-medium tabular-nums">{formatINR(r.amount)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Quick Actions" className="lg:col-span-1">
              <div className="grid grid-cols-2 gap-2">
                <QA to="/inventory" label="Add Item" icon={<Plus className="size-4" />} />
                <QA to="/sales" label="Record Sale" icon={<ShoppingBagIcon />} />
                <QA to="/ai-coach" label="AI Coach" icon={<Sparkles className="size-4" />} tone="info" />
                <QA to="/planner" label="Daily Plan" icon={<Lightbulb className="size-4" />} tone="plan" />
                <QA to="/profit" label="Profit View" icon={<TrendingUp className="size-4" />} tone="success" />
                <QA to="/data" label="Data Center" icon={<Activity className="size-4" />} />
              </div>
            </Panel>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ShoppingBagIcon() {
  return <Plus className="size-4" />;
}

function QA({ to, label, icon, tone }: { to: string; label: string; icon: React.ReactNode; tone?: "info" | "success" | "plan" }) {
  const cls =
    tone === "info" ? "hover:bg-info-soft hover:text-info"
    : tone === "success" ? "hover:bg-success-soft hover:text-success"
    : tone === "plan" ? "hover:bg-plan-soft hover:text-plan"
    : "hover:bg-accent";
  return (
    <Link to={to as any} className={`flex flex-col items-start gap-2 p-3 border rounded-md text-xs font-medium transition-colors ${cls}`}>
      {icon}
      {label}
    </Link>
  );
}

function HealthScoreCard({ score, breakdown }: { score: number; breakdown: Record<string, number> }) {
  const tone = score >= 75 ? "success" : score >= 50 ? "warning" : "danger";
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning-foreground" : "text-danger";
  const ring = tone === "success" ? "stroke-success" : tone === "warning" ? "stroke-warning" : "stroke-danger";
  const r = 60;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <div className="bg-card border rounded-lg p-5 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Business Health</span>
        <StatusPill tone={tone}>
          {score >= 75 ? "Strong" : score >= 50 ? "Watch" : "At Risk"}
        </StatusPill>
      </div>
      <div className="flex items-center gap-5 mt-3 flex-1">
        <div className="relative size-36 shrink-0">
          <svg viewBox="0 0 160 160" className="size-36 -rotate-90">
            <circle cx="80" cy="80" r={r} className="stroke-muted fill-none" strokeWidth="12" />
            <circle cx="80" cy="80" r={r} className={`fill-none ${ring} transition-all`} strokeWidth="12" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-3xl font-bold tabular-nums ${color}`}>{score}</div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">/ 100</div>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 text-xs">
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between mb-0.5">
                <span className="capitalize text-muted-foreground">{k}</span>
                <span className="tabular-nums font-medium">{v}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${v >= 75 ? "bg-success" : v >= 50 ? "bg-warning" : "bg-danger"}`} style={{ width: `${v}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
