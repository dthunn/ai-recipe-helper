import { config } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { Pool } from "pg";

const DATA_FILE = path.resolve(process.cwd(), "data/recipes_clean.csv");
const BATCH_SIZE = 100;

interface CsvRow {
  RecipeId: string;
  Name: string;
  AuthorName: string;
  CookTime: string;
  PrepTime: string;
  TotalTime: string;
  DatePublished: string;
  Description: string;
  Images: string;
  RecipeCategory: string;
  Keywords: string;
  RecipeIngredientQuantities: string;
  RecipeIngredientParts: string;
  AggregatedRating: string;
  ReviewCount: string;
  Calories: string;
  FatContent: string;
  SaturatedFatContent: string;
  CholesterolContent: string;
  SodiumContent: string;
  CarbohydrateContent: string;
  FiberContent: string;
  SugarContent: string;
  ProteinContent: string;
  RecipeServings: string;
  RecipeYield: string;
  RecipeInstructions: string;
}

interface RecipeRow {
  recipe_id: number;
  name: string;
  author_name: string | null;
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
  date_published: string | null;
  rating: number | null;
  review_count: number | null;
  calories: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  cholesterol_mg: number | null;
  sodium_mg: number | null;
  carbohydrate_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  protein_g: number | null;
  servings: string | null;
  recipe_yield: string | null;
}

// R serializes list columns as `c("a", "b", NA)` (or a bare `"a"` / `NA` when
// there's only one element, or `character(0)` when empty). Quotes inside an
// element are backslash-escaped (e.g. `1/8\" thickness`).
function parseRVector(raw: string): string[] {
  const tokens: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    tokens.push(match[1].replace(/\\(.)/g, "$1"));
  }
  return tokens;
}

function parseNullableString(raw: string | undefined): string | null {
  if (!raw || raw === "NA") return null;
  return raw;
}

function parseNullableNumber(raw: string | undefined): number | null {
  if (!raw || raw === "NA") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// ISO 8601 durations of the form PT#D#H#M#S (all components optional).
function parseDurationMinutes(raw: string | undefined): number | null {
  if (!raw || raw === "NA") return null;
  const match = raw.match(/^PT(?:(\d+)D)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * 24 * 60 +
    Number(hours ?? 0) * 60 +
    Number(minutes ?? 0) +
    Math.round(Number(seconds ?? 0) / 60)
  );
}

function parseDate(raw: string | undefined): string | null {
  if (!raw || raw === "NA") return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toRow(csv: CsvRow): RecipeRow | null {
  const recipeId = Number(csv.RecipeId);
  if (!Number.isFinite(recipeId) || !csv.Name) return null;

  return {
    recipe_id: recipeId,
    name: csv.Name,
    author_name: parseNullableString(csv.AuthorName),
    description: parseNullableString(csv.Description),
    category: parseNullableString(csv.RecipeCategory),
    keywords: parseRVector(csv.Keywords),
    ingredient_quantities: parseRVector(csv.RecipeIngredientQuantities),
    ingredient_parts: parseRVector(csv.RecipeIngredientParts),
    instructions: parseRVector(csv.RecipeInstructions),
    images: parseRVector(csv.Images),
    cook_time_minutes: parseDurationMinutes(csv.CookTime),
    prep_time_minutes: parseDurationMinutes(csv.PrepTime),
    total_time_minutes: parseDurationMinutes(csv.TotalTime),
    date_published: parseDate(csv.DatePublished),
    rating: parseNullableNumber(csv.AggregatedRating),
    review_count: parseNullableNumber(csv.ReviewCount),
    calories: parseNullableNumber(csv.Calories),
    fat_g: parseNullableNumber(csv.FatContent),
    saturated_fat_g: parseNullableNumber(csv.SaturatedFatContent),
    cholesterol_mg: parseNullableNumber(csv.CholesterolContent),
    sodium_mg: parseNullableNumber(csv.SodiumContent),
    carbohydrate_g: parseNullableNumber(csv.CarbohydrateContent),
    fiber_g: parseNullableNumber(csv.FiberContent),
    sugar_g: parseNullableNumber(csv.SugarContent),
    protein_g: parseNullableNumber(csv.ProteinContent),
    servings: parseNullableString(csv.RecipeServings),
    recipe_yield: parseNullableString(csv.RecipeYield),
  };
}

const COLUMNS = [
  "recipe_id",
  "name",
  "author_name",
  "description",
  "category",
  "keywords",
  "ingredient_quantities",
  "ingredient_parts",
  "instructions",
  "images",
  "cook_time_minutes",
  "prep_time_minutes",
  "total_time_minutes",
  "date_published",
  "rating",
  "review_count",
  "calories",
  "fat_g",
  "saturated_fat_g",
  "cholesterol_mg",
  "sodium_mg",
  "carbohydrate_g",
  "fiber_g",
  "sugar_g",
  "protein_g",
  "servings",
  "recipe_yield",
] as const;

function buildInsert(rows: RecipeRow[]): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const tuples = rows.map((row) => {
    values.push(
      row.recipe_id,
      row.name,
      row.author_name,
      row.description,
      row.category,
      row.keywords,
      row.ingredient_quantities,
      row.ingredient_parts,
      row.instructions,
      row.images,
      row.cook_time_minutes,
      row.prep_time_minutes,
      row.total_time_minutes,
      row.date_published,
      row.rating,
      row.review_count,
      row.calories,
      row.fat_g,
      row.saturated_fat_g,
      row.cholesterol_mg,
      row.sodium_mg,
      row.carbohydrate_g,
      row.fiber_g,
      row.sugar_g,
      row.protein_g,
      row.servings,
      row.recipe_yield,
    );
    const base = values.length - COLUMNS.length;
    const placeholders = COLUMNS.map((_, j) => `$${base + j + 1}`);
    return `(${placeholders.join(", ")})`;
  });

  const text = `
    INSERT INTO recipes (${COLUMNS.join(", ")})
    VALUES ${tuples.join(", ")}
    ON CONFLICT (recipe_id) DO UPDATE SET
      name = EXCLUDED.name,
      author_name = EXCLUDED.author_name,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      keywords = EXCLUDED.keywords,
      ingredient_quantities = EXCLUDED.ingredient_quantities,
      ingredient_parts = EXCLUDED.ingredient_parts,
      instructions = EXCLUDED.instructions,
      images = EXCLUDED.images,
      cook_time_minutes = EXCLUDED.cook_time_minutes,
      prep_time_minutes = EXCLUDED.prep_time_minutes,
      total_time_minutes = EXCLUDED.total_time_minutes,
      date_published = EXCLUDED.date_published,
      rating = EXCLUDED.rating,
      review_count = EXCLUDED.review_count,
      calories = EXCLUDED.calories,
      fat_g = EXCLUDED.fat_g,
      saturated_fat_g = EXCLUDED.saturated_fat_g,
      cholesterol_mg = EXCLUDED.cholesterol_mg,
      sodium_mg = EXCLUDED.sodium_mg,
      carbohydrate_g = EXCLUDED.carbohydrate_g,
      fiber_g = EXCLUDED.fiber_g,
      sugar_g = EXCLUDED.sugar_g,
      protein_g = EXCLUDED.protein_g,
      servings = EXCLUDED.servings,
      recipe_yield = EXCLUDED.recipe_yield;
  `;

  return { text, values };
}

async function main() {
  config({ path: ".env.local" });

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (add it to .env.local)");
  }

  const raw = readFileSync(DATA_FILE, "utf-8");
  const csvRows = parse(raw, { columns: true, skip_empty_lines: true }) as CsvRow[];

  const rows = csvRows.map(toRow).filter((row): row is RecipeRow => row !== null);
  const skipped = csvRows.length - rows.length;

  console.log(`Parsed ${rows.length} recipes (skipped ${skipped} invalid rows)`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  let imported = 0;
  try {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { text, values } = buildInsert(batch);
      await pool.query(text, values);
      imported += batch.length;
      console.log(`Imported ${imported}/${rows.length}`);
    }
  } finally {
    await pool.end();
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
