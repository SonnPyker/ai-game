# Codebase Assessment - ai-game

Date: 2026-06-01

## Executive Summary

`ai-game` is a React 19 + TypeScript + Vite roleplay game with AI-driven world generation, narrative chat, combat, questing, inventory, merchant, save/load, Supabase sync, Gemini, and ComfyUI integrations.

The codebase is functionally rich and currently builds successfully, but it has accumulated several architectural pressure points:

- Large orchestration files concentrate too many responsibilities.
- Game state is spread across React state, singleton services, URL state, and many `localStorage` keys.
- AI prompt construction, parsing, fallback logic, and domain generation are bundled into one very large service.
- TypeScript strict mode is enabled, but many core data paths still use `any`.
- Linting is currently broken because ESLint 9 expects flat config while the repo still uses `.eslintrc.cjs`.

Overall assessment: the app is viable, but a large refactor should be staged around state boundaries and domain modules before cosmetic cleanup. The highest-risk areas are game loop, AI response generation, save/load migration, and combat.

## Repository Snapshot

GitNexus index:

- Repo: `ai-game`
- Files indexed: 171
- Symbols: 6,899
- Relationships: 15,142
- Execution flows: 300
- Indexed at: 2026-06-01 03:35:51Z

Note: during this assessment, several GitNexus deep-query resources were temporarily unavailable because `.gitnexus/lbug` was locked by another process. The high-level context was available, but cluster/process/query details could not be read at that moment. Re-run GitNexus queries after the lock clears before starting any symbol-level refactor.

Tech stack:

- React 19
- TypeScript 5.9
- Vite 7
- Tailwind CSS
- Framer Motion
- React Router 7
- Google Generative AI SDK
- Supabase
- Vercel Analytics/Speed Insights

## Current Verification Status

Production build:

- `npm run build`: passed.
- Output includes large chunks:
  - `game-page`: 287.95 kB raw, 79.15 kB gzip
  - `gemini-service`: 211.44 kB raw, 57.29 kB gzip
  - `CombatPage`: 183.05 kB raw, 43.17 kB gzip
  - `info-menu`: 127.78 kB raw, 31.14 kB gzip

Build warnings:

- Some dynamically imported modules are also statically imported, so Vite cannot split them as intended.
- `worldTimeService` and `merchantService` are examples of modules whose dynamic imports do not create isolated chunks because they are also statically imported elsewhere.
- Browserslist/caniuse data is outdated.

Lint:

- `npm run lint`: failed before checking code.
- Cause: project uses ESLint 9.37.0, but config is still `.eslintrc.cjs`.
- ESLint 9 expects `eslint.config.js|mjs|cjs` unless migrated or run through compatibility setup.

Git status at assessment time:

- Modified: `package-lock.json`
- Untracked: `.claude/`, `AGENTS.md`, `CLAUDE.md`

These look like user/environment changes and were not modified by this assessment.

## Architecture Overview

The app is organized around route-level pages, UI components, singleton services, hooks, and shared types:

- `src/pages`: route-level orchestration
- `src/components`: UI and feature components
- `src/services`: game systems, AI integration, persistence, combat, NPCs, quests, merchants, inventory
- `src/hooks`: feature hooks such as quest and responsive behavior
- `src/types`: broad shared domain types
- `src/lib/context.ts`: AI/game context construction

Primary flows inferred from code and README:

- World creation: `WorldBuilder` -> `geminiService` -> local storage/world state
- Character creation: `CharacterCreationPage` -> AI analysis/stat suggestion -> current character storage
- Game loop: `GamePage` -> Gemini turn response -> SCC/context updates -> quest/NPC/location/inventory side effects
- Combat: `GamePage` or quest/NPC triggers -> `CombatPage` -> `combatService` -> results back to game state/local storage
- Persistence: localStorage legacy keys plus save slots via `saveStorage` services and optional Supabase sync
- Image generation: `comfyUIService`, `imageStorageService`, prompt extraction, UI trigger components

## Largest Files And Hotspots

Largest source files by line count:

- `src/pages/GamePage.tsx`: 4,946 lines
- `src/services/geminiService.ts`: 4,621+ lines
- `src/services/npcRelationshipService.ts`: 3,026+ lines
- `src/services/combatService.ts`: 2,192+ lines
- `src/pages/CombatPage.tsx`: 1,853 lines
- `src/components/InfoMenu/InfoMenu.tsx`: 1,592 lines
- `src/components/WorldBuilder/WorldBuilder.tsx`: 1,224 lines
- `src/services/npcArousalService.ts`: 1,219 lines
- `src/types/index.ts`: 1,074 lines
- `src/hooks/useQuestSystem.ts`: 1,042 lines

Key coupling indicators:

- `GamePage.tsx` has 41 imports, 35 `useState` calls, and 21 `useEffect` calls.
- `CombatPage.tsx` has 14 `useState` calls and 46 direct `localStorage` references.
- Project-wide `localStorage` matches: 485.
- Project-wide `any` matches: 558.
- Project-wide `console.log`/`console.error` matches: 277.

The issue is not just file length. The larger concern is that orchestration, persistence, side effects, UI state, domain rules, and integration logic often live in the same files.

## Main Risks

### 1. GamePage Is The Central Bottleneck

`GamePage.tsx` appears to coordinate chat history, AI calls, save/load, NPC relationship analysis, action suggestions, travel, combat handoff, random combat, merchant shop handling, image generation, quest offers, SCC summaries, content flags, and UI modal state.

Risk:

- Small changes can trigger regressions across unrelated systems.
- Testing behavior in isolation is difficult.
- UI rendering and domain orchestration are tightly coupled.
- React effects can accidentally race with localStorage changes and async service calls.

Refactor priority: highest.

### 2. GeminiService Has Too Many Responsibilities

`geminiService.ts` handles API key management, model selection, content guidance, prompt construction, JSON parsing, world generation, character analysis, scenario generation, turn streaming, enemy generation, merchant data generation, fallback generation, and error handling.

Risk:

- Prompt behavior and infrastructure behavior are coupled.
- Testing individual prompt builders is hard.
- Changing one generation path can affect unrelated AI flows.
- The service chunk is large and central to runtime performance.

Refactor priority: highest.

### 3. Persistence Is Fragmented

There is a newer save-storage abstraction, but many features still read/write raw `localStorage` keys directly.

Examples:

- `GamePage.tsx`: 144 `localStorage` matches
- `CombatPage.tsx`: 46
- `SaveLoadPage.tsx`: 28
- `InitPage.tsx`: 25
- `sccService.ts`: 23
- `npcRelationshipService.ts`: 23

Risk:

- Schema drift between save slots and legacy keys.
- Hard-to-debug stale state.
- Migration and sync logic can miss data owned by feature code.
- Unit testing is difficult without browser storage.

Refactor priority: very high.

### 4. Singleton Services Hold Hidden Mutable State

Most game systems are exported as singleton instances. This is pragmatic, but over time it creates hidden dependencies between pages, tests, storage, and runtime order.

Risk:

- State can leak across flows.
- Service initialization order matters.
- It is hard to run deterministic tests.
- Combat, inventory, NPC, merchant, and location systems can disagree about the current character/world unless a central state boundary exists.

Refactor priority: high.

### 5. Type Safety Is Weaker Than tsconfig Suggests

`strict: true` is enabled, which is good. However, there are 558 `any` matches, including core save data, AI response parsing, quest conversion, service adapter state, and UI event paths.

Risk:

- Runtime shape mismatches are likely in AI-generated JSON, saved games, and migrated data.
- Refactors have less compiler protection than expected.
- Save compatibility bugs may compile cleanly.

Refactor priority: high, but should be staged after boundaries are clearer.

### 6. Lint Pipeline Is Not Operational

The repo depends on ESLint 9 but uses legacy config.

Risk:

- Code quality checks are currently not enforceable.
- Refactor PRs cannot rely on lint as a safety net.
- Existing rules such as `no-explicit-any` warnings are not being surfaced.

Refactor priority: immediate infrastructure fix.

### 7. Bundle Splitting Is Partially Undermined

The app already uses lazy routes and manual chunks, which is good. But Vite warns that some dynamic imports are also statically imported, preventing the desired chunk split.

Risk:

- Large features still enter earlier chunks than intended.
- Manual chunks can become misleading if import boundaries are not consistent.
- Refactor should avoid adding more mixed static/dynamic import patterns.

Refactor priority: medium.

## Positive Signals

- Production build passes under TypeScript.
- The codebase already has domain-oriented service names, so extraction paths are visible.
- Route-level lazy loading is already in place.
- Save storage has an adapter/factory direction, which can become the single persistence boundary.
- GitNexus has a fresh high-level index with 300 execution flows available once the DB lock clears.
- `tsconfig` uses strict mode and no-unused checks.
- Feature folders exist for larger UI areas such as combat, save manager, info menu, quest tracker, shop, settings, help chat, and world builder.

## Recommended Refactor Strategy

### Phase 0: Restore Tooling Safety

Goal: make the repo measurable before changing behavior.

Recommended work:

- Migrate `.eslintrc.cjs` to ESLint 9 flat config or pin ESLint 8.
- Add a `typecheck` script separate from `build`.
- Add a small smoke-test strategy for core flows.
- Re-run GitNexus after the file lock clears.
- Use GitNexus impact analysis before each symbol edit.

Exit criteria:

- `npm run build` passes.
- `npm run lint` runs successfully.
- Refactor branches can be checked automatically.

### Phase 1: Define State And Persistence Boundaries

Goal: stop direct feature code from owning raw storage keys.

Recommended work:

- Introduce a typed `GameSessionRepository` or similar boundary around current world, character, chat, SCC state, turn counter, content flags, player location, combat handoff, merchant shops, and generated images.
- Move localStorage key names into one module.
- Add parse/validate helpers for saved/migrated data.
- Replace direct `localStorage` reads/writes gradually, starting with `GamePage` and `CombatPage`.

Exit criteria:

- New feature code does not call `localStorage` directly.
- Combat handoff and game continuation use typed APIs.
- Save migration has one canonical schema path.

### Phase 2: Split GamePage Into Feature Controllers And Hooks

Goal: make the main page mostly composition and rendering.

Candidate extractions:

- `useGameInitialization`
- `useChatTurnController`
- `useActionSuggestionsController`
- `useCombatHandoff`
- `useMerchantController`
- `useNPCInteractionController`
- `useImageGenerationController`
- `useSaveGameController`

The first extraction should target a self-contained concern with clear state ownership, such as merchant/shop handling or image generation, before touching the core AI turn loop.

Exit criteria:

- `GamePage.tsx` drops substantially in size.
- Feature hooks expose explicit inputs/outputs.
- AI turn flow remains behaviorally unchanged.

### Phase 3: Split GeminiService By Capability

Goal: separate AI infrastructure from domain prompts.

Candidate modules:

- `aiClient` or `geminiClient`: model initialization, API key usage, raw generation
- `apiKeyManager`: key rotation/testing/statistics
- `promptBuilders/worldPromptBuilder`
- `promptBuilders/characterPromptBuilder`
- `promptBuilders/turnPromptBuilder`
- `aiResponseParsers`
- `enemyGenerationAI`
- `merchantGenerationAI`

Do not start by rewriting prompts. First move pure string builders and parsers behind equivalent functions.

Exit criteria:

- API key handling is independent from prompt content.
- Prompt builders are testable as pure functions.
- Generation methods become smaller orchestration wrappers.

### Phase 4: Stabilize Combat Domain

Goal: isolate combat rules from UI and persistence.

Recommended work:

- Split `combatService` into combat state machine/rules, reward calculation, animation events, persistence adapter, and AI enemy turn handling.
- Make combat result data the only contract back to the main game loop.
- Remove direct `localStorage` reads from `CombatPage` through a handoff repository.

Exit criteria:

- Combat page renders state and dispatches actions.
- Combat domain can be tested without React.
- Combat restore/save paths are typed.

### Phase 5: Type Hardening

Goal: reduce runtime shape bugs in AI/save boundaries.

Recommended work:

- Replace `any` in save schema first.
- Add narrow types for AI JSON response contracts.
- Add safe parser functions for AI outputs and localStorage.
- Introduce runtime validation where external/untrusted data enters the app.

Exit criteria:

- Core save/load and AI parsing paths are typed.
- `any` count decreases in high-risk files first, not necessarily globally.

## Suggested Refactor Order

1. Fix ESLint config.
2. Add explicit `typecheck` script.
3. Re-run GitNexus and verify no stale/locked index.
4. Create storage key constants and repository wrapper.
5. Move `GamePage` direct storage access behind repository methods.
6. Extract one low-risk `GamePage` controller hook.
7. Split Gemini API-key/client logic from prompt builders.
8. Extract turn prompt builder and parser modules.
9. Refactor combat handoff and result contract.
10. Reduce `any` at save/AI boundaries.

## High-Risk Areas To Avoid Touching First

Avoid starting the large refactor with:

- `generateTurnResponseWithDeltaStreaming`
- save migration internals
- combat reward/end-of-combat logic
- quest completion side effects
- NPC relationship/arousal systems

These should be changed only after boundaries and smoke checks are in place.

## Recommended GitNexus Usage For The Refactor

Before editing any function/class/method:

- Run upstream impact analysis for the target symbol.
- If impact is HIGH or CRITICAL, pause and review direct callers/processes before editing.
- After each staged refactor, run `gitnexus_detect_changes()` to confirm affected flows match expectations.

Because GitNexus was temporarily locked during this assessment, the first next step should be to re-run the relevant GitNexus queries once the lock clears:

- Query architecture/game loop flows.
- Query save/load flows.
- Query combat flows.
- Query Gemini/AI generation flows.
- Use context on the exact symbols selected for extraction.

## Bottom Line

The project is a feature-heavy prototype/product codebase that has reached the point where behavior still builds, but change safety is declining. The best refactor is not a broad rewrite. It should be a staged extraction of boundaries:

1. Tooling safety.
2. Persistence boundary.
3. GamePage decomposition.
4. GeminiService decomposition.
5. Combat/domain hardening.
6. Type hardening around external data.

This order gives the next refactor the best chance of reducing risk instead of just moving complexity into new files.
