import { config } from "dotenv";
import { Pool } from "pg";
import { embedTexts } from "../lib/embeddings";

const BATCH_SIZE = 100;

interface RecipeRow {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  keywords: string[];
  ingredient_parts: string[];
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: string | null;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const hourPart = `${hours} hour${hours === 1 ? "" : "s"}`;
  return remainder > 0 ? `${hourPart} ${remainder} minutes` : hourPart;
}

function buildSearchText(recipe: RecipeRow): string {
  const parts: string[] = [];

  parts.push(recipe.category ? `${recipe.name} is a ${recipe.category} recipe.` : `${recipe.name}.`);

  if (recipe.description) {
    parts.push(recipe.description);
  }

  if (recipe.ingredient_parts.length > 0) {
    parts.push(`Ingredients: ${recipe.ingredient_parts.join(", ")}.`);
  }

  if (recipe.keywords.length > 0) {
    parts.push(`Tags: ${recipe.keywords.join(", ")}.`);
  }

  if (recipe.total_time_minutes != null) {
    parts.push(`Takes about ${formatMinutes(recipe.total_time_minutes)} total.`);
  }

  if (recipe.servings) {
    parts.push(`Serves ${recipe.servings}.`);
  }

  return parts.join(" ");
}

async function main() {
  config({ path: ".env.local" });

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (add it to .env.local)");
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set (add it to .env.local)");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows } = await pool.query<RecipeRow>(`
      SELECT id, name, description, category, keywords, ingredient_parts, cook_time_minutes, total_time_minutes, servings
      FROM recipes
      WHERE embedding IS NULL
    `);

    console.log(`Found ${rows.length} recipes without embeddings`);

    let processed = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const searchTexts = batch.map(buildSearchText);
      const embeddings = await embedTexts(searchTexts);

      for (let j = 0; j < batch.length; j++) {
        const recipe = batch[j];
        const searchText = searchTexts[j];
        const embedding = embeddings[j];
        const vectorLiteral = `[${embedding.join(",")}]`;

        await pool.query(`UPDATE recipes SET search_text = $1, embedding = $2::vector WHERE id = $3`, [
          searchText,
          vectorLiteral,
          recipe.id,
        ]);
      }

      processed += batch.length;
      console.log(`Embedded ${processed}/${rows.length}`);
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
