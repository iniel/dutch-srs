import { useState } from "react";
import type { AppSettings, ProgressData } from "../types";
import {
  exportProgress,
  importProgress,
  resetProgress,
  updateSettings,
} from "../storage/progress";

interface SettingsProps {
  progress: ProgressData;
  onChange: (next: ProgressData) => void;
  onBack: () => void;
}

export function Settings({ progress, onChange, onBack }: SettingsProps) {
  const [importText, setImportText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function setSetting(partial: Partial<AppSettings>) {
    onChange(updateSettings(progress, partial));
  }

  function download() {
    const blob = new Blob([exportProgress(progress)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dutch-srs-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport() {
    try {
      const data = importProgress(importText);
      onChange(data);
      setImportText("");
      setMsg("Progress imported.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed.");
    }
  }

  return (
    <div className="screen settings">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>Settings</h1>
        <span className="topbar-spacer" />
      </header>

      <label className="setting-row">
        <span>Lesson batch size</span>
        <input
          type="number"
          min={1}
          max={20}
          value={progress.settings.lessonBatchSize}
          onChange={(e) =>
            setSetting({ lessonBatchSize: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })
          }
        />
      </label>

      <label className="setting-row">
        <span>Theme</span>
        <select
          value={progress.settings.theme}
          onChange={(e) => setSetting({ theme: e.target.value as AppSettings["theme"] })}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <label className="setting-row">
        <span>Unlock all levels</span>
        <input
          type="checkbox"
          checked={!!progress.settings.unlockAllLevels}
          onChange={(e) => setSetting({ unlockAllLevels: e.target.checked })}
        />
      </label>

      <section className="setting-block">
        <h2>Backup</h2>
        <button className="btn block" onClick={download}>Export progress (JSON)</button>
        <textarea
          className="import-area"
          placeholder="Paste exported JSON here to import…"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <button className="btn block" onClick={doImport} disabled={!importText.trim()}>Import progress</button>
      </section>

      <section className="setting-block">
        <h2>Danger zone</h2>
        <button
          className="btn block danger"
          onClick={() => {
            if (confirm("Reset all progress? This cannot be undone.")) {
              onChange(resetProgress());
              setMsg("Progress reset.");
            }
          }}
        >
          Reset progress
        </button>
      </section>

      {msg && <div className="settings-msg">{msg}</div>}
    </div>
  );
}
