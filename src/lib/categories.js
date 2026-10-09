// Single source of truth for the 13 scoring categories + their indicators.
// Used by the UI for labels/icons and by the seed for indicator metadata.

export const CATEGORIES = [
  { key: "prices", name: "Prices & Housing", icon: "Home", order: 1,
    description: "Cadastral value, sales volume, average home size and age, rent burden." },
  { key: "healthcare", name: "Healthcare", icon: "HeartPulse", order: 2,
    description: "Hospitals, primary care centres (CAPs) and pharmacies." },
  { key: "education", name: "Education", icon: "GraduationCap", order: 3,
    description: "Schools, nurseries and international schools." },
  { key: "transport", name: "Transport & Walkability", icon: "Footprints", order: 4,
    description: "Metro, Renfe, FGC, tram, bus, Bicing, bike lanes and pedestrian streets." },
  { key: "car", name: "Car Access", icon: "Car", order: 5,
    description: "Parking zones and costs, underground garages, low-emission zone and EV chargers." },
  { key: "safety", name: "Safety", icon: "ShieldCheck", order: 6,
    description: "Perceived safety from the resident survey, traffic accidents and police stations." },
  { key: "development", name: "Development & Change", icon: "Construction", order: 7,
    description: "Urban planning areas, public works and migration in/out of the barri." },
  { key: "income", name: "Income & Demographics", icon: "Wallet", order: 8,
    description: "Disposable income, inequality, age structure, households with children and density." },
  { key: "dailylife", name: "Daily Life", icon: "ShoppingBag", order: 9,
    description: "Ground-floor shops, markets, terraces, libraries, sports centres and beaches." },
  { key: "environment", name: "Environment", icon: "Leaf", order: 10,
    description: "Noise, air quality (NO2, PM10, PM2.5), trees, parks and heat exposure." },
  { key: "families", name: "Families & Pets", icon: "Baby", order: 11,
    description: "Playgrounds, open school playgrounds, dog areas and elderly care homes." },
  { key: "complaints", name: "Resident Complaints", icon: "MessageSquareWarning", order: 12,
    description: "Complaints to the council by topic: noise, dirt, pavements." },
  { key: "tourism", name: "Tourism Pressure", icon: "Luggage", order: 13,
    description: "Tourist flat density and tourist hotspots." }
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

export function getCategory(key) {
  return CATEGORY_MAP[key];
}

// Indicators per category: name, unit, direction (positive = higher is better),
// source_dataset (Open Data BCN code), last_updated, year, external (not in Opendata BCN).
export const INDICATORS = [
  // 1. Prices & Housing
  { name: "Average cadastral value", category_key: "prices", unit: "€/m²", direction: "negative", source_dataset: "cadastre-habitatge", last_updated: "2022-01-01", year: 2022, description: "Official property valuation used for taxes. Lower means more affordable to buy." },
  { name: "Home sales volume", category_key: "prices", unit: "sales/1000 inh.", direction: "positive", source_dataset: " Habitatge-segona-ma", last_updated: "2023-06-30", year: 2023, description: "How active the resale market is. More sales signal liquidity and demand." },
  { name: "Average home size", category_key: "prices", unit: "m²", direction: "positive", source_dataset: "cadastre-habitatge", last_updated: "2022-01-01", year: 2022, description: "Typical dwelling floor area. Larger homes mean more room per household." },
  { name: "Rent burden", category_key: "prices", unit: "index", direction: "negative", source_dataset: "external-rent", last_updated: "2024-01-01", year: 2024, external: true, description: "Share of income spent on rent. External source, coming soon." },

  // 2. Healthcare
  { name: "Hospitals (within 1 km)", category_key: "healthcare", unit: "count", direction: "positive", source_dataset: "equipaments-sanitaris", last_updated: "2024-01-15", year: 2024, description: "Hospitals reachable nearby. More means faster emergency access." },
  { name: "Primary care centres (CAP)", category_key: "healthcare", unit: "count", direction: "positive", source_dataset: "equipaments-sanitaris", last_updated: "2024-01-15", year: 2024, description: "Local clinics for everyday health needs. More centres mean shorter waits." },
  { name: "Pharmacies per 10k inh.", category_key: "healthcare", unit: "per 10k", direction: "positive", source_dataset: "farmacies", last_updated: "2024-03-01", year: 2024, description: "Pharmacy density relative to population. Higher means easier medicine access." },

  // 3. Education
  { name: "Primary & secondary schools", category_key: "education", unit: "count", direction: "positive", source_dataset: "equipaments-educatius", last_updated: "2024-01-15", year: 2024, description: "Number of local schools. More options and shorter commutes for families." },
  { name: "Nurseries (escoles bressol)", category_key: "education", unit: "count", direction: "positive", source_dataset: "equipaments-educatius", last_updated: "2024-01-15", year: 2024, description: "Public childcare for under-3s. More means better early-years options." },
  { name: "International schools", category_key: "education", unit: "count", direction: "positive", source_dataset: "equipaments-educatius", last_updated: "2024-01-15", year: 2024, description: "Schools teaching in English or other languages. Key for expat families." },

  // 4. Transport & Walkability
  { name: "Metro / FGC / Renfe stations", category_key: "transport", unit: "count", direction: "positive", source_dataset: "transport-public", last_updated: "2024-02-01", year: 2024, description: "Rail-based transit stops nearby. More means faster citywide travel." },
  { name: "Bus stops", category_key: "transport", unit: "count", direction: "positive", source_dataset: "transport-public", last_updated: "2024-02-01", year: 2024, description: "Density of bus coverage. More stops mean better local connectivity." },
  { name: "Bike lanes", category_key: "transport", unit: "km", direction: "positive", source_dataset: "carrils-bici", last_updated: "2023-12-01", year: 2023, description: "Kilometres of protected cycling infrastructure. More lanes mean safer cycling." },
  { name: "Pedestrian / 30 km/h streets", category_key: "transport", unit: "%", direction: "positive", source_dataset: "superilles", last_updated: "2023-09-01", year: 2023, description: "Share of traffic-calmed streets. Higher means quieter, walkable streets." },

  // 5. Car Access
  { name: "Parking zone cost (AREA)", category_key: "car", unit: "€/day", direction: "negative", source_dataset: "area-parking", last_updated: "2024-01-01", year: 2024, description: "Daily cost of regulated on-street parking. Cheaper is easier for car owners." },
  { name: "Underground car parks", category_key: "car", unit: "count", direction: "positive", source_dataset: "parquings", last_updated: "2023-06-01", year: 2023, description: "Paid garages available. More options if you need secure parking." },
  { name: "Low emission zone (ZBE)", category_key: "car", unit: "1/0", direction: "negative", source_dataset: "zbe", last_updated: "2023-01-01", year: 2023, description: "Whether the area restricts older or high-polluting vehicles." },
  { name: "EV chargers", category_key: "car", unit: "count", direction: "positive", source_dataset: "vehicles-electrics", last_updated: "2024-03-01", year: 2024, description: "Public electric-vehicle charging points. More supports going electric." },

  // 6. Safety
  { name: "Perceived safety (survey)", category_key: "safety", unit: "0-10", direction: "positive", source_dataset: "barometre", last_updated: "2023-06-01", year: 2023, description: "How safe residents feel, from the city survey. Higher is better." },
  { name: "Traffic accidents", category_key: "safety", unit: "per 10k inh.", direction: "negative", source_dataset: "accidents", last_updated: "2023-12-31", year: 2023, description: "Collisions per capita. Fewer means calmer, safer streets." },
  { name: "Police stations", category_key: "safety", unit: "count", direction: "positive", source_dataset: "policia", last_updated: "2024-01-01", year: 2024, description: "Police presence in the area. More stations can mean faster response." },
  { name: "Crime by area", category_key: "safety", unit: "index", direction: "negative", source_dataset: "external-crime", last_updated: "2024-01-01", year: 2024, external: true, description: "Reported crime levels. External source, coming soon." },

  // 7. Development & Change
  { name: "Urban planning projects", category_key: "development", unit: "count", direction: "positive", source_dataset: "planejament-urba", last_updated: "2024-01-01", year: 2024, description: "Active regeneration plans. More may signal rising appeal and investment." },
  { name: "Active public works", category_key: "development", unit: "count", direction: "negative", source_dataset: "obres-publics", last_updated: "2024-03-01", year: 2024, description: "Ongoing construction works. High counts can mean disruption and noise." },
  { name: "Net migration balance", category_key: "development", unit: "per 1k inh.", direction: "positive", source_dataset: "padro-municipal", last_updated: "2023-12-31", year: 2023, description: "People moving in minus out. Positive means the area is attracting residents." },

  // 8. Income & Demographics
  { name: "Disposable household income", category_key: "income", unit: "€/year", direction: "positive", source_dataset: "renda-familiar", last_updated: "2022-01-01", year: 2022, description: "Money left per household after taxes. Higher signals purchasing power." },
  { name: "Inequality (Gini)", category_key: "income", unit: "0-1", direction: "negative", source_dataset: "renda-familiar", last_updated: "2022-01-01", year: 2022, description: "Income spread within the area. Lower means a more balanced community." },
  { name: "Households with children", category_key: "income", unit: "%", direction: "positive", source_dataset: "padro-municipal", last_updated: "2023-12-31", year: 2023, description: "Share of families with kids. Higher means more family-friendly demand." },
  { name: "Density", category_key: "income", unit: "inh./ha", direction: "negative", source_dataset: "padro-municipal", last_updated: "2023-12-31", year: 2023, description: "People per hectare. Lower means more space; higher means vibrant but busy." },
  { name: "Employment by area", category_key: "income", unit: "index", direction: "positive", source_dataset: "external-employment", last_updated: "2024-01-01", year: 2024, external: true, description: "Local job market strength. External source, coming soon." },

  // 9. Daily Life
  { name: "Ground-floor shops & businesses", category_key: "dailylife", unit: "count", direction: "positive", source_dataset: "comerc", last_updated: "2024-01-15", year: 2024, description: "Street-level commerce count. More means livelier, convenient streets." },
  { name: "Municipal markets", category_key: "dailylife", unit: "count", direction: "positive", source_dataset: "mercats", last_updated: "2024-01-15", year: 2024, description: "Public fresh-food markets. More means easy daily groceries." },
  { name: "Terraces & bars", category_key: "dailylife", unit: "count", direction: "positive", source_dataset: "terrades", last_updated: "2023-12-01", year: 2023, description: "Café and bar terraces. More means active nightlife and social life." },
  { name: "Libraries & sports centres", category_key: "dailylife", unit: "count", direction: "positive", source_dataset: "equipaments-culturals", last_updated: "2024-01-15", year: 2024, description: "Cultural and sport facilities. More free-time options nearby." },
  { name: "Beaches access", category_key: "dailylife", unit: "1/0", direction: "positive", source_dataset: "platges", last_updated: "2023-06-01", year: 2023, description: "Whether the area has beach access. A coastal-lifestyle bonus." },

  // 10. Environment
  { name: "Noise level", category_key: "environment", unit: "dB", direction: "negative", source_dataset: "mapa-soroll", last_updated: "2017-01-01", year: 2017, description: "Average noise from the city noise map. Lower means quieter living." },
  { name: "Air quality NO2", category_key: "environment", unit: "µg/m³", direction: "negative", source_dataset: "qualitat-aire", last_updated: "2023-12-31", year: 2023, description: "Nitrogen dioxide from traffic. Lower means cleaner air to breathe." },
  { name: "PM2.5", category_key: "environment", unit: "µg/m³", direction: "negative", source_dataset: "qualitat-aire", last_updated: "2023-12-31", year: 2023, description: "Fine particulate pollution. Lower is healthier, especially for lungs." },
  { name: "Street & park trees", category_key: "environment", unit: "per ha", direction: "positive", source_dataset: "arbrat", last_updated: "2023-06-01", year: 2023, description: "Tree density per hectare. More trees mean shade and cooler streets." },
  { name: "Parks & green area", category_key: "environment", unit: "m²/inh.", direction: "positive", source_dataset: "parcs", last_updated: "2023-06-01", year: 2023, description: "Green space per resident. More means room to relax outdoors." },

  // 11. Families & Pets
  { name: "Playgrounds", category_key: "families", unit: "count", direction: "positive", source_dataset: "jocs-infantils", last_updated: "2024-01-15", year: 2024, description: "Public play areas for children. More options for young families." },
  { name: "Open school playgrounds", category_key: "families", unit: "count", direction: "positive", source_dataset: "patis-oberts", last_updated: "2024-01-15", year: 2024, description: "School yards open after hours. Extra outdoor space for kids." },
  { name: "Dog areas", category_key: "families", unit: "count", direction: "positive", source_dataset: "zones-gossos", last_updated: "2024-01-15", year: 2024, description: "Designated dog parks. Important for pet owners." },
  { name: "Elderly care homes", category_key: "families", unit: "count", direction: "positive", source_dataset: "serveis-socials", last_updated: "2024-01-15", year: 2024, description: "Care facilities for older residents. Supports multigenerational living." },

  // 12. Resident Complaints
  { name: "Noise complaints", category_key: "complaints", unit: "per 1k inh.", direction: "negative", source_dataset: "queixes-ciutadanes", last_updated: "2023-12-31", year: 2023, description: "Resident noise complaints per capita. Fewer means quieter streets." },
  { name: "Dirt / cleanliness complaints", category_key: "complaints", unit: "per 1k inh.", direction: "negative", source_dataset: "queixes-ciutadanes", last_updated: "2023-12-31", year: 2023, description: "Complaints about litter and cleanliness. Fewer means a cleaner area." },
  { name: "Pavement complaints", category_key: "complaints", unit: "per 1k inh.", direction: "negative", source_dataset: "queixes-ciutadanes", last_updated: "2023-12-31", year: 2023, description: "Complaints about pavement condition. Fewer means better-maintained streets." },

  // 13. Tourism Pressure
  { name: "Tourist flats density", category_key: "tourism", unit: "per 1k inh.", direction: "negative", source_dataset: "habitatge-turistic", last_updated: "2024-01-01", year: 2024, description: "Holiday-rental units per capita. High can crowd housing and streets." },
  { name: "Tourist hotspots", category_key: "tourism", unit: "index", direction: "negative", source_dataset: "afluencia-turistica", last_updated: "2023-09-01", year: 2023, description: "Concentration of tourist activity. High means lively but congested." }
];

export const PERSONAS = ["Remote worker", "Family", "Retiree", "Investor", "Business founder", "Relocating professional"];

// direction flips per persona: which indicators/categories flip polarity.
// For category-level scoring, a persona may treat a whole category differently.
export const PERSONA_FLIPS = {
  Investor: { tourism: "positive", development: "positive", prices: "positive" }, // rising prices = good
  "Remote worker": { dailylife: "positive", tourism: "neutral" }, // nightlife vibrant = good
  Retiree: { dailylife: "negative" } // nightlife = bad
};