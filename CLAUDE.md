# CLAUDE.md

Guidance for working in this repo. The project is an adult, AI-driven text **地下城探险模拟器** (dungeon adventure simulator): a single-player browser RPG where an LLM "地下城主" (DM) streams the story, action options, and scene art prompts; the player has stats that evolve from the narrative.

## Stack & running

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** · **Tailwind v4** · Radix UI · `pnpm`.
- **Requires Node ≥ 20.9** (Next 16). The dev box here has Node 18, so the app is run in Docker:
  ```bash
  docker run --rm --name dungeon-dev --network host -w /app -v "$PWD":/app \
    node:20-bookworm-slim sh -c "corepack enable && corepack prepare pnpm@9 --activate && \
    pnpm install && pnpm exec next dev -H 0.0.0.0 -p 3000"
  ```
  - Use `--network host`: the Docker **bridge network can't reach `fonts.gstatic.com`**, so `next/font/google` 500s the page once the `.next` font cache is cleared. Host network works.
  - `pnpm install` must run **inside** the container — the host install misses the glibc `@tailwindcss/oxide` native binary.
  - `next dev` hot-reloads client, `lib/*`, and route handlers — **most changes need no restart**. Only `.env`, `next.config.mjs`, or new deps require a restart. Don't `rm -rf .next` (loses font cache → font 500s).
- Verify without a full build (Node 18 can't `next build`): `node_modules/.bin/tsc --noEmit`. ESLint isn't installed despite the `lint` script.

## Architecture

- `app/page.tsx` — top level: `CharacterCreator` → `GameScreen`. Character lives in localStorage.
- `app/api/chat/route.ts` — edge proxy to the chat LLM. Picks provider from the model id: **Grok** (xAI) if the model is in `CHAT_MODELS` with `provider:'grok'`, else the **DZMM/gpt4novel** `ext/v1` endpoint. Streams SSE straight through. API keys come from the request body (client) or env fallback.
- `app/api/models/route.ts` — proxies DZMM `ext/v2/models` so the settings panel shows the **live** chat-model list.
- `app/api/image/*` — PixAI (`/generate` + `/task/[taskId]`) and TensorArt (`/tensorart` + `/tensorart/[jobId]`) generate-then-poll flows.
- `components/` — `game-screen` (layout), `chat-panel` (the core loop), `image-panel`, `settings-panel`, `character-creator`, `character-card`, `trap-generator`, `status-picker`.
- `lib/types.ts` — all shared types **and** data constants (`CHAT_MODELS`, `IMAGE_STYLES`, `IMAGE_TAG_PRESETS`, `IMAGE_MODELS`, `TENSORART_MODELS`, `CHARACTER_PRESETS`, `PRESET_TRAPS`, `PRESET_STATUS_EFFECTS`).
- `lib/prompts.ts` — **all** prompt text (system DM prompt, summary, trap generator, image tag helpers). Edit prompts here, not inline.
- `lib/storage.ts` — localStorage I/O + export/import. Keys: `dungeon_settings`, `dungeon_character`, `dungeon_session`. `getSettings()` sanitizes stale enum values against the current constants.
- `lib/sse.ts` — `streamChatDeltas(response, onDelta)`: the single SSE parser. Buffers across network chunks (a `data:` line can split mid-flight). Use it everywhere; never hand-roll `reader.read()` + `split('\n')`.

## The DM marker protocol (critical, fragile)

Every DM reply ends with structured markers after the prose, parsed in `chat-panel.tsx`:

- `[OPTIONS]` … (`[/OPTIONS]`) — exactly 4 action choices → the button grid.
- `[SCENE: danbooru tags]` — image prompt → `onRequestImage`.
- `[STATS:{...}]` — core numeric state (hp/pleasure/desire/floor/encounter/measurements/bodyDevelopment/statusEffects).
- `[DESC:{...}]` — longer per-body-part descriptions (separate so a truncated DESC can't break STATS).

**The model violates this format constantly. Parsing must stay defensive — these are real bugs we hit, keep them handled:**

1. **Full-width punctuation.** Models emit JSON with `：，｛｝` instead of `:,{}`, and `[STATS：`/`[SCENE：`. `parseJsonLenient` runs `normalizeJsonPunctuation`, which converts full-width → ASCII **only outside string values** (so commas inside Chinese narrative text are preserved). Marker regexes accept `[:：]`.
2. **Truncation.** A long scene + big STATS/DESC tail overflows `max_tokens` and cuts the JSON mid-object. `parseJsonLenient` repairs it (close open string, drop dangling key/comma, balance brackets). `CHAT_MAX_TOKENS` is 4096 to reduce this.
3. **Missing `[/OPTIONS]` and bullet styles.** `parseOptions` reads up to the close tag **or the next marker or end**, and accepts `1.` / `-` / `•`.
4. **Display hiding.** `cleanContent` shows only the text **before the first marker** — robust to missing close tags and full/half-width colons at once.
5. On unparseable STATS, log with `console.warn` (not `console.error` — that triggers the Next dev error overlay) and show the soft inline `statsError` banner.

When changing the protocol, update **both** `lib/prompts.ts` (what's requested) and the `chat-panel.tsx` parsers (what's tolerated), and test against real model output, including full-width-punctuation samples.

## Other conventions

- **Persistence:** chat history + rolling summary persist after each completed turn (not mid-stream); character stat updates write back on every change. Reset clears character + session.
- **Summary:** every `SUMMARY_THRESHOLD` assistant turns, older messages are summarized and dropped. Guarded by `summarisingRef` against re-entry; removes exactly the summarized count so concurrent user messages aren't lost.
- **Image prompt order** (`image-panel.tsx`): `character.danbooruTags`, scene, `IMAGE_TAG_PRESETS[...]`, `IMAGE_STYLES[...]`, custom tags. `danbooruTags` are the character's fixed appearance, kept for cross-image consistency.
- Adding an image style / tag preset / model: add to the constant in `lib/types.ts`; `storage.ts` sanitization picks it up via `Object.keys`. Add a default to `getDefaultSettings()` and a sanitization line for any **new `AppSettings` field**.
- **Secrets:** `.env` is gitignored (`.env*`, keep `.env.example`). Never stage `.env`. Keys: `CHAT_API_KEY`, `GROK_API_KEY`, `PIXAI_API_KEY`, `TENSORART_API_KEY`.
- **Security:** the `/api/*` routes have no auth/rate limiting — this is a single-user self-host app. Don't expose it publicly without adding access control.
- Content is adult fiction by design. Match the existing tone/structure when editing presets or prompts.
