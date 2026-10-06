export const ALLERGENS = {
  peanuts: { label: "Peanuts", words: ["peanut", "groundnut"] },
  tree_nuts: { label: "Tree nuts", words: ["almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "macadamia", "brazil nut", "pine nut", "tree nut"] },
  milk: { label: "Milk / dairy", words: ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "whey", "casein", "ghee", "dairy", "paneer", "kefir"] },
  eggs: { label: "Eggs", words: ["egg", "mayonnaise", "mayo", "meringue"] },
  gluten: { label: "Wheat / gluten", words: ["wheat", "flour", "bread", "pasta", "noodle", "barley", "rye", "couscous", "seitan", "bulgur", "semolina", "gluten", "tortilla", "cracker", "breadcrumb"] },
  soy: { label: "Soy", words: ["soy", "tofu", "tempeh", "edamame", "miso"] },
  fish: { label: "Fish", words: ["fish", "salmon", "tuna", "cod", "tilapia", "anchovy", "anchovies", "sardine", "mackerel", "trout", "halibut"] },
  shellfish: { label: "Shellfish", words: ["shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop", "shellfish", "squid", "crayfish"] },
  sesame: { label: "Sesame", words: ["sesame", "tahini"] },
} as const;
export type AllergenKey = keyof typeof ALLERGENS;
export const ALLERGEN_KEYS = Object.keys(ALLERGENS) as AllergenKey[];
export const isAllergenKey = (k: string): k is AllergenKey => k in ALLERGENS;

/** Allergens found in the text (conservative keyword match: may flag safe items, e.g. "almond milk" for milk). */
export function findAllergens(text: string, selected: string[]): AllergenKey[] {
  const t = text.toLowerCase();
  return selected.filter(isAllergenKey).filter((k) => ALLERGENS[k].words.some((w) => t.includes(w)));
}
