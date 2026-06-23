import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Panel, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { generateDailyPlan } from "@/lib/ai-planner.functions";
import { type InventoryItem, type Sale } from "@/lib/business";
import { ListChecks, Loader2, Sparkles, Package, ShoppingCart, TrendingUp, Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Daily Planner · ShopSaarthi AI" }] }),
  component: PlannerPage,
});

function PlannerPage() {
  const fn = useServerFn(generateDailyPlan);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const inv = useQuery({ queryKey: ["inventory"], queryFn: async () => ((await supabase.from("inventory").select("*")).data ?? []) as InventoryItem[] });
  const sal = useQuery({ queryKey: ["sales"], queryFn: async () => ((await supabase.from("sales").select("*").order("sale_date", { ascending: false })).data ?? []) as Sale[] });
  const latest = useQuery({
    queryKey: ["plan-report"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_reports").select("*").eq("report_type", "planner").order("created_at", { ascending: false }).limit(1);
      return data?.[0] ?? null;
    },
  });

  const gen = useMutation({
    mutationFn: async () => fn({ data: { inventory: inv.data ?? [], sales: sal.data ?? [] } }),
    onSuccess: () => { toast.success("Daily plan ready"); latest.refetch(); setDone({}); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const plan = (gen.data ?? latest.data?.content) as any;
  const hasData = (inv.data?.length ?? 0) > 0 || (sal.data?.length ?? 0) > 0;

  const sections = [
    { key: "priority", label: "Priority Tasks", icon: <Flag className="size-4" /> },
    { key: "inventory", label: "Inventory", icon: <Package className="size-4" /> },
    { key: "sales", label: "Sales", icon: <ShoppingCart className="size-4" /> },
    { key: "growth", label: "Growth", icon: <TrendingUp className="size-4" /> },
  ] as const;

  return (
    <AppShell
      title="Daily Planner"
      subtitle="An AI-curated action list for today, based on your live business state."
      actions={
        <Button className="bg-plan text-plan-foreground hover:bg-plan/90" onClick={() => gen.mutate()} disabled={gen.isPending || !hasData}>
          {gen.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {plan ? "Regenerate plan" : "Generate today's plan"}
        </Button>
      }
    >
      {!hasData ? (
        <Panel><EmptyState title="Add some data first" description="The planner needs inventory or sales to generate actions." /></Panel>
      ) : !plan ? (
        <Panel>
          <EmptyState
            icon={<ListChecks className="size-5" />}
            title="No plan generated yet"
            description="Generate your first daily action plan, tailored to today's business state."
            action={
              <Button className="bg-plan text-plan-foreground hover:bg-plan/90" onClick={() => gen.mutate()} disabled={gen.isPending}>
                {gen.isPending && <Loader2 className="size-4 animate-spin" />}
                Generate plan
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {plan.headline && (
            <div className="rounded-lg bg-plan-soft border border-plan/20 px-5 py-4">
              <div className="text-[11px] uppercase tracking-wider font-medium text-plan">Today's theme</div>
              <div className="text-lg font-semibold mt-1">{plan.headline}</div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sections.map((sec) => {
              const items = (plan[sec.key] ?? []) as Array<{ task: string; why?: string }>;
              return (
                <Panel key={sec.key} title={<span className="flex items-center gap-2 text-plan">{sec.icon} {sec.label}</span>}>
                  {items.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No tasks.</div>
                  ) : (
                    <ul className="space-y-3">
                      {items.map((t, i) => {
                        const id = `${sec.key}-${i}`;
                        const checked = !!done[id];
                        return (
                          <li key={id} className="flex items-start gap-3 group">
                            <Checkbox checked={checked} onCheckedChange={(v) => setDone((d) => ({ ...d, [id]: !!v }))} className="mt-0.5" />
                            <div className={checked ? "opacity-50 line-through" : ""}>
                              <div className="text-sm font-medium">{t.task}</div>
                              {t.why && <div className="text-xs text-muted-foreground mt-0.5">{t.why}</div>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
