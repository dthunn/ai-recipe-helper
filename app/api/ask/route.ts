import { NextRequest, NextResponse } from "next/server";
import { APICallError } from "ai";
import { understandQuery } from "@/lib/query-understanding";
import { searchRecipes } from "@/lib/search";
import { getClientIp, ratelimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

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

  let params;
  try {
    params = await understandQuery(query);
  } catch (err) {
    console.error("understandQuery failed:", err);

    if (APICallError.isInstance(err) && err.statusCode === 429) {
      return NextResponse.json(
        { error: "The LLM provider's rate limit was hit for this request — wait a bit and try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Failed to understand the query — the LLM provider returned an error." },
      { status: 502 },
    );
  }

  const { results, relaxedFilters } = await searchRecipes(params);

  return NextResponse.json({ query, params, results, relaxedFilters });
}
