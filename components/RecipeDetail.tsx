"use client";

import { useEffect } from "react";
import { Clock, Flame, Star, Users, X } from "lucide-react";
import { formatMinutes } from "@/lib/format";
import type { RecipeResult } from "@/lib/types";

function IngredientList({ recipe }: { recipe: RecipeResult }) {
  // A handful of recipes (source-data gap, not our parsing) have no
  // ingredient list at all — show that plainly rather than an empty list.
  if (recipe.ingredient_parts.length === 0) {
    return <p className="text-sm text-muted italic">Ingredient list not available for this recipe.</p>;
  }

  // The dataset's quantity/ingredient arrays are frequently mismatched in
  // length, so pairing them index-by-index would often attach the wrong
  // quantity to the wrong ingredient — only zip them when lengths line up.
  const paired =
    recipe.ingredient_quantities.length === recipe.ingredient_parts.length
      ? recipe.ingredient_parts.map((part, i) => [recipe.ingredient_quantities[i], part] as const)
      : recipe.ingredient_parts.map((part) => [null, part] as const);

  return (
    <ul className="space-y-1.5 text-sm">
      {paired.map(([quantity, part], i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>
            {quantity && <span className="font-medium">{quantity} </span>}
            {part}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NutritionStrip({ recipe }: { recipe: RecipeResult }) {
  const facts: { label: string; value: number | null; unit: string }[] = [
    { label: "Calories", value: recipe.calories, unit: "" },
    { label: "Protein", value: recipe.protein_g, unit: "g" },
    { label: "Carbs", value: recipe.carbohydrate_g, unit: "g" },
    { label: "Fat", value: recipe.fat_g, unit: "g" },
  ];

  if (facts.every((f) => f.value == null)) return null;

  return (
    <div className="grid grid-cols-4 gap-2 rounded-lg bg-tag-bg p-3 text-center">
      {facts.map((fact) => (
        <div key={fact.label}>
          <div className="font-display text-lg font-semibold text-foreground">
            {fact.value != null ? Math.round(fact.value) : "—"}
            {fact.value != null && fact.unit}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-muted">{fact.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function RecipeDetail({ recipe, onClose }: { recipe: RecipeResult; onClose: () => void }) {
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeydown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-panel-border bg-panel shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-foreground">{recipe.name}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tag-bg hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
            {recipe.category && (
              <span className="rounded-full bg-tag-bg px-2.5 py-1 text-xs font-medium tracking-wide uppercase">
                {recipe.category}
              </span>
            )}
            {recipe.total_time_minutes != null && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {formatMinutes(recipe.total_time_minutes)}
              </span>
            )}
            {recipe.rating != null && (
              <span className="flex items-center gap-1">
                <Star size={14} className="fill-accent text-accent" />
                {recipe.rating.toFixed(1)}
                {recipe.review_count != null && ` (${recipe.review_count} reviews)`}
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Users size={14} />
                Serves {recipe.servings}
              </span>
            )}
            {recipe.calories != null && (
              <span className="flex items-center gap-1">
                <Flame size={14} />
                {Math.round(recipe.calories)} cal
              </span>
            )}
          </div>

          {recipe.description && <p className="mt-4 text-sm leading-relaxed text-muted">{recipe.description}</p>}

          <div className="mt-5">
            <NutritionStrip recipe={recipe} />
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <h3 className="font-display text-sm font-semibold tracking-wide text-foreground uppercase">
                Ingredients
              </h3>
              <div className="mt-3">
                <IngredientList recipe={recipe} />
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold tracking-wide text-foreground uppercase">
                Instructions
              </h3>
              <ol className="mt-3 space-y-3 text-sm">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {recipe.keywords.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5 border-t border-panel-border pt-4">
              {recipe.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full bg-tag-bg px-2 py-0.5 text-[11px] text-muted">
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
