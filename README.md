# Morphology — IC analysis lab

Practise Immediate Constituent (IC) analysis of English words: morpheme cards, binary IC tree,
classification, allomorphy, derivation vs. inflection, word family. English only.

## How it works
- **20 verified words** (`data.js`) work offline.
- **Dictionary** (`dict.js`): reads the static data of https://l2practice.github.io/dictionary/ for
  spelling checks and "did you mean", inflection → lemma, part of speech, definition, CEFR, etymology and
  search autocomplete. The entry is shown immediately while the AI works.
- **AI** (`ai.js`): each student pastes their own API key in *Settings* for any of Gemini, Grok (xAI), OpenAI,
  Claude, Groq or OpenRouter. The key is stored in that browser's `localStorage` and sent only to the chosen provider.
  *Load my models* lists the model ids the key can use; if a Gemini model is unavailable the app picks one
  automatically. The answer is streamed (morpheme cards appear as they arrive). When a provider is busy the page retries once, then tries another model of the same provider,
  then any other provider that has a saved key, and says which one answered. Results are cached on the device,
  so repeated words are instant and free.
- No server, no shared key, no logging. Host it as static files (GitHub Pages).

## Files
`index.html`, `style.css`, `app.js` (UI), `dict.js`, `ai.js`, `tree.js`, `bricks.js`, `data.js`,
`logo.svg` (full logo with text), `logo-mark.svg` / `favicon.svg` (no text).

## Run locally
`python3 -m http.server 8000` then open http://localhost:8000

## What the page shows
- **Morpheme cards, IC tree** (textbook style with braces, or boxes) and **classification frames**:
  Free · Bound, Base · Affix, Derivational · Inflectional and a details list. Each ambiguous ending (-ing, -ed, -ly, -er, -est) gets a "Watch the ending" note.
- **Same ending, different job**: suffixes such as -ing (v) / -ing (N) / -ing (adj) or -ed (v2) / -ed (adj) are labelled
  separately; adverbial -ly is treated as inflectional.
- **Word type**: simple, compound or complex word, worked out from the morphemes.
- **Popup banners** for every message. When the AI is not available the banner contains the provider, key and model form.
- The AI returns the IC tree as a bracket string such as `[N|unhappiness [Adj|unhappy 0 1] 2]`;
  the page checks it (two parts per cut, morphemes in order) and builds the tree itself.
- **Cheat sheet** (a tab under the result and a page in the sidebar): morpheme types, word-type formulas, derivational vs inflectional, same-ending table, IC-tree rules and spelling changes.


## Pre-cut lexicon
`lexicon-src/out-*.txt` are the morpheme cuts written by Muse (rules in `tools/MUSE-PROMPT.md`). Rebuild the app's
shards with `node tools/import-lexicon.mjs lexicon lexicon-src/rejected.txt lexicon-src/out-*.txt`.
The importer checks every line and expands roots that are themselves derived words (un- + employment → un- + employ + -ment).
`lexicon.js` looks a word up there before asking the AI and builds regular inflected forms from their lemma.
