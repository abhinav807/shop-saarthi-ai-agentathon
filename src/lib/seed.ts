import { supabase } from "@/integrations/supabase/client";

export async function seedDemoData() {
  const inventory = [
    { name: "Sugar", quantity: 5, unit: "kg", minimum_stock: 10, category: "Raw Material" },
    { name: "Tea Leaves", quantity: 25, unit: "kg", minimum_stock: 8, category: "Raw Material" },
    { name: "Milk", quantity: 12, unit: "litre", minimum_stock: 15, category: "Dairy" },
    { name: "Biscuits Pack", quantity: 0, unit: "box", minimum_stock: 10, category: "Packaged" },
    { name: "Bread Loaf", quantity: 30, unit: "pcs", minimum_stock: 12, category: "Bakery" },
    { name: "Maggi Noodles", quantity: 48, unit: "pcs", minimum_stock: 20, category: "Packaged" },
    { name: "Cooking Oil", quantity: 18, unit: "litre", minimum_stock: 8, category: "Raw Material" },
    { name: "Coffee Powder", quantity: 3, unit: "kg", minimum_stock: 4, category: "Raw Material" },
  ];

  const sales = [
    { product: "Tea Leaves", quantity_sold: 0.5, selling_price: 600, cost_price: 380 },
    { product: "Bread Loaf", quantity_sold: 8, selling_price: 45, cost_price: 30 },
    { product: "Maggi Noodles", quantity_sold: 12, selling_price: 18, cost_price: 14 },
    { product: "Milk", quantity_sold: 6, selling_price: 60, cost_price: 50 },
    { product: "Cooking Oil", quantity_sold: 2, selling_price: 180, cost_price: 155 },
    { product: "Sugar", quantity_sold: 3, selling_price: 55, cost_price: 42 },
    { product: "Bread Loaf", quantity_sold: 5, selling_price: 45, cost_price: 30 },
    { product: "Tea Leaves", quantity_sold: 0.25, selling_price: 600, cost_price: 380 },
    { product: "Biscuits Pack", quantity_sold: 4, selling_price: 90, cost_price: 70 },
    { product: "Maggi Noodles", quantity_sold: 20, selling_price: 18, cost_price: 14 },
    { product: "Coffee Powder", quantity_sold: 0.3, selling_price: 800, cost_price: 520 },
    { product: "Milk", quantity_sold: 4, selling_price: 60, cost_price: 50 },
  ];

  await supabase.from("inventory").insert(inventory);

  const now = Date.now();
  const datedSales = sales.map((s, i) => ({
    ...s,
    sale_date: new Date(now - i * 1000 * 60 * 60 * 8).toISOString(),
  }));
  await supabase.from("sales").insert(datedSales);
}
