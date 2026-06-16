# Dutch SRS App – High-Level Project Brief

## Goal

Create a small personal SRS learning app for Dutch vocabulary and phrases, inspired by the review experience of WaniKani / Tsurukame.

The app is not intended to be a full WaniKani clone, a public product, or a general-purpose Anki replacement. It should be a lightweight personal tool for drilling Dutch cards with a fast, pleasant, mobile-friendly review flow.

The main user goal is to build enough Dutch vocabulary and phrase recognition for A2/B1-level learning and later integration exam preparation, without relying on Duolingo-style gamification or a full course from day one.

## Context

The user likes the WaniKani learning/review flow and especially the Tsurukame iOS app experience: fast reviews, clear feedback, minimal friction, strong SRS structure, and a sense of progress. The Tsurukame source code is available in @../tsurukame dir.

The user does not know iOS development and does not want to spend time maintaining a complex native app. This project should therefore prioritize simplicity, maintainability, and fast personal usability over technical elegance.

The coding agent will have access to the existing app codebase and should inspect it before proposing the implementation plan.

## Product Scope

Build a simple local-first SRS app for Dutch cards.

The app should support:

- Learning new cards in small batches.
- Reviewing due cards.
- Typing answers manually.
- Checking answers against accepted answers.
- Showing immediate correct/incorrect feedback.
- Scheduling the next review based on an SRS interval.
- Tracking local progress.
- Working well on mobile, especially iPhone Safari.
- Optionally being installable as a PWA if this is easy and fits the codebase.

## Non-Goals

Do not build:

- User accounts.
- Backend sync.
- Social features.
- Payments.
- Multi-user support.
- Advanced analytics.
- A full Anki-compatible engine.
- A complete WaniKani clone.
- A native iOS app unless the existing codebase strongly suggests that this is the simplest path.

The app is for one personal user only. Simple local storage is acceptable.

## Desired User Experience

The review flow should feel closer to WaniKani / Tsurukame than to Duolingo.

The desired experience:

1. Open the app.
2. See how many lessons and reviews are available.
3. Start lessons or reviews immediately.
4. See one prompt at a time.
5. Type an answer.
6. Submit with Enter.
7. Get clear feedback.
8. Press Enter again to continue.
9. Finish the session with a short summary.

The flow should be fast, keyboard-friendly, and low-friction.

Mobile usability is important. The interface should work comfortably on a phone screen.

## Core Concepts

The app should have a simple concept of cards and review state.

A card represents one Dutch vocabulary item, phrase, or sentence.

A card may include:

- Stable id.
- Level or lesson group.
- Card type, for example word, phrase, or sentence.
- Prompt/front text.
- Expected/back answer.
- Accepted answers / aliases.
- Optional Dutch example sentence.
- Optional English translation.
- Optional notes.
- Optional audio reference if easy to support.

A review state represents the user’s progress for a specific card.

It may include:

- Card id.
- Current SRS stage.
- Next available review timestamp.
- Last reviewed timestamp.
- Number of incorrect answers.
- Whether the card is burned/completed.

The exact data model should be designed by the coding agent based on the existing app structure.

## Data Source

The app should load cards from a simple static data file first, for example JSON or CSV converted to JSON.

The initial implementation does not need a visual import flow.

A good first version can use:

- `cards.json` committed into the app.
- Local progress stored separately in browser storage.

Future extension may support converting Anki `.apkg` decks into this JSON format, but this should not block the first working version.

## Progress Storage

Use the simplest reliable local-first approach.

Acceptable options:

- `localStorage`
- IndexedDB
- A small local persistence abstraction if the existing app already has one

The user does not need accounts or cloud sync.

It would be useful to support simple backup/restore later:

- Export progress as JSON.
- Import progress from JSON.
- Reset progress.

These are nice-to-have unless they are very cheap to implement.

## SRS Behavior

Use a simple WaniKani-inspired SRS schedule.

The exact intervals can be adjusted, but a reasonable starting point is:

- First review after lesson: immediately or after a short delay
- Then: 4h
- 8h
- 1d
- 2d
- 1w
- 2w
- 1m
- 4m
- Burned / completed

On correct answer:

- Move the card to the next SRS stage.
- Schedule the next review according to the new stage.

On incorrect answer:

- Move the card down one or more stages.
- Show the correct answer.
- Reschedule the card sooner.

The exact failure behavior should be simple and understandable.

## Answer Checking

Answer checking should be pragmatic, not overly strict.

At minimum:

- Trim whitespace.
- Lowercase.
- Collapse repeated spaces.
- Ignore basic punctuation.

The app should support multiple accepted answers per card.

For Dutch, the system should eventually support aliases and small variations, but this does not need to be perfect in the first version.

The app should not require sophisticated natural language processing.

## Screens / Areas

Suggested high-level screens:

### Dashboard

Shows:

- Lessons available.
- Reviews due.
- Next review time.
- Basic progress summary.

### Lessons

Introduces new cards in small batches.

The lesson flow can be simple:

- Show card.
- Show meaning / explanation.
- Optionally show example sentence.
- Add card to review queue.

### Reviews

Main review session.

Required behavior:

- Show prompt.
- Input answer.
- Submit.
- Show feedback.
- Continue to next card.
- Update SRS state.

### Summary

After a session, show:

- Number of reviewed cards.
- Correct / incorrect count.
- Newly advanced cards.
- Failed cards if useful.

### Settings

Minimal settings only:

- Lesson batch size.
- Reset progress.
- Export/import progress if implemented.

## Design Direction

The UI should be simple, focused, and pleasant.

It can be inspired by WaniKani / Tsurukame interaction patterns.

Prioritize:

- Fast review flow.
- Large readable prompts.
- Clear feedback.
- Mobile-first layout.
- Dark mode if easy.
- Minimal distractions.

## Implementation Guidance for the Coding Agent

Before implementing, inspect the existing app codebase and propose the simplest architecture that fits it.

Prefer reusing existing app patterns, routing, state management, styling, and storage approaches if they already exist.

Avoid overengineering.

The first milestone should be a working vertical slice:

1. Load a small set of hardcoded/static cards.
2. Show dashboard counts.
3. Start a review session.
4. Type and check answers.
5. Update SRS state.
6. Persist progress locally.
7. Refresh the page and keep progress.

Only after that, improve lessons, card import, styling, and backup/export.

## Success Criteria

The project is successful when the user can:

- Add or update Dutch cards through a simple data file.
- Open the app on desktop or iPhone.
- Complete short review sessions quickly.
- See due reviews return according to SRS intervals.
- Keep progress locally across browser sessions.
- Use the app without accounts, setup friction, or manual scheduling.

The app should feel like a small personal Dutch drilling tool, not like a large learning platform.
