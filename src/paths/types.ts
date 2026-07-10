/** A contiguous batch of cards within a path, unlocked as one gate. */
export interface PathUnit {
  id: string;
  label: string;
  cardIds: string[];
}

/** An ordered progression track over the (path-agnostic) card database. */
export interface LearningPath {
  id: string;
  name: string;
  units: PathUnit[];
}

/** One difficulty tier as stored in `public/paths.json` (disjoint across tiers). */
export interface PathDifficultyDef {
  key: string;
  label: string;
  cardIds: string[];
}

/** A path definition as stored in `public/paths.json`. */
export interface PathDef {
  id: string;
  name: string;
  unitSize: number;
  difficulties: PathDifficultyDef[];
}

export interface PathsFile {
  version: number;
  paths: PathDef[];
}
