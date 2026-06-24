import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const PayloadSchema = z.object({
  inventory: z.array(z.any()),
  sales: z.array(z.any()),
});

// Safe fallback mock data when AI gateway is not configured
const MOCK_AI_REPORT = {
  summary: "AI Coach is not configured. Please set LOVABLE_API_KEY to enable AI-powered insights.",
  opportunities: [
    { title: "Configure AI Gateway", detail: "Set LOVABLE_API_KEY in your environment to enable AI Coach features.", impact: "high" },
  ],
  risks: [],
  cost_reduction: [],
  revenue_growth: [],
  inventory_recommendations: [],
};

export const generateAiCoachReport = createServerFn({ method: "POST" })
  .validator((d: unknown) => PayloadSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    
    // Return mock data if no API key is configured
    if (!key || key === 'your-lovable-api-key-here') {
      console.warn("[AI Coach] LOVABLE_API_KEY not configured, returning mock data");
      return MOCK_AI_REPORT;
    }

    const gateway = createLovableAiGatewayProvider(key);

    const system =
      "You are ShopSaarthi AI, a senior business advisor for small Indian businesses (kirana stores, cafes, workshops). " +
      "Be concrete, practical, and rupee-aware. Avoid generic advice. Reference the user's actual products and numbers.";

    const prompt = `Analyse this small business and produce a strategic report.

INVENTORY (${data.inventory.length} items):
${JSON.stringify(data.inventory, null, 2)}

SALES (${data.sales.length} records):
${JSON.stringify(data.sales, null, 2)}

Respond ONLY with a valid JSON object. Schema:
{
  "summary": "2-3 sentence executive summary",
  "opportunities": [{"title": "...", "detail": "...", "impact": "high|medium|low"}],
  "risks": [{"title": "...", "detail": "...", "severity": "high|medium|low"}],
  "cost_reduction": [{"title": "...", "detail": "..."}],
  "revenue_growth": [{"title": "...", "detail": "..."}],
  "inventory_recommendations": [{"title": "...", "detail": "..."}]
}

Give 3-5 items per array. Be specific to the data above. No markdown, no code fences, JSON only.`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
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
        report_type: "coach",
        content: parsed,
      });
    } catch (e) {
      console.warn("[AI Coach] Could not persist report to Supabase:", e);
    }

    return parsed;
  });
