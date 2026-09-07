"use client";

import { useState, type SubmitEvent } from "react";
import { Search } from "lucide-react";
import { toast } from "react-toastify";
import RecipeCard from "./RecipeCard";
import RecipeDetail from "./RecipeDetail";
import ThemeToggle from "./ThemeToggle";
import type { AskResponse, RecipeResult } from "@/lib/types";

const EXAMPLE_QUERIES = [
  "chocolate dessert",
  "quick chicken dinner under 30 minutes",
  "I have broccoli and cheese, no nuts",
  "healthy low-carb breakfast",
];

const RELAXED_FILTER_LABELS: Record<string, string> = {
  dietaryKeywords: "dietary tags",
  maxTotalTimeMinutes: "time limit",
  category: "category",
  includeIngredients: "ingredients on hand",
};

export default function RecipeSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [hasError, setHasError] = useState(false);
  const [selected, setSelected] = useState<RecipeResult | null>(null);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;

    setQuery(trimmed);
    setLoading(true);
    setHasError(false);

    try {
      const res = await fetch(`/api/ask?q=${encodeURIComponent(trimmed)}`);
      const data: AskResponse = await res.json();

      if (res.ok) {
        setResponse(data);
      } else {
        setHasError(true);
        toast.error(data.error ?? "Something went wrong");
      }
    } catch {
      setHasError(true);
      toast.error("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    runSearch(query);
  }

  const results = response?.results ?? [];
  const relaxedFilters = response?.relaxedFilters ?? [];

  return (
    <div className="min-h-full">
      <header className="border-b border-panel-border bg-panel">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-6 pt-10 pb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              What&rsquo;s in the Pantry
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Describe a craving, what you have on hand, or a dietary constraint — an LLM turns it into
              structured filters and pgvector finds the closest matches among 1,223 recipes. Open any
              recipe and ask the AI to adapt it — vegan, gluten-free, halved — grounded in the original.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="mx-auto max-w-5xl px-6 pb-8">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. something quick with chicken and rice"
                className="w-full rounded-full border border-panel-border bg-background py-2.5 pr-4 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => runSearch(example)}
                className="rounded-full border border-panel-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {relaxedFilters.length > 0 && (
          <div className="mb-5 rounded-lg border border-accent/30 bg-tag-bg px-4 py-2.5 text-sm text-muted">
            No exact matches — showing broader results with{" "}
            {relaxedFilters.map((f) => RELAXED_FILTER_LABELS[f] ?? f).join(", ")} relaxed.
          </div>
        )}

        {results.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">
            {loading ? (
              "Searching…"
            ) : hasError ? null : response ? (
              <p>No recipes matched &ldquo;{response.query}&rdquo;. Try a different description.</p>
            ) : (
              <p>Search above, or try one of the example queries.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {results.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onSelect={() => setSelected(recipe)} />
            ))}
          </div>
        )}
      </main>

      {selected && <RecipeDetail recipe={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
