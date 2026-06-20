import { STAGE_COLORS, stageCategory, stageLabel } from "../srs/stages";

export function SrsStagePill({ stage }: { stage: number }) {
  const cat = stageCategory(stage);
  return (
    <span className="srs-pill" style={{ background: STAGE_COLORS[cat] }}>
      {stageLabel(stage)}
    </span>
  );
}
