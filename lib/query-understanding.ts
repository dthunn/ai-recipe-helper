import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";

const model = anthropic("claude-haiku-4-5");

const searchParamsSchema = z.object({
  semanticQuery: z
    .string()
    .describe(
      "A concise natural-language description of the dish and its desired qualities, suitable for semantic similarity search against short recipe descriptions (e.g. 'quick spicy noodle stir fry with vegetables').",
    ),
  category: z
    .string()
    .nullable()
    .describe(
      "A specific recipe category if the user clearly named one, matching values like 'Dessert', 'Chicken Breast', 'Beverages', 'Breakfast', 'Vegetable'. Null if no specific category is implied.",
    ),
  includeIngredients: z
    .array(z.string())
    .nullable()
    .describe(
      "Specific ingredients the user says they have on hand or explicitly wants included, as short ingredient names (e.g. ['chicken', 'broccoli', 'rice']). Null if none were mentioned.",
    ),
  excludeIngredients: z
    .array(z.string())
    .nullable()
    .describe(
      "Specific ingredients the user wants to avoid, due to allergy, dislike, or dietary restriction (e.g. ['peanuts', 'dairy']). Null if none were mentioned.",
    ),
  dietaryKeywords: z
    .array(z.string())
    .nullable()
    .describe(
      "Dietary or style tags implied by the query, matching loosely to recipe tag vocabulary like 'Healthy', 'Low Cholesterol', 'Low Protein', 'Very Low Carbs', 'Vegetarian', 'Easy'. Null if none apply.",
    ),
  maxTotalTimeMinutes: z
    .number()
    .int()
    .nullable()
    .describe(
      "Maximum total time (prep + cook) in minutes if the user gave or implied a time constraint (e.g. 'quick' or 'weeknight' implies 30-60, '15 minutes' implies 15). Null if not mentioned.",
    ),
});

export type SearchParamsFromQuery = z.infer<typeof searchParamsSchema>;

export async function understandQuery(query: string): Promise<SearchParamsFromQuery> {
  const { output } = await generateText({
    model,
    temperature: 0,
    output: Output.object({ schema: searchParamsSchema }),
    prompt: `Extract structured recipe-search parameters from this user query: "${query}"`,
  });

  return output;
}
