# Morphology — IC analysis lab

Practise Immediate Constituent (IC) analysis of English words: morpheme cards, binary IC tree,
classification, allomorphy, derivation vs. inflection, word family. English only.

## How it works
- **11 verified words** (`data.js`) work offline.
- **Dictionary** (`dict.js`): reads the static data of https://l2practice.github.io/dictionary/ for
  spelling checks and "did you mean", inflection → lemma, part of speech, definition, CEFR, etymology and
  search autocomplete. The entry is shown immediately while the AI works.
- **AI** (`ai.js`): each student pastes their own API key in *Settings* for any of Gemini, Grok (xAI), OpenAI,
  Claude or OpenRouter. The key is stored in that browser's `localStorage` and sent only to the chosen provider.
  *Load my models* lists the model ids the key can use; if a Gemini model is unavailable the app picks one
  automatically. The answer is streamed (morpheme cards appear as they arrive). When a provider is busy,
  a "Try with …" button switches to another provider that has a saved key. Results are cached on the device,
  so repeated words are instant and free.
- No server, no shared key, no logging. Host it as static files (GitHub Pages).

## Files
`index.html`, `style.css`, `app.js` (UI), `dict.js`, `ai.js`, `tree.js`, `bricks.js`, `data.js`,
`logo.svg` (full logo with text), `logo-mark.svg` / `favicon.svg` (no text).

## Run locally
`python3 -m http.server 8000` then open http://localhost:8000
