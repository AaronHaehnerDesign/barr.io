// B2B vs B2C separation: labels and framing per audience type.
// The agent determines `audience` (b2c | b2b) during onboarding; the views
// adapt their headlines and fit wording based on it.

export const AUDIENCES = {
  b2c: {
    key: "b2c",
    label: "Personal",
    resultsTitle: "Your top matches",
    resultsSubLabel: "ranked by personal match",
    fitLabel: "Personal match",
    mapTitle: "Barcelona heatmap",
    mapMetricLabel: "Personal match",
  },
  b2b: {
    key: "b2b",
    label: "Business",
    resultsTitle: "Best areas for your business",
    resultsSubLabel: "ranked by business fit",
    fitLabel: "Business fit",
    mapTitle: "Business potential heatmap",
    mapMetricLabel: "Business fit",
  }
};

export function audienceOf(profile) {
  return profile?.audience === "b2b" ? "b2b" : "b2c";
}

export function audienceConfig(profile) {
  return AUDIENCES[audienceOf(profile)];
}