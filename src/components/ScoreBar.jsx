import { scoreColor, scoreLabel } from "@/lib/scoring";

// horizontal 1-10 score bar with the consistent red->yellow->green color
export default function ScoreBar({ score, showLabel = true }) {
  if (score == null) return <span className="text-xs text-muted-foreground">External source — coming soon</span>;
  const pct = ((Math.max(1, Math.min(10, score)) - 1) / 9) * 100;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: scoreColor(score) }} />
      </div>
      {showLabel && <span className="text-xs text-muted-foreground w-16 text-right">{scoreLabel(score)}</span>}
    </div>
  );
}