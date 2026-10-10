// Pre-configured personas for the Persona Library. Each defines a full priority
// weighting (0-100 per category) so the app can rank neighbourhoods for that
// persona without an onboarding chat. Names that match PERSONA_FLIPS in
// categories.js ("Investor", "Remote worker", "Retiree") inherit its polarity
// flips; the others are scored straight.
//
// The library is audience-scoped: Personal (b2c) presets are shown on personal
// accounts, Business (b2b) presets on business accounts. Each group has at
// least 8 presets.
export const PERSONA_LIBRARY = [
  // ---------------- Personal (b2c) ----------------
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
    name: "Student",
    audience: "b2c",
    icon: "GraduationCap",
    description: "University student on a budget. Needs affordable rent, good transit to campus and a lively, low-cost social scene.",
    priorities: [
      { category_key: "transport", weight: 88 },
      { category_key: "prices", weight: 85 },
      { category_key: "dailylife", weight: 80 },
      { category_key: "education", weight: 70 },
      { category_key: "environment", weight: 55 },
      { category_key: "safety", weight: 55 },
      { category_key: "complaints", weight: 50 },
      { category_key: "tourism", weight: 45 },
      { category_key: "development", weight: 40 },
      { category_key: "income", weight: 35 },
      { category_key: "healthcare", weight: 35 },
      { category_key: "car", weight: 25 },
      { category_key: "families", weight: 20 }
    ]
  },
  {
    name: "Digital nomad",
    audience: "b2c",
    icon: "Laptop",
    description: "Works while travelling. Wants fast connectivity, cafés, coworking energy and a vibrant, walkable base.",
    priorities: [
      { category_key: "transport", weight: 88 },
      { category_key: "dailylife", weight: 85 },
      { category_key: "environment", weight: 65 },
      { category_key: "tourism", weight: 60 },
      { category_key: "prices", weight: 60 },
      { category_key: "safety", weight: 60 },
      { category_key: "complaints", weight: 50 },
      { category_key: "development", weight: 45 },
      { category_key: "income", weight: 45 },
      { category_key: "healthcare", weight: 40 },
      { category_key: "car", weight: 25 },
      { category_key: "education", weight: 25 },
      { category_key: "families", weight: 20 }
    ]
  },
  {
    name: "Arts & culture lover",
    audience: "b2c",
    icon: "Palette",
    description: "Drawn to galleries, music venues, markets and street life. Wants cultural density and an animated neighbourhood.",
    priorities: [
      { category_key: "dailylife", weight: 90 },
      { category_key: "tourism", weight: 75 },
      { category_key: "transport", weight: 75 },
      { category_key: "environment", weight: 60 },
      { category_key: "development", weight: 55 },
      { category_key: "prices", weight: 55 },
      { category_key: "safety", weight: 55 },
      { category_key: "complaints", weight: 50 },
      { category_key: "income", weight: 45 },
      { category_key: "healthcare", weight: 40 },
      { category_key: "education", weight: 35 },
      { category_key: "car", weight: 25 },
      { category_key: "families", weight: 25 }
    ]
  },

  // ---------------- Business (b2b) ----------------
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
      { category_key: "commercial", weight: 55 },
      { category_key: "customeraccess", weight: 45 },
      { category_key: "operations", weight: 40 },
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
      { category_key: "customeraccess", weight: 80 },
      { category_key: "commercial", weight: 70 },
      { category_key: "prices", weight: 65 },
      { category_key: "car", weight: 55 },
      { category_key: "development", weight: 50 },
      { category_key: "income", weight: 50 },
      { category_key: "safety", weight: 50 },
      { category_key: "operations", weight: 50 },
      { category_key: "complaints", weight: 45 },
      { category_key: "environment", weight: 40 },
      { category_key: "healthcare", weight: 30 },
      { category_key: "education", weight: 25 },
      { category_key: "families", weight: 20 }
    ]
  },
  {
    name: "Retail boutique",
    audience: "b2b",
    icon: "ShoppingBag",
    description: "Brick-and-mortar shop relying on walk-in traffic. Needs high footfall, visibility, low rent and tourist flow.",
    priorities: [
      { category_key: "customeraccess", weight: 92 },
      { category_key: "commercial", weight: 85 },
      { category_key: "dailylife", weight: 78 },
      { category_key: "tourism", weight: 78 },
      { category_key: "transport", weight: 72 },
      { category_key: "prices", weight: 68 },
      { category_key: "operations", weight: 50 },
      { category_key: "safety", weight: 50 },
      { category_key: "car", weight: 48 },
      { category_key: "income", weight: 45 },
      { category_key: "development", weight: 40 },
      { category_key: "complaints", weight: 40 },
      { category_key: "environment", weight: 35 },
      { category_key: "families", weight: 25 },
      { category_key: "healthcare", weight: 25 },
      { category_key: "education", weight: 20 }
    ]
  },
  {
    name: "Restaurant & bar",
    audience: "b2b",
    icon: "UtensilsCrossed",
    description: "F&B venue needing terraces, tourist and evening footfall, plus loading zones and a lively nightlife scene.",
    priorities: [
      { category_key: "customeraccess", weight: 90 },
      { category_key: "dailylife", weight: 88 },
      { category_key: "tourism", weight: 82 },
      { category_key: "operations", weight: 78 },
      { category_key: "commercial", weight: 72 },
      { category_key: "transport", weight: 68 },
      { category_key: "prices", weight: 62 },
      { category_key: "complaints", weight: 58 },
      { category_key: "safety", weight: 52 },
      { category_key: "car", weight: 48 },
      { category_key: "income", weight: 45 },
      { category_key: "development", weight: 40 },
      { category_key: "environment", weight: 35 },
      { category_key: "families", weight: 25 },
      { category_key: "healthcare", weight: 25 },
      { category_key: "education", weight: 20 }
    ]
  },
  {
    name: "Tech office",
    audience: "b2b",
    icon: "Building2",
    description: "Software or professional-services office. Prioritises staff commute, affordable premises and a pleasant work district.",
    priorities: [
      { category_key: "operations", weight: 88 },
      { category_key: "transport", weight: 88 },
      { category_key: "commercial", weight: 78 },
      { category_key: "prices", weight: 72 },
      { category_key: "dailylife", weight: 68 },
      { category_key: "safety", weight: 62 },
      { category_key: "environment", weight: 58 },
      { category_key: "income", weight: 55 },
      { category_key: "car", weight: 52 },
      { category_key: "customeraccess", weight: 45 },
      { category_key: "development", weight: 48 },
      { category_key: "complaints", weight: 45 },
      { category_key: "tourism", weight: 35 },
      { category_key: "healthcare", weight: 35 },
      { category_key: "education", weight: 30 },
      { category_key: "families", weight: 25 }
    ]
  },
  {
    name: "Logistics & warehouse",
    audience: "b2b",
    icon: "Truck",
    description: "Storage, last-mile or workshop operation. Needs road access, loading bays, parking and cheap industrial space.",
    priorities: [
      { category_key: "operations", weight: 92 },
      { category_key: "car", weight: 85 },
      { category_key: "transport", weight: 80 },
      { category_key: "commercial", weight: 75 },
      { category_key: "prices", weight: 70 },
      { category_key: "safety", weight: 55 },
      { category_key: "development", weight: 50 },
      { category_key: "environment", weight: 45 },
      { category_key: "complaints", weight: 45 },
      { category_key: "income", weight: 38 },
      { category_key: "customeraccess", weight: 35 },
      { category_key: "dailylife", weight: 30 },
      { category_key: "healthcare", weight: 25 },
      { category_key: "education", weight: 20 },
      { category_key: "families", weight: 20 },
      { category_key: "tourism", weight: 20 }
    ]
  },
  {
    name: "Health & wellness clinic",
    audience: "b2b",
    icon: "Stethoscope",
    description: "Clinic, pharmacy or wellness studio. Wants healthcare density, easy patient access, parking and a residential catchment.",
    priorities: [
      { category_key: "healthcare", weight: 88 },
      { category_key: "customeraccess", weight: 82 },
      { category_key: "transport", weight: 78 },
      { category_key: "commercial", weight: 72 },
      { category_key: "families", weight: 68 },
      { category_key: "safety", weight: 65 },
      { category_key: "operations", weight: 60 },
      { category_key: "dailylife", weight: 60 },
      { category_key: "car", weight: 58 },
      { category_key: "prices", weight: 55 },
      { category_key: "income", weight: 55 },
      { category_key: "environment", weight: 50 },
      { category_key: "development", weight: 40 },
      { category_key: "complaints", weight: 45 },
      { category_key: "education", weight: 45 },
      { category_key: "tourism", weight: 35 }
    ]
  },
  {
    name: "Coworking space",
    audience: "b2b",
    icon: "Laptop",
    description: "Shared workspace targeting freelancers and nomads. Needs connectivity, footfall, cafés and a central, lively location.",
    priorities: [
      { category_key: "transport", weight: 88 },
      { category_key: "dailylife", weight: 84 },
      { category_key: "customeraccess", weight: 80 },
      { category_key: "commercial", weight: 72 },
      { category_key: "operations", weight: 65 },
      { category_key: "tourism", weight: 65 },
      { category_key: "prices", weight: 62 },
      { category_key: "environment", weight: 56 },
      { category_key: "safety", weight: 56 },
      { category_key: "income", weight: 52 },
      { category_key: "development", weight: 48 },
      { category_key: "complaints", weight: 45 },
      { category_key: "car", weight: 35 },
      { category_key: "healthcare", weight: 30 },
      { category_key: "education", weight: 30 },
      { category_key: "families", weight: 25 }
    ]
  }
];

export function personaWeights(persona) {
  const w = {};
  (persona?.priorities || []).forEach((p) => (w[p.category_key] = p.weight));
  return w;
}