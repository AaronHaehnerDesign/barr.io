// BarrioMatch onboarding agent.
// Takes the user's free text + conversation history and returns the agent's
// next chat message + (once enough is known) a structured priority profile.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { input, history = [] } = body;

    const systemPrompt = `You are BarrioMatch, a friendly expert on Barcelona's neighbourhoods (10 districts and 73 barris).
You help the user build a personal priority profile so the app can rank areas for them.

Process:
1. Read the user's free description (they may type or send a voice transcript).
2. Ask at most 3 to 5 SHORT follow-up questions total, across: household, budget, car yes/no, work location, lifestyle. Never re-ask what they already told you.
3. Detect ONE persona from: "Remote worker", "Family", "Retiree", "Investor", "Business founder", "Relocating professional".
4. Once you have enough, produce a structured priority profile.

The 13 scoring categories (use these exact keys):
prices, healthcare, education, transport, car, safety, development, income, dailylife, environment, families, complaints, tourism.

Output STRICT JSON with this shape:
{
  "reply": "what you say to the user in this turn (conversational, warm, brief). If you still need info, ask the next 1-2 questions here.",
  "ready": boolean,
  "profile": {
    "persona": "Remote worker | Family | Retiree | Investor | Business founder | Relocating professional",
    "priorities": [ { "category_key": "...", "rank": 1, "weight": 85 } ],
    "hard_filters": [ { "label": "Metro within 500 m", "type": "distance_metro_500", "value": true } ],
    "summary": "one sentence summary of the user's situation"
  }
}

Rules:
- Always respond in the same language as the user (default English).
- Keep "reply" under ~60 words. Be warm, not robotic.
- Only set ready=true once you know the persona and at least 5 ranked priorities.
- Hard filters are optional; only include ones the user explicitly cares about. Use value:false to express "must NOT".
- Persona flips priorities: Investor weights prices/development/tourism higher (rising value = good); Remote worker weights transport/dailylife high; Retiree weights environment/safety/healthcare high and nightlife(dailylife) low; Family weights education/families/safety high.`;

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
          profile: {
            type: "object",
            properties: {
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
        required: ["reply", "ready"]
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}