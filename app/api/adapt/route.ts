import { NextRequest, NextResponse } from "next/server";
import { APICallError } from "ai";
import { pool } from "@/lib/db";
import { adaptRecipe, type OriginalRecipeForAdaptation } from "@/lib/adapt-recipe";
import { getClientIp, ratelimit } from "@/lib/rate-limit";

const MAX_INSTRUCTION_LENGTH = 200;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const recipeId = Number(body?.recipeId);
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";

  if (!Number.isFinite(recipeId)) {
    return NextResponse.json({ error: "Missing or invalid 'recipeId'" }, { status: 400 });
  }
  if (!instruction) {
    return NextResponse.json({ error: "Missing required field 'instruction'" }, { status: 400 });
  }
  if (instruction.length > MAX_INSTRUCTION_LENGTH) {
    return NextResponse.json({ error: `'instruction' must be ${MAX_INSTRUCTION_LENGTH} characters or fewer` }, { status: 400 });
  }

  const { success, reset } = await ratelimit.limit(getClientIp(request));
  if (!success) {
    const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "You've reached today's search limit — please try again tomorrow." },
      { status: 429, headers: { "Retry-After": retryAfterSeconds.toString() } },
    );
  }

  const { rows } = await pool.query<OriginalRecipeForAdaptation>(
    `SELECT name, category, servings, ingredient_parts, ingredient_quantities, instructions
     FROM recipes WHERE recipe_id = $1`,
    [recipeId],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  try {
    const adapted = await adaptRecipe(rows[0], instruction);
    return NextResponse.json({ adapted });
  } catch (err) {
    console.error("adaptRecipe failed:", err);

    if (APICallError.isInstance(err) && err.statusCode === 429) {
      return NextResponse.json(
        { error: "The LLM provider's rate limit was hit for this request — wait a bit and try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ error: "Failed to adapt the recipe — the LLM provider returned an error." }, { status: 502 });
  }
}
