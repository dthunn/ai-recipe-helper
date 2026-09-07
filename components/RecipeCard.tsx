import { Clock, Star, UtensilsCrossed } from "lucide-react";
import { formatMinutes } from "@/lib/format";
import type { RecipeResult } from "@/lib/types";

export default function RecipeCard({ recipe, onSelect }: { recipe: RecipeResult; onSelect: () => void }) {
  const thumbnail = recipe.images[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full cursor-pointer items-stretch gap-4 rounded-xl border border-panel-border bg-panel p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-tag-bg">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-accent/50">
            <UtensilsCrossed size={26} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-display text-base font-semibold text-foreground">{recipe.name}</h3>
        </div>

        {recipe.category && (
          <span className="w-fit rounded-full bg-tag-bg px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted uppercase">
            {recipe.category}
          </span>
        )}

        <div className="flex items-center gap-3 text-xs text-muted">
          {recipe.total_time_minutes != null && (
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {formatMinutes(recipe.total_time_minutes)}
            </span>
          )}
          {recipe.rating != null && (
            <span className="flex items-center gap-1">
              <Star size={13} className="fill-accent text-accent" />
              {recipe.rating.toFixed(1)}
              {recipe.review_count != null && <span>({recipe.review_count})</span>}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
