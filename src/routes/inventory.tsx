import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Panel, StatusPill, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { stockStatus, type InventoryItem } from "@/lib/business";
import { Pencil, Plus, Search, Trash2, Package } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory · ShopSaarthi AI" }] }),
  component: InventoryPage,
});

type Form = {
  name: string;
  quantity: string;
  unit: string;
  minimum_stock: string;
  category: string;
};

const empty: Form = { name: "", quantity: "", unit: "kg", minimum_stock: "", category: "Raw Material" };

function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);
  const filtered = items.filter((i) =>
    (cat === "all" || i.category === cat) &&
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        quantity: Number(form.quantity || 0),
        unit: form.unit.trim() || "units",
        minimum_stock: Number(form.minimum_stock || 0),
        category: form.category.trim() || "General",
      };
      if (!payload.name) throw new Error("Name required");
      if (editing) {
        const { error } = await supabase.from("inventory").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Item updated" : "Item added");
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setOpen(false);
      setEditing(null);
      setForm(empty);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  function startEdit(i: InventoryItem) {
    setEditing(i);
    setForm({
      name: i.name,
      quantity: String(i.quantity),
      unit: i.unit,
      minimum_stock: String(i.minimum_stock),
      category: i.category,
    });
    setOpen(true);
  }

  return (
    <AppShell
      title="Inventory"
      subtitle="Track stock, units and reorder thresholds across all categories."
      actions={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(empty); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4" /> Add item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit item" : "Add inventory item"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Product Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sugar" />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="5" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg" />
              </div>
              <div>
                <Label>Minimum Stock</Label>
                <Input type="number" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} placeholder="2" />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Raw Material" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{editing ? "Save" : "Add"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Panel>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 flex-wrap">
            <CatChip active={cat === "all"} onClick={() => setCat("all")}>All</CatChip>
            {categories.map((c) => (
              <CatChip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</CatChip>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Package className="size-5" />} title="No items found" description={items.length === 0 ? "Add your first inventory item to get started." : "Try a different search or category."} />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b">
                  <th className="px-5 py-2.5 font-medium">Product</th>
                  <th className="px-5 py-2.5 font-medium">Category</th>
                  <th className="px-5 py-2.5 font-medium text-right">Stock</th>
                  <th className="px-5 py-2.5 font-medium text-right">Min</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const s = stockStatus(i);
                  return (
                    <tr key={i.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium">{i.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{i.category}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{Number(i.quantity)} <span className="text-muted-foreground text-xs">{i.unit}</span></td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{Number(i.minimum_stock)}</td>
                      <td className="px-5 py-3">
                        <StatusPill tone={s === "critical" ? "danger" : s === "low" ? "warning" : "success"}>{s}</StatusPill>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(i)}><Pencil className="size-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => del.mutate(i.id)}><Trash2 className="size-4 text-danger" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${active ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-accent"}`}
    >
      {children}
    </button>
  );
}
