import { scoreColor, scoreLabel, scoreExplanation } from "@/lib/scoring";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Always shows a tooltip on hover explaining the rating. Pass `caption` to add
// context (e.g. the category name); pass `label` to override the tooltip text.
export default function ScoreBadge({ score, size = "md", caption, label }) {
  if (score == null) return <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">—</span>;
  const bg = scoreColor(score);
  const dims = size === "sm" ? "h-6 min-w-[1.75rem] text-xs px-1.5" : size === "lg" ? "h-11 min-w-[3rem] text-lg px-2.5" : "h-8 min-w-[2.25rem] text-sm px-2";
  const tip = label ?? `${caption ? caption + ": " : ""}${scoreLabel(score)} (${Number(score).toFixed(1)}/10) — ${scoreExplanation(score)}`;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            <span
              className={`inline-flex items-center justify-center rounded-md font-bold text-white shadow-sm ${dims}`}
              style={{ backgroundColor: bg }}
            >
              {Number(score).toFixed(1)}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[230px] text-xs leading-relaxed">{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}