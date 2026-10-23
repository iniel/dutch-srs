import type { PathMembership } from "../paths/engine";

export function PathChips({ paths }: { paths: PathMembership[] }) {
  if (!paths.length) return null;
  return (
    <div className="relation-row path-chips">
      <span className="relation-label">paths</span>
      <span className="relation-chips">
        {paths.map((m) => (
          <span key={m.pathId} className="relation-chip">{m.pathName} · {m.unitLabel}</span>
        ))}
      </span>
    </div>
  );
}
