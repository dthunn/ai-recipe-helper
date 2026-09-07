import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { AdaptedRecipe } from "./types";

const model = anthropic("claude-haiku-4-5");

const adaptedRecipeSchema = z.object({
  name: z.string().describe("A new recipe name reflecting the change, e.g. 'Vegan Chicken and Broccoli Lasagna'."),
  summary: z
    .string()
    .describe("One or two sentences summarizing the substitutions/adjustments made and why."),
  ingredients: z
    .array(z.string())
    .describe("The complete adapted ingredient list, each entry a natural string like '2 cups almond flour'."),
  instructions: z
    .array(z.string())
    .describe("The complete adapted step-by-step instructions, rewritten to match the new ingredients."),
});

export interface OriginalRecipeForAdaptation {
  name: string;
  category: string | null;
  servings: string | null;
  ingredient_parts: string[];
  ingredient_quantities: string[];
  instructions: string[];
}

function formatOriginalIngredients(recipe: OriginalRecipeForAdaptation): string {
  const paired =
    recipe.ingredient_quantities.length === recipe.ingredient_parts.length
      ? recipe.ingredient_parts.map((part, i) => `${recipe.ingredient_quantities[i] ?? ""} ${part}`.trim())
      : recipe.ingredient_parts;
  return paired.map((line) => `- ${line}`).join("\n");
}

export async function adaptRecipe(
  recipe: OriginalRecipeForAdaptation,
  instruction: string,
): Promise<AdaptedRecipe> {
  const { output } = await generateText({
    model,
    temperature: 0.4,
    output: Output.object({ schema: adaptedRecipeSchema }),
    prompt: `You are adapting an existing recipe based on a user's requested change. Keep the dish
recognizably similar to the original where possible, but fully apply the requested change — rewrite
every affected ingredient and instruction rather than just noting the change. Produce a complete,
cookable recipe, not a diff.

Original recipe: "${recipe.name}"${recipe.category ? ` (${recipe.category})` : ""}${recipe.servings ? `, serves ${recipe.servings}` : ""}

Original ingredients:
${formatOriginalIngredients(recipe)}

Original instructions:
${recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join("\n")}

Requested change: "${instruction}"`,
  });

  return output;
}
