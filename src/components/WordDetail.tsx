import type { Enrichment, Example, Grammar } from "../types";
import { speak, speechSupported } from "../util/speak";

interface WordDetailProps {
  enrichment?: Enrichment;
  /** Trimmed view for the quiz feedback panel: senses + forms + one example. */
  compact?: boolean;
  /** Hide the IPA/syllables row when the host (lesson/word hero) already shows it. */
  hidePhonetics?: boolean;
}

function playAudio(url: string) {
  new Audio(url).play().catch(() => {});
}

function grammarRows(grammar: Grammar): [string, string][] {
  if (grammar.noun) {
    const n = grammar.noun;
    const rows: [string, string][] = [];
    if (n.article) rows.push(["article", n.article]);
    if (n.plural) rows.push(["plural", n.plural]);
    if (n.diminutive) rows.push(["diminutive", n.diminutive]);
    return rows;
  }
  if (grammar.verb) {
    const v = grammar.verb;
    const rows: [string, string][] = [];
    if (v.presentSg) rows.push(["present", v.presentSg]);
    if (v.pastSg) rows.push(["past", v.pastSg]);
    if (v.pastPl) rows.push(["past pl.", v.pastPl]);
    if (v.pastParticiple) rows.push(["participle", v.pastParticiple]);
    if (v.auxiliary) rows.push(["auxiliary", v.auxiliary]);
    return rows;
  }
  if (grammar.adjective) {
    const a = grammar.adjective;
    const rows: [string, string][] = [];
    if (a.comparative) rows.push(["comparative", a.comparative]);
    if (a.superlative) rows.push(["superlative", a.superlative]);
    return rows;
  }
  return [];
}

function ExampleItem({ ex }: { ex: Example }) {
  return (
    <li className="example-item">
      <div className="example-nl">
        {ex.nl}
        {speechSupported() && (
          <button type="button" className="speak-btn" onClick={() => speak(ex.nl)} aria-label="Pronounce example">
            🔊
          </button>
        )}
      </div>
      {ex.en && <div className="example-en">{ex.en}</div>}
      {ex.ru && <div className="example-ru">{ex.ru}</div>}
    </li>
  );
}

function Relations({ label, words }: { label: string; words?: string[] }) {
  if (!words?.length) return null;
  return (
    <div className="relation-row">
      <span className="relation-label">{label}</span>
      <span className="relation-chips">
        {words.map((w) => (
          <span key={w} className="relation-chip">{w}</span>
        ))}
      </span>
    </div>
  );
}

export function WordDetail({ enrichment, compact, hidePhonetics }: WordDetailProps) {
  if (!enrichment) return null;
  const e = enrichment;
  const separable = e.grammar?.verb?.separable;
  const formRows = e.grammar ? grammarRows(e.grammar) : [];
  const senses = compact ? e.senses?.slice(0, 2) : e.senses;
  const examples = compact ? e.examples?.slice(0, 1) : e.examples;
  const showLabels = !compact;

  return (
    <div className={`word-detail-rich ${compact ? "compact" : ""}`}>
      {!hidePhonetics && (e.ipa || e.syllables || e.audioUrl) && (
        <div className="word-phonetics">
          {e.ipa && <span className="word-ipa">{e.ipa}</span>}
          {e.syllables && <span className="word-syllables">{e.syllables}</span>}
          {e.audioUrl && (
            <button type="button" className="speak-btn" onClick={() => playAudio(e.audioUrl!)} aria-label="Play audio">
              🔊
            </button>
          )}
        </div>
      )}

      {senses?.length ? (
        <div className="lesson-section">
          {showLabels && <p className="section-label">Meanings</p>}
          <ol className="sense-list">
            {senses.map((s, i) => (
              <li key={i} className="sense-item">
                <span className="sense-gloss">{s.glosses.join("; ")}</span>
                {s.tags?.length ? (
                  <span className="sense-tags">{s.tags.map((t) => <span key={t} className="sense-tag">{t}</span>)}</span>
                ) : null}
                {s.glossRu?.length ? <span className="sense-ru">{s.glossRu.join(", ")}</span> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {e.glossRu?.length ? (
        <div className="lesson-section">
          {showLabels && <p className="section-label">Russian</p>}
          <p className="word-ru">{e.glossRu.join(", ")}</p>
        </div>
      ) : null}

      {formRows.length ? (
        <div className="lesson-section">
          {showLabels && <p className="section-label">Forms</p>}
          <table className="forms-table">
            <tbody>
              {formRows.map(([k, v]) => (
                <tr key={k} className="forms-row">
                  <td className="forms-key">{k}</td>
                  <td className="forms-val">
                    {v}
                    {k === "present" && separable && <span className="sep-badge">separable</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {examples?.length ? (
        <div className="lesson-section">
          {showLabels && <p className="section-label">Examples</p>}
          <ul className="example-list">
            {examples.map((ex) => <ExampleItem key={`${ex.source}-${ex.tatoebaId ?? ex.nl}`} ex={ex} />)}
          </ul>
        </div>
      ) : null}

      {!compact && (
        <>
          {(e.synonyms || e.antonyms || e.hypernyms || e.hyponyms || e.related) && (
            <div className="relations">
              <p className="section-label">Related</p>
              <Relations label="syn" words={e.synonyms} />
              <Relations label="ant" words={e.antonyms} />
              <Relations label="broader" words={e.hypernyms} />
              <Relations label="narrower" words={e.hyponyms} />
              <Relations label="related" words={e.related} />
            </div>
          )}

          {(e.topics?.length || e.register?.length || e.usageNotes?.length) ? (
            <div className="usage-notes">
              {(e.topics?.length || e.register?.length) ? (
                <div className="tag-row">
                  {e.register?.map((t) => <span key={t} className="usage-tag register">{t}</span>)}
                  {e.topics?.map((t) => <span key={t} className="usage-tag topic">{t}</span>)}
                </div>
              ) : null}
              {e.usageNotes?.map((n, i) => <p key={i} className="usage-note">{n}</p>)}
            </div>
          ) : null}

          {e.etymology && (
            <details className="etymology">
              <summary>Etymology</summary>
              <p>{e.etymology}</p>
            </details>
          )}
        </>
      )}
    </div>
  );
}
