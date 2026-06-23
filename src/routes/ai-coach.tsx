import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Panel, EmptyState, StatusPill } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { generateAiCoachReport } from "@/lib/ai-coach.functions";
import { type InventoryItem, type Sale } from "@/lib/business";
import { Lightbulb, AlertTriangle, Sparkles, Wallet, TrendingUp, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/ai-coach")({
  head: () => ({ meta: [{ title: "AI Coach · ShopSaarthi AI" }] }),
  component: CoachPage,
});

function CoachPage() {
  const fn = useServerFn(generateAiCoachReport);

  const inv = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory").select("*");
      return (data ?? []) as InventoryItem[];
    },
  });
  const sal = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("*");
      return (data ?? []) as Sale[];
    },
  });
  const latest = useQuery({
    queryKey: ["coach-report"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_reports")
        .select("*")
        .eq("report_type", "coach")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  const gen = useMutation({
    mutationFn: async () => fn({ data: { inventory: inv.data ?? [], sales: sal.data ?? [] } }),
    onSuccess: () => { toast.success("New report generated"); latest.refetch(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to generate"),
  });

  const report = (gen.data ?? latest.data?.content) as any;
  const hasData = (inv.data?.length ?? 0) > 0 || (sal.data?.length ?? 0) > 0;

  return (
    <AppShell
      title="AI Coach"
      subtitle="Strategic recommendations from Gemini, grounded in your live business data."
      actions={
        <Button onClick={() => gen.mutate()} disabled={gen.isPending || !hasData}>
          {gen.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {report ? "Regenerate" : "Generate report"}
        </Button>
      }
    >
      {!hasData ? (
        <Panel><EmptyState title="Add inventory and sales first" description="The AI Coach needs business data to analyse." /></Panel>
      ) : !report ? (
        <Panel>
          <EmptyState
            icon={<Sparkles className="size-5" />}
            title="Generate your first AI report"
            description="ShopSaarthi will analyse your inventory and sales to surface opportunities, risks and recommendations."
            action={
              <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
                {gen.isPending && <Loader2 className="size-4 animate-spin" />}
                Run AI analysis
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {report.summary && (
            <Panel title="Executive Summary">
              <p className="text-sm leading-relaxed">{report.summary}</p>
              {latest.data && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Generated {new Date(latest.data.created_at).toLocaleString("en-IN")}
                </div>
              )}
            </Panel>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section
              title="Growth Opportunities"
              icon={<Lightbulb className="size-4" />}
              tone="info"
              items={report.opportunities ?? []}
              fields={{ severity: "impact" }}
            />
            <Section
              title="Business Risks"
              icon={<AlertTriangle className="size-4" />}
              tone="danger"
              items={report.risks ?? []}
              fields={{ severity: "severity" }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Section title="Cost Reduction" icon={<Wallet className="size-4" />} tone="warning" items={report.cost_reduction ?? []} />
            <Section title="Revenue Growth" icon={<TrendingUp className="size-4" />} tone="success" items={report.revenue_growth ?? []} />
            <Section title="Inventory Tips" icon={<Package className="size-4" />} tone="plan" items={report.inventory_recommendations ?? []} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Section({
  title, icon, tone, items, fields,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "info" | "danger" | "warning" | "success" | "plan";
  items: Array<any>;
  fields?: { severity?: string };
}) {
  const borderTone =
    tone === "info" ? "border-l-info"
    : tone === "danger" ? "border-l-danger"
    : tone === "warning" ? "border-l-warning"
    : tone === "success" ? "border-l-success"
    : "border-l-plan";

  return (
    <Panel title={<span className="flex items-center gap-2">{icon} {title}</span>}>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">No items.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((it, i) => {
            const sev = fields?.severity ? it[fields.severity] : null;
            return (
              <li key={i} className={`pl-3 border-l-2 ${borderTone}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{it.title}</div>
                  {sev && <StatusPill tone={sev === "high" ? "danger" : sev === "medium" ? "warning" : "default"}>{sev}</StatusPill>}
                </div>
                {it.detail && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{it.detail}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
