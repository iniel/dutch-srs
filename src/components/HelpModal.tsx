interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="help-backdrop" onClick={onClose}>
      <div
        className="help-panel"
        role="dialog"
        aria-modal="true"
        aria-label="How this app works"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="help-header">
          <h2>How this app works</h2>
          <button className="icon-btn" onClick={onClose} aria-label="close">✕</button>
        </header>

        <div className="help-body">
          <h3>What this app is</h3>
          <p>
            This is an app for learning Dutch vocabulary. It is focused on writing: the goal is
            to remember how each word is spelled, what it means, and to be able to translate it
            in both directions, Dutch to English and English to Dutch.
          </p>
          <p>
            The word list is drawn from the TaalCompleet books, the Inburgeren Online course, and
            CEFR word lists.
          </p>

          <h3>Lessons</h3>
          <p>
            To learn new words, start with Lessons. Each lesson is a single word. You see the full
            card: the word, its translation and possible meanings, example sentences, how it is
            written, and its pronunciation, with a voiceover you can play. Tap Next to move through
            your learning batch. By default a batch is 5 words at a time; you can raise this in
            Settings.
          </p>

          <h3>The quiz</h3>
          <p>
            After you have gone through every word in the batch, the quiz begins. You write each
            word in both directions: Dutch to English and English to Dutch.
          </p>
          <p>
            When you answer in Dutch, be precise. Any mistake counts as wrong, apart from minor
            punctuation. You may drop “de” and “een” from the start of a word, because they are so
            common that leaving them out is faster. But “het” and any other article that a word
            needs must be included, or the answer is wrong.
          </p>
          <p>
            When you answer in English (Dutch to English), the check uses fuzzy matching, so small
            spelling slips are still accepted.
          </p>

          <h3>Removing the Dutch to English question</h3>
          <p>
            Sometimes the Dutch to English translation adds nothing, for example when the word is
            spelled the same or almost the same in both languages, so answering it just wastes time.
            You can remove that question from the current quiz and from all future reviews: you will
            never be asked for the Dutch to English translation of that word again. This does not
            affect your progress. You can also remove it from the word’s card, from search, or any
            other place the card appears; the button is at the bottom of the card.
          </p>

          <h3>Tips while answering</h3>
          <p>A few things on screen help you answer the right word when several look alike:</p>
          <ul>
            <li>
              The bar at the top tells you the type of word, for example verb or noun. The same
              spelling can be two different words, and this tells you which one is meant.
            </li>
            <li>
              Some words show a small hint underneath. These exist to separate a word from similar
              ones where answers could collide.
            </li>
            <li>
              Some questions have a Show example button. It reveals an example sentence with a gap,
              which points to the exact word expected here.
            </li>
          </ul>

          <h3>Levels and reviews</h3>
          <p>
            When you pass a word in the quiz it becomes a word in progress. It starts at Apprentice,
            then comes back for review on a set schedule. Each correct review moves it up:
            Apprentice, Guru, Master, Enlightened, and finally Burned. The higher the level, the
            rarer the reviews, because those words are harder to keep in memory. Once a word is
            Burned it is fully learned and you will never see it again.
          </p>

          <h3>Learning paths and unlocking</h3>
          <p>
            There are two paths through the words, and you can use either one at any time.
          </p>
          <ul>
            <li>TaalCompleet: words organised by the levels and units of the TaalCompleet books.</li>
            <li>
              Inburgeren Online: the same words organised differently, into easy, medium, and hard
              levels with subunits.
            </li>
          </ul>
          <p>
            In both paths, the next unit unlocks once about 90% of the words in the current unit
            reach Guru. You can switch paths whenever you like and learn in whichever you want;
            progress is shared, so it shows up in both. You also always see your overall progress
            across every word in the app.
          </p>

          <h3>Saving your progress</h3>
          <p>
            Your progress is stored in your browser’s local storage. That means it is tied to this
            browser, or, if you added the app to your home screen, to that installed app, which
            keeps its own separate storage.
          </p>
          <p>
            In Settings you can export your progress as a JSON file and import it later. You can
            also ask your coding agent to read this app’s source code and generate a progress JSON
            file matching the level you are already at, so you do not have to start from scratch.
          </p>
        </div>
      </div>
    </div>
  );
}
