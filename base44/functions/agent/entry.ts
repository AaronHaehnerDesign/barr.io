// BarrioMatch onboarding agent.
// Remembers the user's full conversation (persisted in AgentConversation) and
// their confirmed profile (UserProfile), so every turn builds on everything the
// user has said before. Personal and Business keep SEPARATE conversations and
// profiles: the active mode is passed in (`audience`), and the agent only ever
// loads/builds the profile and conversation for that mode.
//
// The agent can also answer factual questions about a specific district or barri
// using the indicator data already stored in the app. When the user mentions an
// area by name, we load that area's stored indicators and feed them to the LLM as
// a strict DATA SECTION; the model must answer from that section only, never invent
// a number, and be honest that some "count" indicators are smoothed/normalized
// values rather than exact tallies.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const WELCOME_B2C = {
  role: "assistant",
  content: "Hi! I'm your BarrioMatch agent — I'll help you find your ideal Barcelona neighbourhood. To start, who will be living there? Just you, a couple, or a family with kids?",
};
const WELCOME_B2B = {
  role: "assistant",
  content: "Hi! I'm your BarrioMatch agent — I'll help you find the right Barcelona location for your business. To start, what kind of business is it? (shop, restaurant, office, workshop…)",
};
const welcomeFor = (audience: string) => audience === "b2b" ? WELCOME_B2B : WELCOME_B2C;

// Base categories (Personal + Business), plus Business-only categories.
// Mirrors src/lib/categories.js so the agent lists the right categories per mode.
const BASE_CATS = ["prices","healthcare","education","transport","car","safety","development","income","dailylife","environment","families","complaints","tourism"];
const B2B_ONLY_CATS = ["commercial","customeraccess","operations"];
function catsForMode(audience: string): string[] {
  return audience === "b2b" ? [...BASE_CATS, ...B2B_ONLY_CATS] : BASE_CATS;
}

// Indicator name -> unit. Mirrors src/lib/categories.js so the agent can quote
// values with their unit. Keep in sync when indicators change.
const INDICATOR_UNITS: Record<string, string> = {
  "Average cadastral value": "€/m²",
  "Home sales volume": "sales/1000 inh.",
  "Average home size": "m²",
  "Rent burden": "index",
  "Hospitals (within 1 km)": "count",
  "Primary care centres (CAP)": "count",
  "Pharmacies per 10k inh.": "per 10k",
  "Primary & secondary schools": "count",
  "Nurseries (escoles bressol)": "count",
  "International schools": "count",
  "Metro / FGC / Renfe stations": "count",
  "Bus stops": "count",
  "Bike lanes": "km",
  "Pedestrian / 30 km/h streets": "%",
  "Parking zone cost (AREA)": "€/day",
  "Underground car parks": "count",
  "Low emission zone (ZBE)": "1/0",
  "EV chargers": "count",
  "Perceived safety (survey)": "0-10",
  "Traffic accidents": "per 10k inh.",
  "Police stations": "count",
  "Crime by area": "index",
  "Urban planning projects": "count",
  "Active public works": "count",
  "Net migration balance": "per 1k inh.",
  "Disposable household income": "€/year",
  "Inequality (Gini)": "0-1",
  "Households with children": "%",
  "Density": "inh./ha",
  "Employment by area": "index",
  "Ground-floor shops & businesses": "count",
  "Municipal markets": "count",
  "Terraces & bars": "count",
  "Libraries & sports centres": "count",
  "Beaches access": "1/0",
  "Noise level": "dB",
  "Air quality NO2": "µg/m³",
  "PM2.5": "µg/m³",
  "Street & park trees": "per ha",
  "Parks & green area": "m²/inh.",
  "Playgrounds": "count",
  "Open school playgrounds": "count",
  "Dog areas": "count",
  "Elderly care homes": "count",
  "Noise complaints": "per 1k inh.",
  "Dirt / cleanliness complaints": "per 1k inh.",
  "Pavement complaints": "per 1k inh.",
  "Tourist flats density": "per 1k inh.",
  "Tourist hotspots": "index",
  "Commercial premises availability": "count",
  "Average commercial rent": "€/m²/month",
  "Storefront vacancy rate": "%",
  "Pedestrian footfall": "index",
  "Storefront visibility": "index",
  "Tourist/customer flow": "index",
  "Staff commute time": "min",
  "Loading zones": "count",
  "Business parking": "count"
};

function normalize(s: string): string {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function stripArticle(s: string): string {
  return s.replace(/^(el|la|els|les|l')\s+/, '').trim();
}

function nameMatches(input: string, name: string): boolean {
  const n = normalize(name);
  if (n.length < 4) return false;
  const variants = [n, stripArticle(n)];
  return variants.some(v => v.length >= 4 && input.includes(v));
}

function areaToBlock(rec: any, type: string): string {
  const lines: string[] = [];
  const hd = type === 'district'
    ? `${rec.name} (district)`
    : `${rec.name} (barri in ${rec.district_name || '—'})`;
  lines.push(`## ${hd}${rec.population ? `, population ~${rec.population}` : ''}`);
  for (const ind of (rec.indicators || [])) {
    const unit = INDICATOR_UNITS[ind.indicator_name] || '';
    if (ind.external || ind.raw_value == null) {
      lines.push(`- ${ind.indicator_name}: [no value yet — external source, coming soon]`);
    } else {
      lines.push(`- ${ind.indicator_name}: ${ind.raw_value}${unit ? ' ' + unit : ''} (year ${ind.year ?? '?'})`);
    }
  }
  return lines.join('\n');
}

export default async function (req: any) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { input } = body;
    const audience = body.audience === "b2b" ? "b2b" : "b2c";
    const modeCats = catsForMode(audience);

    // --- Load persisted conversation for THIS mode (server is source of truth) ---
    const convoPage = await base44.entities.AgentConversation.filter(
      { audience, created_by_id: user.id }, { limit: 1, sort: '-created_date' }
    );
    let conversation = (convoPage.items || [])[0] || null;

    // --- Load the user's confirmed profile for THIS mode so we can build on it ---
    const profPage = await base44.entities.UserProfile.filter(
      { audience, created_by_id: user.id }, { limit: 1, sort: '-created_date' }
    );
    const existingProfile = (profPage.items || [])[0] || null;

    const welcome = welcomeFor(audience);
    const priorMessages = conversation?.messages?.length ? conversation.messages : [welcome];

    // Barcelona district names — always loaded so the agent can normalise work
    // locations to a known area (and answer area questions consistently).
    const districtNamePage = await base44.entities.District.filter(
      {}, { limit: 50, sort: 'code', fields: ['name'] }
    );
    const districtNamesList = (districtNamePage.items || []).map((d: any) => d.name).join(', ');

    const accumulated = existingProfile ? {
      audience: existingProfile.audience || audience,
      persona: existingProfile.persona,
      priorities: existingProfile.priorities || [],
      hard_filters: existingProfile.hard_filters || [],
      work_locations: existingProfile.work_locations || [],
      budget_type: existingProfile.budget_type || null,
      budget_max: existingProfile.budget_max || null,
      rooms_needed: existingProfile.rooms_needed || null,
      summary: existingProfile.raw_input_text || "",
    } : { audience, work_locations: [], budget_type: null, budget_max: null, rooms_needed: null };

    // --- Detect whether the user is asking about a specific district/barri ---
    let dataSection = "";
    const nInput = normalize(input || '');
    if (nInput.length) {
      const districtNames = await base44.entities.District.filter(
        {}, { limit: 50, sort: 'code', fields: ['name', 'code'] }
      );
      const barriNames = await base44.entities.Barri.filter(
        {}, { limit: 200, sort: 'code', fields: ['name', 'code', 'district_name'] }
      );

      type Match = { type: string; id: string };
      const matches: Match[] = [];
      for (const d of (districtNames.items || [])) {
        if (nameMatches(nInput, d.name)) matches.push({ type: 'district', id: d.id });
      }
      for (const b of (barriNames.items || [])) {
        if (nameMatches(nInput, b.name)) matches.push({ type: 'barri', id: b.id });
      }
      const seen = new Set<string>();
      const unique = matches.filter(m => !seen.has(m.id) && (seen.add(m.id), true));

      const blocks: string[] = [];
      for (const m of unique) {
        let rec: any = null;
        try {
          rec = m.type === 'district'
            ? await base44.entities.District.get(m.id)
            : await base44.entities.Barri.get(m.id);
        } catch { /* skip unreadable area */ }
        if (rec) blocks.push(areaToBlock(rec, m.type));
      }
      if (blocks.length) {
        dataSection = "DATA SECTION (use ONLY this to answer factual questions about the area; do not invent):\n" + blocks.join('\n');
      }
    }

    const personaOptions = audience === "b2b"
      ? '"Business founder", "Investor"'
      : '"Remote worker", "Family", "Retiree", "Relocating professional"';

    const systemPrompt = `You are BarrioMatch, a friendly expert on Barcelona's neighbourhoods (10 districts and 73 barris).
You help the user build a priority profile so the app can rank areas for them.

MODE: The user has already chosen ${audience === "b2b" ? "Business" : "Personal"} mode (audience "${audience}"). Do NOT ask whether they are personal or business — treat this as decided. ${audience === "b2b" ? "They are choosing a location for a business." : "They are choosing a home for themselves or their household."} The account type is FIXED for this account and can never be changed or switched — the "audience" field in your output must always be "${audience}", regardless of what the user says.

ACCUMULATE, DON'T RESTART. The user may already have a ${audience === "b2b" ? "Business" : "Personal"} profile from a previous conversation. The proposed match must be the accumulation of ALL previously stated values, priorities and data points. Refine and extend what you already know; only discard a previous priority if the user explicitly changes their mind. Never ask again for information the user has already given.

CURRENT ACCUMULATED PROFILE (treat as already-collected truth, build on it):
${JSON.stringify(accumulated)}

When you output a new profile, carry forward every prior priority, hard filter, work location, budget and room value that the user has not contradicted, merge in any new preferences from this turn, and re-rank/re-weight the combined set.

${dataSection ? `${dataSection}

Rules for data questions:
- Answer using ONLY the DATA SECTION above. Quote the stored raw value WITH its unit and year.
- These values are indicator figures sourced from Open Data BCN. Many are normalized or smoothed (e.g. per capita, within-1-km counts) — they are NOT always exact integer counts. If the user asks "how many" and the value is not a whole number, tell them it's an approximate indicator value (e.g. ≈2.6, averaged/smoothed around the area), not an exact tally. Do not round it up to a whole number and present it as a count.
- Never convert a normalized score into a count. Never invent, estimate, or look up a number that isn't in the DATA SECTION.
- If the indicator is marked "[no value yet — external source, coming soon]", say we don't have that data yet and it's coming soon.
- If the user asks about an indicator or area not present in the DATA SECTION, say we don't currently have that data, and invite them to ask about another area.
- Answer in the user's language. Keep it brief and warm.
- A data question does NOT change the user's profile — return the current accumulated profile unchanged.` : `We do not have an area-specific DATA SECTION for this turn. If the user is asking a factual question about a neighbourhood, politely ask which district or barri they mean (e.g. Sant Martí, Eixample, Gràcia, el Raval). Do not guess any numbers.`}

Collect mode-appropriate context:
${audience === "b2b"
  ? `BUSINESS: ask at most 3 to 5 short follow-up questions across: business type / sector, team size, premises type (storefront / office / workshop / logistics), premises budget, footfall & customer access, staff commute, loading / parking. Never re-ask what the user already told you. Persona options: ${personaOptions}. Also ask which Barcelona district or neighbourhood the business will be located in, and capture it as a single work_locations entry.`
  : `PERSONAL: ask at most 3 to 5 short follow-up questions across: household composition, budget (and whether to rent or buy), number of bedrooms needed, car yes/no, work location(s), must-haves and no-goes for the neighbourhood, lifestyle. Never re-ask what the user already told you. Persona options: ${personaOptions}.`}

APARTMENT SEARCH — capture so the app can show matching homes and pin work commutes on the map. Carry every value forward each turn (like priorities); only change one when the user explicitly updates it.
- work_locations: a list of { "label": short label, "area_name": a Barcelona district or barri name }. For a couple where both partners work in an office, capture BOTH partners' work locations (two entries, e.g. labels "Partner 1" and "Partner 2"). For a single worker, one entry. For business mode, one entry for the business location. Map each place the user names to the closest name from the Barcelona districts list below, or a known barri (el Born, Poblenou, Sant Antoni, Gràcia, el Raval, Sarrià…). If you cannot identify the area, set area_name to null and put the raw place in label.
- budget_type: "rent" or "buy".
- budget_max: a number — the max monthly rent (€) when budget_type is rent, or the max purchase price (€) when buy.
- rooms_needed: a number of bedrooms needed (minimum).
- MUST-HAVES & NO-GOES: actively ask what the user absolutely needs in a neighbourhood (must-haves) and what they want to avoid (no-goes) — e.g. "must have a metro within 500 m", "must have a school within 1 km", "must avoid tourist-flat hotspots", "no noisy nightlife streets". Capture each one in hard_filters: { label: short human label, type: a stable snake_case key derived from the label, value: true for a must-have, false for a no-go }. These are non-negotiable and carry forward each turn.
- The apartment budget (budget_type + budget_max + rooms_needed) presets the "Homes in your top districts", area-detail and Apartments filters, so always capture it.
Barcelona districts: ${districtNamesList}.

The opening assistant message already asked one mode-specific question. On the first turn, do NOT repeat it — acknowledge the user's first answer and ask the next mode-appropriate question.

The scoring categories for this mode (use these exact keys):
${modeCats.join(", ")}.

${audience === "b2b" ? `The Business-only categories (commercial, customeraccess, operations) draw on external data not yet in Open Data BCN. You may include them as priorities if the user cares about them, but tell the user their values are coming soon.` : ``}

Output STRICT JSON:
{
  "reply": "what you say this turn (warm, brief, under ~80 words). If answering a data question, give the grounded answer here. If you still need profile info, ask the next 1-2 questions here. If the user changed a priority, filter, work location, budget or rooms this turn, start with a one-sentence confirmation of exactly what changed.",
  "ready": boolean,
  "audience": "${audience}",
  "profile": {
    "audience": "${audience}",
    "persona": "string from the persona options above",
    "priorities": [ { "category_key": "...", "rank": 1, "weight": 85 } ],
    "hard_filters": [ { "label": "Metro within 500 m", "type": "metro_500", "value": true }, { "label": "Tourist-flat hotspot", "type": "no_tourist_flats", "value": false } ],
    "work_locations": [ { "label": "Partner 1", "area_name": "Eixample" } ],
    "budget_type": "rent",
    "budget_max": 2000,
    "rooms_needed": 2,
    "summary": "one sentence summary of the user's accumulated situation"
  }
}

Rules:
- Always respond in the same language as the user (default English).
- ALWAYS return the complete profile object on EVERY turn — not only when ready. It is the full accumulated state: merge the user's new input into the CURRENT ACCUMULATED PROFILE. Carry forward every prior priority, hard filter, work location, budget and room value the user has not contradicted; only drop or change one when the user explicitly asks. For a pure data question, return the profile unchanged.
- The user can EDIT their priorities at any time. Handle these requests: "add X" (insert the category with a sensible default weight), "remove/drop X" (delete it), "make X less/more important", "lower X", "raise X", "X matters more/less" (adjust the weight up or down in steps of ~15), and explicit reordering ("X above Y"). After ANY edit, re-assign rank 1..N by descending weight.
- Only set ready=true once you know the persona and at least 5 ranked priorities. Edits can happen before or after ready. (Audience is already known.)
- Hard filters capture the user's MUST-HAVES (value: true) and NO-GOES (value: false) — non-negotiable neighbourhood requirements. ALWAYS ask for at least one must-have and one no-go during onboarding if the user hasn't given any. Each entry needs { label: short label, type: snake_case key from the label, value: true (must-have) / false (no-go) }. Only include ones the user explicitly mentions; carry all of them forward each turn.
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
              work_locations: { type: "array", items: { type: "object", properties: {
                label: { type: "string" }, area_name: { type: "string" }
              } } },
              budget_type: { type: "string", enum: ["rent", "buy"] },
              budget_max: { type: "number" },
              rooms_needed: { type: "number" },
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
        audience,
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