export interface RecipeResult {
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
  similarity: number;
}

export interface AskParams {
  semanticQuery: string;
  category: string | null;
  includeIngredients: string[] | null;
  excludeIngredients: string[] | null;
  dietaryKeywords: string[] | null;
  maxTotalTimeMinutes: number | null;
}

export interface AskResponse {
  query: string;
  params: AskParams;
  results: RecipeResult[];
  relaxedFilters: string[];
  error?: string;
}

export interface AdaptedRecipe {
  name: string;
  summary: string;
  ingredients: string[];
  instructions: string[];
}

export interface AdaptResponse {
  adapted: AdaptedRecipe;
  error?: string;
}
