"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { Clock, Flame, Sparkles, Star, Users, X } from "lucide-react";
import { toast } from "react-toastify";
import { formatMinutes } from "@/lib/format";
import type { AdaptedRecipe, AdaptResponse, RecipeResult } from "@/lib/types";

const ADAPT_EXAMPLES = ["Make it vegan", "Gluten-free", "Air fryer instead of oven", "Halve it"];

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function OriginalIngredientList({ recipe }: { recipe: RecipeResult }) {
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
      ? recipe.ingredient_parts.map((part, i) => `${recipe.ingredient_quantities[i] ? `${recipe.ingredient_quantities[i]} ` : ""}${part}`)
      : recipe.ingredient_parts;

  return <BulletList items={paired} />;
}

function InstructionList({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-3 space-y-3 text-sm">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
            {i + 1}
          </span>
          <span className="leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
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
  const [instruction, setInstruction] = useState("");
  const [adapting, setAdapting] = useState(false);
  const [adapted, setAdapted] = useState<AdaptedRecipe | null>(null);
  const [view, setView] = useState<"original" | "adapted">("original");

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

  async function runAdapt(text: string) {
    const trimmed = text.trim();
    if (!trimmed || adapting) return;

    setInstruction(trimmed);
    setAdapting(true);

    try {
      const res = await fetch("/api/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.recipe_id, instruction: trimmed }),
      });
      const data: AdaptResponse = await res.json();

      if (res.ok) {
        setAdapted(data.adapted);
        setView("adapted");
      } else {
        toast.error(data.error ?? "Something went wrong");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setAdapting(false);
    }
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    runAdapt(instruction);
  }

  const showingAdapted = view === "adapted" && adapted;

  return (
    <div className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl cursor-auto flex-col overflow-hidden rounded-2xl border border-panel-border bg-panel shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="themed-scroll min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-foreground">{recipe.name}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-tag-bg hover:text-foreground"
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

          {adapted && (
            <div className="mt-5 flex gap-1 rounded-full bg-tag-bg p-1 text-sm">
              <button
                type="button"
                onClick={() => setView("original")}
                className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 font-medium transition ${
                  view === "original" ? "bg-panel text-foreground shadow-sm" : "text-muted"
                }`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => setView("adapted")}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                  view === "adapted" ? "bg-panel text-foreground shadow-sm" : "text-muted"
                }`}
              >
                <Sparkles size={14} />
                AI-adapted
              </button>
            </div>
          )}

          {showingAdapted && (
            <div className="mt-4 rounded-lg border border-accent/30 bg-tag-bg p-3">
              <div className="font-display text-sm font-semibold text-foreground">{adapted.name}</div>
              <p className="mt-1 text-sm text-muted">{adapted.summary}</p>
            </div>
          )}

          <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <h3 className="font-display text-sm font-semibold tracking-wide text-foreground uppercase">
                Ingredients
              </h3>
              <div className="mt-3">
                {showingAdapted ? <BulletList items={adapted.ingredients} /> : <OriginalIngredientList recipe={recipe} />}
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold tracking-wide text-foreground uppercase">
                Instructions
              </h3>
              <InstructionList steps={showingAdapted ? adapted.instructions : recipe.instructions} />
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

          <div className="mt-6 border-t border-panel-border pt-4">
            <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold tracking-wide text-foreground uppercase">
              <Sparkles size={14} className="text-accent" />
              Adapt this recipe
            </h3>
            <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. make it dairy-free"
                className="flex-1 rounded-full border border-panel-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={adapting}
                className="cursor-pointer rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adapting ? "Adapting…" : "Adapt"}
              </button>
            </form>
            <div className="mt-2 flex flex-wrap gap-2">
              {ADAPT_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => runAdapt(example)}
                  disabled={adapting}
                  className="cursor-pointer rounded-full border border-panel-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
