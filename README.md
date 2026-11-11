# Reservation Assistant

An operations dashboard for a small group of short-stay rental properties. It answers guest messages, turns repair reports into assigned maintenance tasks, runs cleaning turnovers with photo-verified checklists, and keeps a log of everything it did.

It runs with no setup. Add a Gemini API key and the replies come from a live model instead of the built-in rules.

## What it does

- **Guest messages.** Each new message gets one of three outcomes: a reply, a maintenance task, or an escalation to staff. Common questions (check-in, Wi-Fi, amenities, cancellation, early check-in) get the house wording. Local questions use Google Search and cite their sources.
- **Maintenance dispatch.** A repair is assigned by trade first, then by who is based near the property, then by who has the least open work. People who are equally free take turns.
- **Scheduled messages.** Pre-arrival, mid-stay, and pre-departure messages go out once per booking, on time.
- **Cleaning turnovers.** A turnover is scheduled when a stay ends. Items marked photo-required cannot be ticked without a photo, and a turnover cannot be completed until its checklist is.
- **Crew tools.** Time clock, notes for the crew, and incident reports.
- **Reviews.** Record a guest's review against a finished stay.

## What is real and what is simulated

| Piece                               | Status                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Model replies                       | Real when `GEMINI_API_KEY` is set. Otherwise a rule-based responder answers and the header says "Demo responder". |
| Guest inbox                         | Simulated. "Check for new messages" delivers the next of eight scripted messages.                                 |
| Staff channel and management alerts | Simulated. Nothing is posted or emailed. Both panels are labelled.                                                |
| Bookings, staff, properties         | Sample data in `src/data`, placed relative to the current time.                                                   |
| Storage                             | In memory. A reload resets everything.                                                                            |

There is no sign-in. This is a single-operator tool, so put it behind your own access control before exposing it to the internet. See [Security](#security).

## Quick start

Requires Node 22.22 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:3000. The four waiting messages are answered within a few seconds.

## Connecting Gemini

```sh
cp .env.example .env.local
```

Set `GEMINI_API_KEY` in `.env.local` ([get a key](https://aistudio.google.com/apikey)) and restart `npm run dev`. The header badge changes to "Live model".

| Variable         | Required | Default            | Purpose                                                              |
| ---------------- | -------- | ------------------ | -------------------------------------------------------------------- |
| `GEMINI_API_KEY` | No       | none               | Enables live replies. Without it the app runs on the demo responder. |
| `GEMINI_MODEL`   | No       | `gemini-3.8-flash` | Model that writes replies.                                           |

Both are read on the server only.

When a live model call fails, the message is marked **Failed** with the reason and a **Try again** button. It never falls back to a scripted answer silently. Scheduled messages are the exception: a check-in reminder still has to go out, so those fall back to fixed wording and the activity log says so.

## How the key stays private

The browser never sees the API key and never talks to Google.

```
Browser ──POST /api/assistant──▶ Server route ──▶ Gemini API
        { guest message,          builds the prompt,
          booking dates }         holds GEMINI_API_KEY
```

The browser sends structured data (guest name, message, stay dates). The server validates it, builds the prompt itself, and returns a typed result. A caller cannot send an arbitrary prompt through this route.

The same handler (`server/handler.ts`) runs in two places:

- **Local:** a Vite plugin serves `/api/assistant` in `npm run dev` and `npm run preview`.
- **Production:** `api/assistant.ts` is a Vercel Function.

## Scripts

| Command                 | What it does                                                 |
| ----------------------- | ------------------------------------------------------------ |
| `npm run dev`           | Dev server with hot reload and the assistant route.          |
| `npm run build`         | Type-check, then build to `dist/`.                           |
| `npm run preview`       | Serve the production build with production security headers. |
| `npm test`              | Run the test suite once.                                     |
| `npm run test:watch`    | Run tests on change.                                         |
| `npm run test:coverage` | Tests with a coverage report.                                |
| `npm run lint`          | oxlint, including type-aware rules.                          |
| `npm run format`        | Format with Prettier.                                        |
| `npm run check`         | Everything CI runs: lint, format check, tests, build.        |

## Project layout

```
api/            Vercel Function entry point (a thin wrapper)
server/         Assistant route: validation, prompts, Gemini call, rate limiting
shared/         Code used by both browser and server: API contract, topic
                classifier, reply parser, house answers
src/
  data/         Sample properties, staff, bookings, and messages
  domain/       Pure business rules: assignment, scheduling, cleaning
  state/        Reducer, actions, and selectors for all dashboard state
  services/     Assistant client and the demo responder
  hooks/        useDashboard wires state to the background jobs
  components/   UI, grouped by workspace
```

State changes go through one pure reducer (`src/state/reducer.ts`). Actions carry their own timestamps and ids come from a counter in state, so the reducer never reads the clock and every transition can be tested directly.

## Deploying

**Vercel.** Import the repository. The Vite preset builds the site, `api/assistant.ts` becomes a function, and `vercel.json` sets the security headers. Add `GEMINI_API_KEY` under Project Settings → Environment Variables for live replies.

**Any static host.** Serve `dist/`. With no `/api/assistant` route the app detects that and runs on the demo responder.

**Your own server.** `createAssistantHandler` in `server/handler.ts` takes a Fetch `Request` and returns a `Response`. Mount it at `/api/assistant` in any runtime that speaks the Fetch API.

## Security

What is in place:

- The API key lives in server environment variables. Nothing secret is in the client bundle.
- Request bodies are validated and size-capped before anything reaches the model.
- Guest text is treated as untrusted. It is fenced inside the prompt and cannot close its own fence.
- Source links returned by the model are dropped unless they are plain `http` or `https`.
- The route rejects cross-site requests and is rate-limited per client and overall.
- Upstream errors are logged on the server and never returned to the browser.
- A Content Security Policy allows this origin only. No third-party scripts, styles, or fonts load at runtime.

Known limits, stated plainly:

- **No authentication.** Anyone who can reach the URL can use the dashboard and the assistant route. The origin check stops other websites from using your quota through a visitor's browser. It does not stop a script. Use your host's access control (for example Vercel Deployment Protection) for anything beyond a demo.
- **Rate limits are per server instance.** They are held in memory. On a platform that runs several instances the effective limit is higher. Add your platform's firewall rule or a shared store if you need a hard cap.
- **No persistence.** State lives in the browser tab.

## Testing

```sh
npm test
```

The suite covers the business rules, every reducer transition, the server route (including its refusals), and the full app rendered in a simulated browser. `src/theme.test.ts` checks every text and background colour pairing against WCAG AA in both themes, so a palette change that hurts readability fails the build.

## Design

Colours follow a 60:30:10 split on the Collective AI palette: canvas, surfaces, and parent gold (`#D4A843`) as the single accent. Gold marks the primary action and the current selection and is never used as a status colour. All colours are tokens in `src/index.css`. The default Tailwind palette is removed, so a component cannot reach for an off-palette colour. Light and dark follow the system setting.

## Tooling notes

- TypeScript 7 in strict mode, with `noUncheckedIndexedAccess`.
- oxlint with type-aware rules. Two rules are off on purpose: `jsx-a11y/prefer-tag-over-role` (it rejects the W3C patterns for status messages and scrollable regions) and `typescript/consistent-return` (the compiler's `noImplicitReturns` already covers it and understands exhaustive switches).
- Server and shared code use `.js` extensions on relative imports so the same files run unbundled under Node's ES module loader.
