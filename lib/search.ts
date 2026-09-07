import { pool } from "./db";
import { embedText } from "./embeddings";

// Below this, a match is essentially noise rather than a real semantic hit —
// calibrated empirically the same way as ai-place-finder's threshold.
const MIN_SIMILARITY = 0.2;
const RESULT_LIMIT = 20;

export interface SearchParams {
  semanticQuery: string;
  category?: string | null;
  includeIngredients?: string[] | null;
  excludeIngredients?: string[] | null;
  dietaryKeywords?: string[] | null;
  maxTotalTimeMinutes?: number | null;
}

export interface SearchOutcome {
  results: SearchResult[];
  relaxedFilters: string[];
}

// With ~650 recipes, ANDing every constraint together (ingredients + time +
// dietary tags) frequently returns nothing. If the strict query comes up
// empty, we drop constraints one at a time — softest first — and retry.
// excludeIngredients is never relaxed: it's typically an allergy/dislike,
// a safety constraint rather than a preference.
const RELAXATION_ORDER: (keyof SearchParams)[] = [
  "dietaryKeywords",
  "maxTotalTimeMinutes",
  "category",
  "includeIngredients",
];

export interface SearchResult {
  id: number;
  recipe_id: number;
  name: string;
  description: string | null;
  category: string | null;
  keywords: string[];
  ingredient_quantities: string[];
  ingredient_parts: string[];
  instructions: string[];
  images: string[];
  cook_time_minutes: number | null;
  prep_time_minutes: number | null;
  total_time_minutes: number | null;
  rating: number | null;
  review_count: number | null;
  calories: number | null;
  servings: string | null;
  recipe_yield: string | null;
  similarity: number;
}

async function runQuery(vectorLiteral: string, params: SearchParams): Promise<SearchResult[]> {
  const { category, includeIngredients, excludeIngredients, dietaryKeywords, maxTotalTimeMinutes } = params;

  const conditions = ["embedding IS NOT NULL", `(1 - (embedding <=> $1::vector)) > ${MIN_SIMILARITY}`];
  const values: unknown[] = [vectorLiteral];

  if (category) {
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }

  if (maxTotalTimeMinutes != null) {
    values.push(maxTotalTimeMinutes);
    conditions.push(`total_time_minutes IS NOT NULL AND total_time_minutes <= $${values.length}`);
  }

  for (const ingredient of includeIngredients ?? []) {
    values.push(`%${ingredient}%`);
    conditions.push(
      `EXISTS (SELECT 1 FROM unnest(ingredient_parts) AS part WHERE part ILIKE $${values.length})`,
    );
  }

  for (const ingredient of excludeIngredients ?? []) {
    values.push(`%${ingredient}%`);
    conditions.push(
      `NOT EXISTS (SELECT 1 FROM unnest(ingredient_parts) AS part WHERE part ILIKE $${values.length})`,
    );
  }

  for (const keyword of dietaryKeywords ?? []) {
    values.push(`%${keyword}%`);
    conditions.push(`EXISTS (SELECT 1 FROM unnest(keywords) AS kw WHERE kw ILIKE $${values.length})`);
  }

  const { rows } = await pool.query<SearchResult>(
    `
    SELECT
      id,
      recipe_id,
      name,
      description,
      category,
      keywords,
      ingredient_quantities,
      ingredient_parts,
      instructions,
      images,
      cook_time_minutes,
      prep_time_minutes,
      total_time_minutes,
      rating,
      review_count,
      calories,
      servings,
      recipe_yield,
      1 - (embedding <=> $1::vector) AS similarity
    FROM recipes
    WHERE ${conditions.join(" AND ")}
    ORDER BY embedding <=> $1::vector
    LIMIT ${RESULT_LIMIT};
    `,
    values,
  );

  return rows;
}

export async function searchRecipes(params: SearchParams): Promise<SearchOutcome> {
  const queryEmbedding = await embedText(params.semanticQuery);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  let effectiveParams = params;
  let results = await runQuery(vectorLiteral, effectiveParams);

  const relaxedFilters: string[] = [];
  for (const filterKey of RELAXATION_ORDER) {
    if (results.length > 0) break;
    if (effectiveParams[filterKey] == null) continue;

    relaxedFilters.push(filterKey);
    effectiveParams = { ...effectiveParams, [filterKey]: null };
    results = await runQuery(vectorLiteral, effectiveParams);
  }

  return { results, relaxedFilters };
}
