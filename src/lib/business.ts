export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minimum_stock: number;
  category: string;
  created_at: string;
};

export type Sale = {
  id: string;
  product: string;
  quantity_sold: number;
  selling_price: number;
  cost_price: number;
  sale_date: string;
};

export type AIReport = {
  id: string;
  report_type: string;
  content: any;
  created_at: string;
};

export type ProductStat = {
  product: string;
  revenue: number;
  profit: number;
  units: number;
  margin: number;
};

export function computeSalesStats(sales: Sale[]) {
  let revenue = 0;
  let cost = 0;
  let units = 0;
  const byProduct: Record<string, ProductStat> = {};
  for (const s of sales) {
    const r = Number(s.selling_price) * Number(s.quantity_sold);
    const c = Number(s.cost_price) * Number(s.quantity_sold);
    revenue += r;
    cost += c;
    units += Number(s.quantity_sold);
    if (!byProduct[s.product]) {
      byProduct[s.product] = { product: s.product, revenue: 0, profit: 0, units: 0, margin: 0 };
    }
    byProduct[s.product].revenue += r;
    byProduct[s.product].profit += r - c;
    byProduct[s.product].units += Number(s.quantity_sold);
  }
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const products = Object.values(byProduct).map((p) => ({
    ...p,
    margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
  }));
  products.sort((a, b) => b.profit - a.profit);
  return { revenue, cost, profit, margin, units, products };
}

export function computeInventoryHealth(items: InventoryItem[]) {
  const total = items.length;
  if (total === 0) return { total: 0, healthy: 0, low: 0, critical: 0, score: 100 };
  let healthy = 0,
    low = 0,
    critical = 0;
  for (const i of items) {
    const q = Number(i.quantity);
    const min = Number(i.minimum_stock);
    if (q <= 0) critical++;
    else if (q < min) low++;
    else if (min > 0 && q < min * 1.5) low++;
    else healthy++;
  }
  const score = Math.round((healthy * 100 + low * 50 + critical * 0) / total);
  return { total, healthy, low, critical, score };
}

export function computeHealthScore(items: InventoryItem[], sales: Sale[]) {
  const inv = computeInventoryHealth(items);
  const s = computeSalesStats(sales);

  // Inventory health (35%)
  const invScore = inv.score;

  // Profitability (30%): margin > 30% = 100, < 0% = 0
  const profitScore = Math.max(0, Math.min(100, (s.margin / 30) * 100));

  // Stock availability (15%): % of items not critical
  const availScore =
    inv.total === 0 ? 50 : Math.round(((inv.total - inv.critical) / inv.total) * 100);

  // Product performance (20%): share of profitable products
  const profitableProducts = s.products.filter((p) => p.profit > 0).length;
  const perfScore =
    s.products.length === 0 ? 50 : Math.round((profitableProducts / s.products.length) * 100);

  const total = Math.round(
    invScore * 0.35 + profitScore * 0.3 + availScore * 0.15 + perfScore * 0.2,
  );
  return {
    total: Math.max(0, Math.min(100, total)),
    breakdown: {
      inventory: Math.round(invScore),
      profitability: Math.round(profitScore),
      availability: availScore,
      performance: perfScore,
    },
  };
}

export function stockStatus(item: InventoryItem): "critical" | "low" | "healthy" {
  const q = Number(item.quantity);
  const min = Number(item.minimum_stock);
  if (q <= 0) return "critical";
  if (q < min) return "low";
  if (min > 0 && q < min * 1.5) return "low";
  return "healthy";
}

export type ShopProfile = {
  id: string;
  owner_name: string;
  shop_name: string;
  address: string;
  business_category: string;
  created_at: string;
  updated_at: string;
};

export type CustomerDue = {
  id: string;
  customer_name: string;
  phone: string;
  amount: number;
  notes: string;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
};

export function computeKhataStats(dues: CustomerDue[]) {
  let totalOutstanding = 0;
  let totalPaid = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  const now = new Date();
  for (const d of dues) {
    const amt = Number(d.amount);
    if (d.status === "paid") {
      totalPaid += amt;
    } else {
      totalOutstanding += amt;
      pendingCount++;
      if (d.due_date && new Date(d.due_date) < now) {
        overdueCount++;
      }
    }
  }
  return { totalOutstanding, totalPaid, pendingCount, overdueCount };
}

export function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}
