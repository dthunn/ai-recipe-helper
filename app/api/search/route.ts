import { NextRequest, NextResponse } from "next/server";
import { searchRecipes } from "@/lib/search";
import { getClientIp, ratelimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim() || null;
  const includeIngredients = searchParams.getAll("include").map((s) => s.trim()).filter(Boolean);
  const excludeIngredients = searchParams.getAll("exclude").map((s) => s.trim()).filter(Boolean);
  const dietaryKeywords = searchParams.getAll("keyword").map((s) => s.trim()).filter(Boolean);
  const maxTimeParam = searchParams.get("maxTime");
  const maxTotalTimeMinutes = maxTimeParam ? Number(maxTimeParam) : null;

  if (!query) {
    return NextResponse.json({ error: "Missing required query parameter 'q'" }, { status: 400 });
  }

  const { success, reset } = await ratelimit.limit(getClientIp(request));
  if (!success) {
    const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "You've reached today's search limit — please try again tomorrow." },
      { status: 429, headers: { "Retry-After": retryAfterSeconds.toString() } },
    );
  }

  const { results, relaxedFilters } = await searchRecipes({
    semanticQuery: query,
    category,
    includeIngredients: includeIngredients.length ? includeIngredients : null,
    excludeIngredients: excludeIngredients.length ? excludeIngredients : null,
    dietaryKeywords: dietaryKeywords.length ? dietaryKeywords : null,
    maxTotalTimeMinutes,
  });

  return NextResponse.json({ query, category, results, relaxedFilters });
}
