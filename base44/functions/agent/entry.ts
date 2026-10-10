// BarrioMatch onboarding agent.
// Remembers the user's full conversation (persisted in AgentConversation) and
// their confirmed profile (UserProfile), so every turn builds on everything the
// user has said before. The proposed priority profile is the accumulation of all
// stated values, priorities and data points — never a fresh restart.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const WELCOME = {
  role: "assistant",
  content: "Hi! I'm your BarrioMatch agent. Tell me what you're looking for — a home for you and your household, or a location for your business. Describe your situation, budget, and what matters to you, and I'll guide you from there. You can type or tap the mic to speak.",
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { input } = body;

    // --- Load persisted conversation (server is source of truth) ---
    // Plain client (acts as the calling user) so records are user-owned and the
    // frontend's useConversation reads the same conversation — the agent resumes
    // the same thread every turn instead of starting fresh.
    const convoPage = await base44.entities.AgentConversation.filter(
      {}, { limit: 1, sort: '-created_date' }
    );
    let conversation = (convoPage.items || [])[0] || null;

    // --- Load the user's confirmed profile so we can build on it ---
    const profPage = await base44.entities.UserProfile.filter(
      {}, { limit: 1, sort: '-created_date' }
    );
    const existingProfile = (profPage.items || [])[0] || null;

    const priorMessages = conversation?.messages?.length ? conversation.messages : [WELCOME];

    const accumulated = existingProfile ? {
      audience: existingProfile.audience,
      persona: existingProfile.persona,
      priorities: existingProfile.priorities || [],
      hard_filters: existingProfile.hard_filters || [],
      summary: existingProfile.raw_input_text || "",
    } : null;

    const systemPrompt = `You are BarrioMatch, a friendly expert on Barcelona's neighbourhoods (10 districts and 73 barris).
You help the user build a priority profile so the app can rank areas for them.

ACCUMULATE, DON'T RESTART. The user may already have a profile from a previous conversation. The proposed match must be the accumulation of ALL previously stated values, priorities and data points. Refine and extend what you already know; only discard a previous priority if the user explicitly changes their mind. Never ask again for information the user has already given.

${accumulated ? `CURRENT ACCUMULATED PROFILE (treat as already-collected truth, build on it):
${JSON.stringify(accumulated)}

When you output a new profile, carry forward every prior priority and hard filter that the user has not contradicted, merge in any new preferences from this turn, and re-rank/re-weight the combined set.` : ``}

STEP 0 — Detect audience:
From the first message, decide if the user is looking for a place for themselves / their household (B2C, audience "b2c") or for a business / commercial location (B2B, audience "b2b"). If it is genuinely unclear, ask ONE short disambiguating question before proceeding. Do not ask it if the answer is already obvious.

IF B2C (individual / household):
  Ask at most 3 to 5 short follow-up questions across: household composition, budget, car yes/no, work location, lifestyle. Never re-ask what the user already told you.
  Persona options: "Remote worker", "Family", "Retiree", "Relocating professional".

IF B2B (business):
  Ask at most 3 to 5 short follow-up questions across: business type / sector, team size, premises type (storefront / office / workshop / logistics), premises budget, footfall & customer access, staff commute, loading / parking. Never re-ask what the user already told you.
  Persona options: "Business founder", "Investor".

The 13 scoring categories (use these exact keys):
prices, healthcare, education, transport, car, safety, development, income, dailylife, environment, families, complaints, tourism.

Output STRICT JSON:
{
  "reply": "what you say this turn (warm, brief, under ~60 words). If you still need info, ask the next 1-2 questions here. If the user changed a priority or filter this turn, start with a one-sentence confirmation of exactly what changed.",
  "ready": boolean,
  "audience": "b2c" | "b2b",
  "profile": {
    "audience": "b2c" | "b2b",
    "persona": "Remote worker | Family | Retiree | Investor | Business founder | Relocating professional",
    "priorities": [ { "category_key": "...", "rank": 1, "weight": 85 } ],
    "hard_filters": [ { "label": "Metro within 500 m", "type": "distance_metro_500", "value": true } ],
    "summary": "one sentence summary of the user's accumulated situation"
  }
}

Rules:
- Always respond in the same language as the user (default English).
- ALWAYS return the complete profile object on EVERY turn — not only when ready. It is the full accumulated state: merge the user's new input into the CURRENT ACCUMULATED PROFILE. Carry forward every prior priority and hard filter the user has not contradicted; only drop or change one when the user explicitly asks.
- The user can EDIT their priorities at any time. Handle these requests: "add X" (insert the category with a sensible default weight), "remove/drop X" (delete it), "make X less/more important", "lower X", "raise X", "X matters more/less" (adjust the weight up or down in steps of ~15), and explicit reordering ("X above Y"). After ANY edit, re-assign rank 1..N by descending weight.
- Only set ready=true once you know the audience, the persona, and at least 5 ranked priorities. Edits can happen before or after ready.
- Hard filters are optional; only include ones the user explicitly cares about. value:false = must NOT.
- Persona nudges weighting: Investor → prices/development/tourism; Remote worker → transport/dailylife; Retiree → environment/safety/healthcare; Family → education/families/safety; Business founder → dailylife/transport/tourism/prices.`;

    const convoMessages = [...priorMessages, { role: "user", content: input || "(no new input - please continue)" }];

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: systemPrompt + "\n\nConversation so far (JSON):\n" + JSON.stringify(convoMessages) +
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
        required: ["reply", "ready", "audience", "profile"]
      }
    });

    const reply = result?.reply || "(no reply)";
    const newMessages = [
      ...priorMessages,
      { role: "user", content: input || "" },
      { role: "assistant", content: reply },
    ];

    if (conversation) {
      conversation = await base44.entities.AgentConversation.update(conversation.id, {
        messages: newMessages,
        status: result?.ready ? "profile_ready" : (conversation.status || "ongoing"),
        draft_profile: result?.profile ? result.profile : (conversation.draft_profile || null),
      });
    } else {
      conversation = await base44.entities.AgentConversation.create({
        messages: newMessages,
        status: result?.ready ? "profile_ready" : "ongoing",
        draft_profile: result?.profile ? result.profile : null,
      });
    }

    return Response.json({ ...result, conversationId: conversation.id });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}