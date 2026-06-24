import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const PayloadSchema = z.object({
  inventory: z.array(z.any()),
  sales: z.array(z.any()),
});

// Safe fallback mock data when AI gateway is not configured
const MOCK_DAILY_PLAN = {
  headline: "Configure AI Gateway for daily planning",
  priority: [
    { task: "Set LOVABLE_API_KEY in environment", why: "Required for AI-powered daily planning" },
  ],
  inventory: [
    { task: "Check stock levels manually", why: "AI planning not available without configuration" },
  ],
  sales: [
    { task: "Review recent sales records", why: "AI planning not available without configuration" },
  ],
  growth: [
    { task: "Configure AI to enable growth insights", why: "AI gateway key required" },
  ],
};

export const generateDailyPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PayloadSchema.parse(d))
  .handler(async ({ data }: { data: z.infer<typeof PayloadSchema> }) => {
    const key = process.env.LOVABLE_API_KEY;
    
    // Return mock data if no API key is configured
    if (!key || key === 'your-lovable-api-key-here') {
      console.warn("[Daily Planner] LOVABLE_API_KEY not configured, returning mock data");
      return MOCK_DAILY_PLAN;
    }

    const gateway = createLovableAiGatewayProvider(key);

    const today = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const prompt = `You are an AI business operations manager for a small Indian business.
Today is ${today}.

INVENTORY:
${JSON.stringify(data.inventory, null, 2)}

RECENT SALES:
${JSON.stringify(data.sales.slice(0, 50), null, 2)}

Generate a focused daily action plan. Respond ONLY with valid JSON:
{
  "headline": "1-line theme for today",
  "priority": [{"task": "...", "why": "..."}],
  "inventory": [{"task": "...", "why": "..."}],
  "sales": [{"task": "...", "why": "..."}],
  "growth": [{"task": "...", "why": "..."}]
}

3-5 tasks per category. Each task must be specific, actionable, and reference real product/numbers from the data. No markdown, JSON only.`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
    });

    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));

    // Persist report - only if Supabase is configured
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("ai_reports").insert({
        report_type: "planner",
        content: parsed,
      });
    } catch (e) {
      console.warn("[Daily Planner] Could not persist report to Supabase:", e);
    }

    return parsed;
  });
