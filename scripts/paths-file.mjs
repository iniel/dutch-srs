import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";

export function upsertPath(file, path) {
  if (!Array.isArray(file.paths)) throw new Error("Invalid paths file");
  const paths = file.paths.filter(p => p.id !== path.id);
  paths.push(path);
  const priority = id => id === "inburgering" ? 0 : id === "nederlands-in-gang" ? 1 : 2;
  paths.sort((a, b) => priority(a.id) - priority(b.id));
  return { ...file, paths };
}

export function writePath(filename, path) {
  const file = existsSync(filename) ? JSON.parse(readFileSync(filename, "utf8")) : { version: 1, paths: [] };
  writeFileSync(`${filename}.tmp`, JSON.stringify(upsertPath(file, path)));
  renameSync(`${filename}.tmp`, filename);
}
