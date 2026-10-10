// Pre-configured personas for the Persona Library. Each defines a full priority
// weighting (0-100 per category) so the app can rank neighbourhoods for that
// persona without an onboarding chat. Names that match PERSONA_FLIPS in
// categories.js ("Investor", "Remote worker", "Retiree") inherit its polarity
// flips; the others are scored straight.
export const PERSONA_LIBRARY = [
  {
    name: "Young Professional",
    audience: "b2c",
    icon: "Briefcase",
    description: "Single, social and career-focused. Wants cafés, nightlife and fast transit to the office.",
    priorities: [
      { category_key: "dailylife", weight: 88 },
      { category_key: "transport", weight: 85 },
      { category_key: "environment", weight: 65 },
      { category_key: "tourism", weight: 60 },
      { category_key: "safety", weight: 60 },
      { category_key: "income", weight: 55 },
      { category_key: "prices", weight: 55 },
      { category_key: "healthcare", weight: 45 },
      { category_key: "development", weight: 45 },
      { category_key: "complaints", weight: 50 },
      { category_key: "car", weight: 30 },
      { category_key: "education", weight: 25 },
      { category_key: "families", weight: 20 }
    ]
  },
  {
    name: "Remote worker",
    audience: "b2c",
    icon: "Coffee",
    description: "Works from home, values calm, walkable streets and solid connectivity for the occasional commute.",
    priorities: [
      { category_key: "transport", weight: 90 },
      { category_key: "dailylife", weight: 85 },
      { category_key: "environment", weight: 70 },
      { category_key: "prices", weight: 60 },
      { category_key: "safety", weight: 55 },
      { category_key: "healthcare", weight: 50 },
      { category_key: "complaints", weight: 50 },
      { category_key: "income", weight: 45 },
      { category_key: "development", weight: 40 },
      { category_key: "tourism", weight: 35 },
      { category_key: "car", weight: 30 },
      { category_key: "education", weight: 35 },
      { category_key: "families", weight: 20 }
    ]
  },
  {
    name: "Family",
    audience: "b2c",
    icon: "Baby",
    description: "Household with children. Schools, safety and family infrastructure come first.",
    priorities: [
      { category_key: "education", weight: 95 },
      { category_key: "families", weight: 90 },
      { category_key: "safety", weight: 85 },
      { category_key: "healthcare", weight: 75 },
      { category_key: "environment", weight: 70 },
      { category_key: "dailylife", weight: 65 },
      { category_key: "transport", weight: 60 },
      { category_key: "prices", weight: 55 },
      { category_key: "complaints", weight: 55 },
      { category_key: "car", weight: 45 },
      { category_key: "development", weight: 40 },
      { category_key: "income", weight: 40 },
      { category_key: "tourism", weight: 30 }
    ]
  },
  {
    name: "Retiree",
    audience: "b2c",
    icon: "HeartPulse",
    description: "Older resident seeking quiet, green, well-served surroundings close to healthcare.",
    priorities: [
      { category_key: "healthcare", weight: 90 },
      { category_key: "safety", weight: 85 },
      { category_key: "environment", weight: 80 },
      { category_key: "dailylife", weight: 70 },
      { category_key: "transport", weight: 60 },
      { category_key: "complaints", weight: 60 },
      { category_key: "income", weight: 55 },
      { category_key: "prices", weight: 50 },
      { category_key: "families", weight: 50 },
      { category_key: "car", weight: 40 },
      { category_key: "development", weight: 30 },
      { category_key: "tourism", weight: 25 },
      { category_key: "education", weight: 20 }
    ]
  },
  {
    name: "Relocating professional",
    audience: "b2c",
    icon: "Plane",
    description: "New to Barcelona from abroad. Wants easy citywide access, services and a lively base.",
    priorities: [
      { category_key: "transport", weight: 85 },
      { category_key: "dailylife", weight: 80 },
      { category_key: "safety", weight: 70 },
      { category_key: "environment", weight: 65 },
      { category_key: "prices", weight: 60 },
      { category_key: "healthcare", weight: 55 },
      { category_key: "income", weight: 50 },
      { category_key: "development", weight: 45 },
      { category_key: "complaints", weight: 50 },
      { category_key: "tourism", weight: 40 },
      { category_key: "car", weight: 35 },
      { category_key: "education", weight: 45 },
      { category_key: "families", weight: 25 }
    ]
  },
  {
    name: "Investor",
    audience: "b2b",
    icon: "Wallet",
    description: "Looking for capital growth and rental yield. Rising prices, development and tourism signal opportunity.",
    priorities: [
      { category_key: "prices", weight: 90 },
      { category_key: "development", weight: 85 },
      { category_key: "tourism", weight: 70 },
      { category_key: "income", weight: 65 },
      { category_key: "transport", weight: 60 },
      { category_key: "dailylife", weight: 55 },
      { category_key: "safety", weight: 50 },
      { category_key: "complaints", weight: 35 },
      { category_key: "car", weight: 35 },
      { category_key: "environment", weight: 40 },
      { category_key: "families", weight: 30 },
      { category_key: "healthcare", weight: 30 },
      { category_key: "education", weight: 25 }
    ]
  },
  {
    name: "Business founder",
    audience: "b2b",
    icon: "Users",
    description: "Opening a storefront or office. Needs footfall, customer access, transport and reasonable costs.",
    priorities: [
      { category_key: "dailylife", weight: 90 },
      { category_key: "transport", weight: 85 },
      { category_key: "tourism", weight: 75 },
      { category_key: "prices", weight: 65 },
      { category_key: "car", weight: 55 },
      { category_key: "development", weight: 50 },
      { category_key: "income", weight: 50 },
      { category_key: "safety", weight: 50 },
      { category_key: "complaints", weight: 45 },
      { category_key: "environment", weight: 40 },
      { category_key: "healthcare", weight: 30 },
      { category_key: "education", weight: 25 },
      { category_key: "families", weight: 20 }
    ]
  }
];

export function personaWeights(persona) {
  const w = {};
  (persona?.priorities || []).forEach((p) => (w[p.category_key] = p.weight));
  return w;
}