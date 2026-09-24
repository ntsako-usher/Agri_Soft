

export const PLANS = {
  basic: {
    key: "basic",
    name: "Basic",
    tagline: "Start monitoring your soil",
    icon: "sprout",           // see PlanIcon mapping
    accent: "var(--accent)",
    features: [
      "Soil moisture",
      "Temperature",
      "Humidity",
      "Rain detection",
    ],
  },
  premium: {
    key: "premium",
    name: "Premium",
    tagline: "Full protection + weather",
    icon: "star",
    accent: "#d99a3b",         // amber
    features: [
      "Everything in Basic",
      "Atmospheric pressure",
      "Light intensity",
      "Fire detection (smoke + flame)",
      "Intruder detection (motion)",
      "Soil pH",
    ],
  },
};

export const PLAN_ORDER = ["basic", "premium"];

export function getPlan(key) {
  return PLANS[key] || PLANS.basic;
}