import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type ShopProfile } from "@/lib/business";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, ArrowRight, Loader2, Store } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Kirana Store",
  "Tea Stall",
  "Retail Shop",
  "Grocery",
  "Bakery",
  "Pharmacy",
  "Stationery",
  "Electronics",
  "Clothing",
  "Other",
];

type WizardForm = {
  owner_name: string;
  shop_name: string;
  address: string;
  business_category: string;
};

const emptyForm: WizardForm = {
  owner_name: "",
  shop_name: "",
  address: "",
  business_category: "Kirana Store",
};

export function ShopProfileGate({ children }: { children: ReactNode }) {
  const profile = useQuery({
    queryKey: ["shop-profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shop_profile").select("*").limit(1);
      if (error) {
        // Table may not exist yet (migration pending)
        if (error.code === "PGRST204" || error.message?.includes("does not exist")) {
          return null;
        }
        throw error;
      }
      return (data?.[0] as ShopProfile | undefined) ?? null;
    },
    retry: 1,
  });

  if (profile.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Loading ShopSaarthi...</span>
        </div>
      </div>
    );
  }

  if (profile.isError) {
    // If table doesn't exist, skip the gate and let the app work
    return <>{children}</>;
  }

  if (!profile.data) {
    return <SetupWizard onComplete={() => profile.refetch()} />;
  }

  return <>{children}</>;
}

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<WizardForm>(emptyForm);
  const [step, setStep] = useState(0);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.owner_name.trim()) throw new Error("Owner name is required");
      if (!form.shop_name.trim()) throw new Error("Shop name is required");
      const { error } = await supabase.from("shop_profile").insert({
        owner_name: form.owner_name.trim(),
        shop_name: form.shop_name.trim(),
        address: form.address.trim(),
        business_category: form.business_category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Welcome to ShopSaarthi!");
      qc.invalidateQueries({ queryKey: ["shop-profile"] });
      onComplete();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canNext =
    step === 0 ? form.owner_name.trim().length > 0 && form.shop_name.trim().length > 0 : true;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-xl bg-primary text-primary-foreground mb-4">
            <Activity className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to ShopSaarthi AI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set up your shop in 30 seconds. Let's get started.
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[0, 1].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Store className="size-5" /> Your Details
              </h2>
              <div>
                <Label>Owner Name</Label>
                <Input
                  value={form.owner_name}
                  onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  autoFocus
                />
              </div>
              <div>
                <Label>Shop Name</Label>
                <Input
                  value={form.shop_name}
                  onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                  placeholder="e.g. Kumar General Store"
                />
              </div>
              <Button className="w-full" onClick={() => setStep(1)} disabled={!canNext}>
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Store className="size-5" /> Shop Details
              </h2>
              <div>
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Shop 12, Main Market, Sector 5"
                  autoFocus
                />
              </div>
              <div>
                <Label>Business Category</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setForm({ ...form, business_category: cat })}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                        form.business_category === cat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-accent"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending && <Loader2 className="size-4 animate-spin" />}
                  Launch ShopSaarthi
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Your data is stored securely. You can update these details later.
        </p>
      </div>
    </div>
  );
}
