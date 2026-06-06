# Dolphine — Handoff Tasks (for parallel agent)

These tasks are **independent** of the in-progress "value surface" build (1000 listings, bias panel, comparison table, weights, life sim, real images). Each is self-contained with a clear spec and verification. Pick any; they don't conflict with the files being actively edited (`algorithm/src/main.py`, `algorithm/src/schemas.py`, `algorithm/data/*.json`, `backend/server.js`, `frontend/src/App.tsx`, `frontend/src/dolphine/*`).

---

## API CONTRACT (reference)

`POST /api/chat` request:
```json
{ "sessionId": "uuid", "message": "NL text", "profile": {...}, "listingMode": "demo|text|urls", "listingInputs": ["..."] }
```
`POST /api/chat` response:
```json
{
  "sessionId": "uuid",
  "rooms": [ /* RoomListing[] with image */ ],
  "insights": {
    "biasWarnings": [{ "type","severity","title","message","icon" }],
    "weights": { "commute","budget","gym","food","quietness" },
    "tradeoffs": { "winnerName","runnerUpName","verdict","confidence","gains","losses","annualCommuteHoursSaved","trueCostDifference","rentDifference" },
    "neighbourhoodComparison": [{ "id","name","score","commuteMinutes","annualCommuteHours","annualTransportCost","rent","trueMonthlyCost","dimensionScores" }],
    "lifeSimulation": { "narrative","departureTime","gymDays","annualHoursSaved","winnerTimeline","runnerUpTimeline" }
  }
}
```

Servers: Algorithm `:8000`, Backend `:4000`, Frontend `:3000` (Vite proxies `/api` → 4000).

---

## TASK 1 — Real landlord message generation (LLM)

**Why:** The "Generate Landlord Message" modal currently shows static text. Make it generate a real, personalized WhatsApp-style enquiry message via OpenAI.

**Where:** New backend route `POST /api/landlord-message` in `backend/server.js`; frontend `LandlordMessageModal` in `App.tsx`.

**Spec:**
- Request: `{ room: RoomListing, profile: Profile }`.
- Backend calls `OPENAI_MODEL` (default `gpt-5.5`): system = "You write concise, polite Singapore rental enquiry messages to landlords/agents." User prompt includes room title, area, rent, the user's must-haves and the room's `missingFields` (ask about those), and 2–3 specific questions. Return `{ message: string }`.
- Frontend: modal "Generate" button calls the route, shows a loading state, renders the returned message with a "Copy" button (`navigator.clipboard.writeText`).

**Verify:**
```bash
curl -s -X POST http://127.0.0.1:4000/api/landlord-message -H "Content-Type: application/json" \
  -d '{"room":{"title":"Queenstown Common Room","area":"Queenstown","rent":1150,"missingFields":["Aircon servicing terms","Visitor policy"]},"profile":{"budgetMax":1500,"mustHaves":["Aircon","Cooking allowed"]}}'
# Expect JSON { "message": "..." } that mentions the missing fields as questions.
```

---

## TASK 2 — Dynamic landlord questions from missing fields

**Why:** `LandlordQuestions` in `App.tsx` is hardcoded to 8 generic questions. Generate them from the selected room's `missingFields` + `hiddenRisks`.

**Where:** `LandlordQuestions` component in `App.tsx`.

**Spec:**
- Accept `room: RoomListing`. Build a question list: for each `missingFields` entry produce a natural question (e.g. "Visitor policy" → "What is the visitor / overnight-guest policy?"); append questions derived from `hiddenRisks`. Fall back to 2–3 sensible defaults if empty. Render as a numbered list with a "Copy all" button.

**Verify:** Select different rooms in the results UI → the questions change to match each room's missing fields. `npx tsc --noEmit` clean.

---

## TASK 3 — Shareable report export

**Why:** Let users export/share the recommendation.

**Where:** New frontend util + a button in `DolphineReport`.

**Spec (pick the simpler that fits time):**
- **Option A (print/PDF):** "Export PDF" button → `window.print()` with a print stylesheet (`@media print`) that hides nav/inputs and lays out winner + comparison + bias warnings cleanly.
- **Option B (shareable link):** Encode the current result into a URL hash (base64 of `{rooms, insights}`), and on load, if a hash is present, hydrate state and show results directly (read-only).

**Verify:** Option A — print preview shows a clean one/two-page report. Option B — copying the link and opening in a new tab reproduces the same results.

---

## TASK 4 — Loading steps reflect real backend progress

**Why:** The 7 loading steps in `LoadingSteps` are a fixed 210ms timer animation, decoupled from the real request.

**Where:** `analyzeRooms()` + `LoadingSteps` in `App.tsx`.

**Spec:** Drive `loadingStep` from real milestones: 0 on submit, advance as the fetch progresses (e.g. step 1 "解析偏好" right after POST starts, then on response received jump to the final steps), and clamp to the last step when `insights` arrive. Keep it feeling fast but truthful. No fake long delays.

**Verify:** With backend up, steps advance and settle when results render; with backend down (stop `:4000`), it fails gracefully to demo rooms without hanging on a fake timer.

---

## TASK 5 — Multi-person / roommate mode

**Why:** `profile.peopleCount` is collected but unused.

**Where:** `serializeProfileToNL` (both `backend/server.js` and `App.tsx`) + a small note in results.

**Spec:** When `peopleCount > 1`, append to the NL message: "We are {n} people looking to share, so prioritise whole-unit or multi-room listings and per-person cost." In results, when peopleCount > 1, show per-person rent (`rent / peopleCount`) on the winner card.

**Verify:** Set peopleCount=2 in the form → NL string includes the sharing clause (log it) → winner card shows per-person rent.

---

## TASK 6 — Empty/error states & resiliency

**Why:** If the algorithm returns a fallback (no rooms) or the backend errors, the UI should explain, not silently show demo rooms.

**Where:** `analyzeRooms`/`handleChatRefinement` + a small `ResultsNotice` banner in `App.tsx`.

**Spec:** If `data.rooms` is empty but `data.insights` exists (fallback case), show a banner: "在你的预算/条件下暂无匹配房源" plus the algorithm's `fallback_message` (surface it through the backend response — add `fallbackMessage` to `/api/chat` response from `result.fallback_message`). If the fetch throws, show "AI 服务暂时不可用，显示示例数据" instead of pretending.

**Verify:** Stop the algorithm (`:8000`) and submit → banner appears, no silent demo swap. Submit an impossible budget (e.g. S$300) → fallback banner with suggested budget.

---

## Guardrails for whoever picks these up
- **Never** put the OpenAI key in code — it lives in `/.env` (`OPENAI_API_KEY=...`), already gitignored.
- Run `node --check backend/server.js` and `cd frontend && npx tsc --noEmit` before declaring done.
- Don't edit `frontend/src/dolphine/*`, `backend/server.js`'s `buildInsights`/`mapRecommendResultToRoomListings`, or `algorithm/src/main.py`'s comparison block while the value-surface build is in flight — coordinate or wait.
