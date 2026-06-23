import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Panel, MetricCard, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { computeSalesStats, formatINR, type Sale, type InventoryItem } from "@/lib/business";
import { Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/sales")({
  head: () => ({ meta: [{ title: "Sales · ShopSaarthi AI" }] }),
  component: SalesPage,
});

type Form = { product: string; quantity_sold: string; selling_price: string; cost_price: string };
const empty: Form = { product: "", quantity_sold: "", selling_price: "", cost_price: "" };

function SalesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("*").order("sale_date", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory").select("*");
      return (data ?? []) as InventoryItem[];
    },
  });

  const stats = computeSalesStats(sales);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        product: form.product.trim(),
        quantity_sold: Number(form.quantity_sold || 0),
        selling_price: Number(form.selling_price || 0),
        cost_price: Number(form.cost_price || 0),
      };
      if (!payload.product) throw new Error("Product required");
      if (editing) {
        const { error } = await supabase.from("sales").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sales").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Updated" : "Sale recorded");
      qc.invalidateQueries({ queryKey: ["sales"] });
      setOpen(false); setEditing(null); setForm(empty);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["sales"] }); },
  });

  function startEdit(s: Sale) {
    setEditing(s);
    setForm({
      product: s.product,
      quantity_sold: String(s.quantity_sold),
      selling_price: String(s.selling_price),
      cost_price: String(s.cost_price),
    });
    setOpen(true);
  }

  return (
    <AppShell
      title="Sales"
      subtitle="Record every sale to power profit insights and AI recommendations."
      actions={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(empty); } }}>
          <DialogTrigger asChild><Button><Plus className="size-4" /> Record sale</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit sale" : "Record sale"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Product</Label>
                <Input list="prod-list" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Product name" />
                <datalist id="prod-list">
                  {inventory.map((i) => <option key={i.id} value={i.name} />)}
                </datalist>
              </div>
              <div>
                <Label>Quantity Sold</Label>
                <Input type="number" step="any" value={form.quantity_sold} onChange={(e) => setForm({ ...form, quantity_sold: e.target.value })} />
              </div>
              <div>
                <Label>Selling Price (per unit ₹)</Label>
                <Input type="number" step="any" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Cost Price (per unit ₹)</Label>
                <Input type="number" step="any" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{editing ? "Save" : "Record"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard label="Total Revenue" value={formatINR(stats.revenue)} tone="success" />
          <MetricCard label="Total Profit" value={formatINR(stats.profit)} tone={stats.profit >= 0 ? "success" : "danger"} />
          <MetricCard label="Avg Margin" value={`${stats.margin.toFixed(1)}%`} tone="info" />
          <MetricCard label="Units Sold" value={stats.units.toFixed(0)} />
        </div>

        <Panel title="Sales History" description={`${sales.length} sales`}>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
          ) : sales.length === 0 ? (
            <EmptyState icon={<ShoppingCart className="size-5" />} title="No sales yet" description="Record your first sale to begin tracking revenue." />
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b">
                    <th className="px-5 py-2.5 font-medium">Date</th>
                    <th className="px-5 py-2.5 font-medium">Product</th>
                    <th className="px-5 py-2.5 font-medium text-right">Qty</th>
                    <th className="px-5 py-2.5 font-medium text-right">Price</th>
                    <th className="px-5 py-2.5 font-medium text-right">Cost</th>
                    <th className="px-5 py-2.5 font-medium text-right">Revenue</th>
                    <th className="px-5 py-2.5 font-medium text-right">Profit</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => {
                    const rev = Number(s.selling_price) * Number(s.quantity_sold);
                    const prof = rev - Number(s.cost_price) * Number(s.quantity_sold);
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(s.sale_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                        <td className="px-5 py-3 font-medium">{s.product}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{Number(s.quantity_sold)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{formatINR(Number(s.selling_price))}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{formatINR(Number(s.cost_price))}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium">{formatINR(rev)}</td>
                        <td className={`px-5 py-3 text-right tabular-nums font-medium ${prof >= 0 ? "text-success" : "text-danger"}`}>{formatINR(prof)}</td>
                        <td className="px-5 py-3 text-right">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="size-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)}><Trash2 className="size-4 text-danger" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
