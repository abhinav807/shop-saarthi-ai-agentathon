import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Panel, MetricCard, StatusPill, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { computeKhataStats, formatINR, type CustomerDue } from "@/lib/business";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Phone,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/khatabook")({
  head: () => ({ meta: [{ title: "KhataBook · ShopSaarthi AI" }] }),
  component: KhataBookPage,
});

type Form = {
  customer_name: string;
  phone: string;
  amount: string;
  notes: string;
  due_date: string;
};

const empty: Form = {
  customer_name: "",
  phone: "",
  amount: "",
  notes: "",
  due_date: "",
};

type Tab = "all" | "pending" | "overdue" | "paid";

function KhataBookPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [tab, setTab] = useState<Tab>("all");

  const { data: dues = [], isLoading } = useQuery({
    queryKey: ["customer-dues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_dues")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomerDue[];
    },
  });

  const stats = computeKhataStats(dues);

  const now = new Date();
  const filtered = dues.filter((d) => {
    if (tab === "pending") return d.status !== "paid";
    if (tab === "overdue") return d.status !== "paid" && d.due_date && new Date(d.due_date) < now;
    if (tab === "paid") return d.status === "paid";
    return true;
  });

  const add = useMutation({
    mutationFn: async () => {
      const payload = {
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        amount: Number(form.amount || 0),
        notes: form.notes.trim(),
        due_date: form.due_date || null,
        status: "pending",
      };
      if (!payload.customer_name) throw new Error("Customer name required");
      if (payload.amount <= 0) throw new Error("Amount must be > 0");
      const { error } = await supabase.from("customer_dues").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Due added");
      qc.invalidateQueries({ queryKey: ["customer-dues"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customer_dues")
        .update({ status: "paid", paid_date: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as paid");
      qc.invalidateQueries({ queryKey: ["customer-dues"] });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_dues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["customer-dues"] });
    },
  });

  return (
    <AppShell
      title="KhataBook"
      subtitle="Track customer dues, payments and outstanding balances."
      actions={
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setForm(empty);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Add due
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customer Due</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Customer Name</Label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="e.g. Suresh Yadav"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="9876543210"
                />
              </div>
              <div>
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div>
                <Label>Due Date (optional)</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="2kg sugar + oil"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => add.mutate()} disabled={add.isPending}>
                {add.isPending && <Loader2 className="size-4 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Outstanding"
            value={formatINR(stats.totalOutstanding)}
            tone="danger"
            icon={<BookOpen className="size-4" />}
          />
          <MetricCard
            label="Total Collected"
            value={formatINR(stats.totalPaid)}
            tone="success"
            icon={<CheckCircle2 className="size-4" />}
          />
          <MetricCard
            label="Pending"
            value={stats.pendingCount}
            tone="warning"
            icon={<Clock className="size-4" />}
          />
          <MetricCard
            label="Overdue"
            value={stats.overdueCount}
            tone={stats.overdueCount > 0 ? "danger" : "success"}
            icon={<AlertTriangle className="size-4" />}
          />
        </div>

        {/* Tab filters */}
        <Panel>
          <div className="flex items-center gap-1 mb-4 border-b -mx-5 px-5 -mt-5 pt-3">
            {(["all", "pending", "overdue", "paid"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm border-b-2 capitalize -mb-px transition-colors ${
                  tab === t
                    ? "border-foreground text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="size-5" />}
              title={dues.length === 0 ? "No dues recorded" : `No ${tab} dues`}
              description={
                dues.length === 0
                  ? "Add your first customer due to start tracking udhar."
                  : "Try a different filter."
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((d) => {
                const isOverdue = d.status !== "paid" && d.due_date && new Date(d.due_date) < now;
                return (
                  <div
                    key={d.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg ${
                      d.status === "paid"
                        ? "bg-success-soft/30 border-success/20"
                        : isOverdue
                          ? "bg-danger-soft/30 border-danger/20"
                          : "bg-card"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{d.customer_name}</span>
                        <StatusPill
                          tone={d.status === "paid" ? "success" : isOverdue ? "danger" : "warning"}
                        >
                          {d.status === "paid" ? "Paid" : isOverdue ? "Overdue" : "Pending"}
                        </StatusPill>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {d.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" />
                            {d.phone}
                          </span>
                        )}
                        {d.notes && <span>{d.notes}</span>}
                        {d.due_date && (
                          <span>
                            Due:{" "}
                            {new Date(d.due_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        )}
                        {d.paid_date && (
                          <span className="text-success">
                            Paid:{" "}
                            {new Date(d.paid_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-semibold tabular-nums ${
                          d.status === "paid" ? "text-success" : "text-danger"
                        }`}
                      >
                        {formatINR(Number(d.amount))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {d.status !== "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markPaid.mutate(d.id)}
                          disabled={markPaid.isPending}
                        >
                          <CheckCircle2 className="size-3.5" /> Paid
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(d.id)}>
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
