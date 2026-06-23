import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Panel, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type AIReport, type InventoryItem, type Sale } from "@/lib/business";
import { Download, Search, Database, FileText } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/data")({
  head: () => ({ meta: [{ title: "Data Center · ShopSaarthi AI" }] }),
  component: DataCenter,
});

type Tab = "inventory" | "sales" | "reports";

function DataCenter() {
  const [tab, setTab] = useState<Tab>("inventory");
  const [q, setQ] = useState("");

  const inv = useQuery({ queryKey: ["inventory"], queryFn: async () => ((await supabase.from("inventory").select("*").order("created_at", { ascending: false })).data ?? []) as InventoryItem[] });
  const sal = useQuery({ queryKey: ["sales"], queryFn: async () => ((await supabase.from("sales").select("*").order("sale_date", { ascending: false })).data ?? []) as Sale[] });
  const rep = useQuery({ queryKey: ["all-reports"], queryFn: async () => ((await supabase.from("ai_reports").select("*").order("created_at", { ascending: false })).data ?? []) as AIReport[] });

  function exportJson() {
    const data =
      tab === "inventory" ? inv.data
      : tab === "sales" ? sal.data
      : rep.data;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopsaarthi-${tab}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAll() {
    const blob = new Blob([JSON.stringify({ inventory: inv.data, sales: sal.data, reports: rep.data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopsaarthi-all-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      title="Data Center"
      subtitle="Central business intelligence hub. Inspect raw records and AI reports."
      actions={
        <>
          <Button variant="outline" onClick={exportJson}><Download className="size-4" /> Export {tab}</Button>
          <Button onClick={exportAll}><Download className="size-4" /> Export all</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b">
          {(["inventory", "sales", "reports"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 capitalize -mb-px transition-colors ${tab === t ? "border-foreground text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t} ({t === "inventory" ? inv.data?.length ?? 0 : t === "sales" ? sal.data?.length ?? 0 : rep.data?.length ?? 0})
            </button>
          ))}
          <div className="ml-auto relative w-64">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder={`Search ${tab}…`} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {tab === "inventory" && <InventoryTable items={(inv.data ?? []).filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))} />}
        {tab === "sales" && <SalesTable items={(sal.data ?? []).filter((s) => s.product.toLowerCase().includes(q.toLowerCase()))} />}
        {tab === "reports" && <ReportsList items={(rep.data ?? []).filter((r) => r.report_type.toLowerCase().includes(q.toLowerCase()) || JSON.stringify(r.content).toLowerCase().includes(q.toLowerCase()))} />}
      </div>
    </AppShell>
  );
}

function InventoryTable({ items }: { items: InventoryItem[] }) {
  if (items.length === 0) return <Panel><EmptyState icon={<Database className="size-5" />} title="No records" /></Panel>;
  return (
    <Panel>
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
            <th className="px-5 py-2 font-medium">ID</th><th className="px-5 py-2 font-medium">Name</th><th className="px-5 py-2 font-medium">Category</th><th className="px-5 py-2 font-medium">Qty</th><th className="px-5 py-2 font-medium">Min</th><th className="px-5 py-2 font-medium">Created</th>
          </tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b last:border-0">
                <td className="px-5 py-2 text-xs font-mono text-muted-foreground">{i.id.slice(0, 8)}</td>
                <td className="px-5 py-2 font-medium">{i.name}</td>
                <td className="px-5 py-2">{i.category}</td>
                <td className="px-5 py-2 tabular-nums">{Number(i.quantity)} {i.unit}</td>
                <td className="px-5 py-2 tabular-nums">{Number(i.minimum_stock)}</td>
                <td className="px-5 py-2 text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SalesTable({ items }: { items: Sale[] }) {
  if (items.length === 0) return <Panel><EmptyState icon={<Database className="size-5" />} title="No records" /></Panel>;
  return (
    <Panel>
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
            <th className="px-5 py-2 font-medium">ID</th><th className="px-5 py-2 font-medium">Product</th><th className="px-5 py-2 font-medium">Qty</th><th className="px-5 py-2 font-medium">Sell ₹</th><th className="px-5 py-2 font-medium">Cost ₹</th><th className="px-5 py-2 font-medium">Date</th>
          </tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-5 py-2 text-xs font-mono text-muted-foreground">{s.id.slice(0, 8)}</td>
                <td className="px-5 py-2 font-medium">{s.product}</td>
                <td className="px-5 py-2 tabular-nums">{Number(s.quantity_sold)}</td>
                <td className="px-5 py-2 tabular-nums">₹{Number(s.selling_price)}</td>
                <td className="px-5 py-2 tabular-nums">₹{Number(s.cost_price)}</td>
                <td className="px-5 py-2 text-xs text-muted-foreground">{new Date(s.sale_date).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ReportsList({ items }: { items: AIReport[] }) {
  if (items.length === 0) return <Panel><EmptyState icon={<FileText className="size-5" />} title="No AI reports yet" description="Generate one from AI Coach or Daily Planner." /></Panel>;
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <Panel key={r.id} title={<span className="capitalize">{r.report_type} report</span>} description={new Date(r.created_at).toLocaleString("en-IN")}>
          <pre className="text-xs bg-muted/50 p-3 rounded-md max-h-72 overflow-auto font-mono">{JSON.stringify(r.content, null, 2)}</pre>
        </Panel>
      ))}
    </div>
  );
}
