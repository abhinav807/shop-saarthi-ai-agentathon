import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const PayloadSchema = z.object({
  inventory: z.array(z.any()),
  sales: z.array(z.any()),
});

export const generateDailyPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PayloadSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing AI gateway key");

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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_reports").insert({
      report_type: "planner",
      content: parsed,
    });

    return parsed;
  });
