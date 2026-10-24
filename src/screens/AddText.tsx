import { useState } from "react";
import { MAX_TEXT_CHARS } from "../storage/userTexts";

interface AddTextProps {
  error: string | null;
  onSave: (title: string, text: string) => void;
  onBack: () => void;
}

export function AddText({ error, onSave, onBack }: AddTextProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const tooLong = text.length > MAX_TEXT_CHARS;

  return (
    <div className="screen add-text">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>Nieuwe tekst</h1>
        <div className="topbar-spacer" />
      </header>

      <input
        className="add-text-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel (optioneel)"
        aria-label="title"
      />
      <textarea
        className="add-text-body"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Plak hier een Nederlandse tekst. Een lege regel begint een nieuwe alinea."
        aria-label="text"
        lang="nl"
      />
      <div className={`add-text-count ${tooLong ? "over" : ""}`}>
        {text.length} / {MAX_TEXT_CHARS}
      </div>
      {error && <p className="add-text-error">{error}</p>}
      <button className="btn primary block" disabled={!text.trim() || tooLong} onClick={() => onSave(title, text)}>
        Opslaan en lezen
      </button>
    </div>
  );
}
