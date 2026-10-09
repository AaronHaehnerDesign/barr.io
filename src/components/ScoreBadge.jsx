import { scoreColor, scoreLabel } from "@/lib/scoring";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ScoreBadge({ score, size = "md", label }) {
  if (score == null) return <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">—</span>;
  const bg = scoreColor(score);
  const dims = size === "sm" ? "h-6 min-w-[1.75rem] text-xs px-1.5" : size === "lg" ? "h-11 min-w-[3rem] text-lg px-2.5" : "h-8 min-w-[2.25rem] text-sm px-2";
  const content = (
    <span
      className={`inline-flex items-center justify-center rounded-md font-bold text-white shadow-sm ${dims}`}
      style={{ backgroundColor: bg }}
      title={label}
    >
      {Number(score).toFixed(1)}
    </span>
  );
  if (label) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><span className="inline-flex">{content}</span></TooltipTrigger>
          <TooltipContent>{label ?? scoreLabel(score)}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return content;
}