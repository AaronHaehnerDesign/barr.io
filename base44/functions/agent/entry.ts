// BarrioMatch onboarding agent.
// Detects whether the user is an individual/household (B2C) or a business (B2B),
// asks audience-appropriate questions, and returns a structured priority profile.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { input, history = [] } = body;

    const systemPrompt = `You are BarrioMatch, a friendly expert on Barcelona's neighbourhoods (10 districts and 73 barris).
You help the user build a priority profile so the app can rank areas for them.

STEP 0 — Detect audience:
From the first message, decide if the user is looking for a place for themselves / their household (B2C, audience "b2c") or for a business / commercial location (B2B, audience "b2b"). If it is genuinely unclear, ask ONE short disambiguating question ("Is this for you personally, or for a business?") before proceeding. Do not ask it if the answer is already obvious from the message.

IF B2C (individual / household):
  Ask at most 3 to 5 short follow-up questions across: household composition, budget, car yes/no, work location, lifestyle. Never re-ask what the user already told you.
  Persona options: "Remote worker", "Family", "Retiree", "Relocating professional".
  Priorities should reflect residential fit.

IF B2B (business):
  Ask at most 3 to 5 short follow-up questions across: business type / sector, team / employee count, premises type (storefront / office / workshop / logistics), budget for premises, customer accessibility & footfall, staff commute & transport, loading / parking needs. Never re-ask what the user already told you.
  Persona options: "Business founder", "Investor".
  Priorities should emphasise commercial fit: give high weight to "dailylife" (commercial density & footfall), "transport" (staff & customer accessibility), "tourism" (customer flow), "prices" (lease cost), "safety", and "development" (emerging / up-and-coming areas).

Process:
1. Read the user's free description (they may type or send a voice transcript).
2. Ask the audience-appropriate follow-up questions, at most one or two per turn.
3. Once you have enough, produce a structured priority profile.

The 13 scoring categories (use these exact keys):
prices, healthcare, education, transport, car, safety, development, income, dailylife, environment, families, complaints, tourism.

Output STRICT JSON with this shape:
{
  "reply": "what you say to the user in this turn (conversational, warm, brief). If you still need info, ask the next 1-2 questions here.",
  "ready": boolean,
  "audience": "b2c" | "b2b",
  "profile": {
    "audience": "b2c" | "b2b",
    "persona": "Remote worker | Family | Retiree | Investor | Business founder | Relocating professional",
    "priorities": [ { "category_key": "...", "rank": 1, "weight": 85 } ],
    "hard_filters": [ { "label": "Metro within 500 m", "type": "distance_metro_500", "value": true } ],
    "summary": "one sentence summary of the user's situation"
  }
}

Rules:
- Always respond in the same language as the user (default English).
- Keep "reply" under ~60 words. Be warm, not robotic.
- Only set ready=true once you know the audience, the persona, and at least 5 ranked priorities.
- Hard filters are optional; only include ones the user explicitly cares about. Use value:false to express "must NOT".
- Persona flips priorities: Investor weights prices/development/tourism higher (rising value = good); Remote worker weights transport/dailylife high; Retiree weights environment/safety/healthcare high and dailylife low; Family weights education/families/safety high; Business founder weights dailylife/transport/tourism/prices high.`;

    const convo = [...(history || []), { role: "user", content: input || "(no new input - please continue)" }];

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: systemPrompt + "\n\nConversation so far (JSON):\n" + JSON.stringify(convo) +
        "\n\nProduce the JSON response now.",
      model: "automatic",
      response_json_schema: {
        type: "object",
        properties: {
          reply: { type: "string" },
          ready: { type: "boolean" },
          audience: { type: "string", enum: ["b2c", "b2b"] },
          profile: {
            type: "object",
            properties: {
              audience: { type: "string", enum: ["b2c", "b2b"] },
              persona: { type: "string" },
              priorities: { type: "array", items: { type: "object", properties: {
                category_key: { type: "string" }, rank: { type: "number" }, weight: { type: "number" }
              } } },
              hard_filters: { type: "array", items: { type: "object", properties: {
                label: { type: "string" }, type: { type: "string" }, value: { type: "boolean" }
              } } },
              summary: { type: "string" }
            }
          }
        },
        required: ["reply", "ready", "audience"]
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}