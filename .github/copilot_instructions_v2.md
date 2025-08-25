# HLTHY — AI Chat Premium UI Spec (v2)

## Vision
A **futuristic, athletic UI**: dark glass, neon gradients, soft glow accents, subtle motion. Answers render as **rich cards** (not blobs), with clear hierarchy and delightful micro-interactions. Everything stays 60 fps on mid-range devices.

---

## A. Design System (tokens & effects)

**Colors**
- bg: `#0B0B0C`
- surface: `#101114` (card base)
- text: `#EDEDF0`
- subtext: `#A3A6AD`
- accent: `#FF2D55` (brand)
- success: `#3EE68C`
- warn: `#FFB020`

**Gradients**
- `accentSweep`: `['#FF7A00', '#FF2D55', '#9D4EDD']` (45°)
- `auroraBg`: `['#0C0C11', '#0E0D18']` (subtle)
- `successGlow`: `['#11271A', '#0D1E14']`

**Radii & Spacing**
- radius: card `24`, chip `12`
- pad: `12/16/20`, gap: `8/12/16`

**Shadows/Glow (Android-friendly)**
- card: shadowColor `#FF2D55` @ 0.12, radius 16, y-offset 6
- glow edges: 1px gradient border with faint outer glow (drawn via `LinearGradient`)

**Blur**
- Use `expo-blur` (`BlurView` intensity 20–28) *inside* the card header only, not whole screen.

**Motion (Reanimated/Moti)**
- durations: 120–220 ms
- easing: `easeOutCubic`
- entrance: fade-up from 8px
- press: scale to 0.98 then spring back
- shimmer skeletons: 900 ms linear sweep

---

## B. Core Components to Implement

Create these files:

- `components/ai/MessageRenderer.tsx`  
- `components/ai/cards/WorkoutPlanCard.tsx`  
- `components/ai/cards/TechniqueAdviceCard.tsx`  
- `components/ai/cards/SchedulePlanCard.tsx`  
- `components/ai/cards/ExplanationCard.tsx`  
- `components/ai/atoms/{GradientSurface,Tag,Chip,Divider,IconButton,MiniStat,ProgressDots}.tsx`  
- `theme/ai.ts` (tokens above)  
- `utils/aiMessage.ts` (safe parse + type guards)

Use `react-native-linear-gradient`, `expo-blur`, `moti` (or Reanimated), `@expo/vector-icons`, `react-native-svg` (for gauges).

---

## C. Assistant Payload Detection (client)

- If JSON has `dayType` + `segments[]` → `workoutPlan`
- Else if `issue` or `substitutions[]` → `techniqueAdvice`
- Else if `daysPerWeek` + `split[]` → `schedulePlan`
- Else if `topic` + `keyPoints[]` → `explanation`
- Else → `text`

`utils/aiMessage.safeParseAssistant(raw)`:
- strip code fences, try `JSON.parse`
- return `{ type: 'text', text: raw }` on failure

---

## D. Card Blueprints (premium)

### 1) WorkoutPlanCard — “Neon Glass”
**Header**
- Left: **dayType** (e.g., *Legs — Quad Focus*) on **GradientSurface** with accent hairline.
- Right: `IconButton` (⋮) → **Save**, **Start**, **Explain choices**, **Share**.
- Subheader: small **ProgressDots** showing segment count.

**Body**
- **Segment blocks** (collapsible): mini heading on a faint gradient chip.
- **Exercise row** (high polish):
  - Leading: **muscle chip** (if mappable) or equipment icon.
  - Primary: **resolved name** (map from `exerciseId` via your `exercises.ts`).
  - Meta row: `sets × reps` (or `repRange`) • `RPE/%1RM/kg` • `restSec` • optional `notes`.
  - Right: **RPE gauge** (SVG arc, 0–10 with accent sweep).
- **Substitution badge** if any safety swaps occurred (warn color, tap for rationale).

**Footer**
- 1–2 line **summary**.
- **CTA row**: 
  - Primary: **Start** (solid accent, glow border)
  - Secondary: **Save** (outline gradient)
  - Tertiary: **Explain choices**

**Micro-interactions**
- Segment expand: 160 ms fade/height.
- Row press: 0.98 scale + light haptic.
- “Start”: success haptic + quick glow pulse on button.

### 2) TechniqueAdviceCard — “Caution Panel”
**Header**: `issue` with caution icon (yellow accent).
**Unsafe**: chips resolving exerciseIds → names.
**Substitutions**: rows “from → to” with **reason** (one line).
**Cues**: 3–5 bullets with check icons (short, punchy).
**CTA**: **Apply substitutions** → returns a plan patch or triggers regenerate.
**Motion**: stagger list (40 ms/item).

### 3) SchedulePlanCard — “Neon Week Grid”
**Header**: `daysPerWeek` badge.
**Grid**: 7 columns; assigned days filled with gradient **focus** chips (e.g., Push/Pull/Legs).
**Guidelines**: compact bullets (deload rule, spacing).
**CTA**: **Add to Calendar** (optional; for now just “Save Week Plan”).

### 4) ExplanationCard — “Neon Notes”
**Header**: `topic`.
**Body**: 4–6 bullets with subtle checkmarks; each bullet has 1-line max.
**CTA**: **Show examples** (follow-up chat).

---

## E. MessageRenderer Logic

- Try `safeParseAssistant(raw)`.
- `switch(type)` → render the appropriate card.
- Fallback to **PrettyTextBubble** for plain text with a “Format again” action (small prompt calling `/api/chat`).

**PrettyTextBubble polish**
- Glass bubble, soft glow underline.
- “Format again” button (accent outline with gradient border).

---

## F. Data Joins & Actions

- **Resolve names** from `exerciseId` using `exercises.ts` (cache the map).
- **Save**: write a `workouts` doc using the plan JSON; grab a small cover (if any) and feed through `imageUtils.getOptimalImageUrl()`.
- **Start**: navigate to your session builder or `ViewWorkout` hydrated directly from JSON (no model call).
- **Explain choices**: send short follow-up (“Explain the substitutions and volume rationale in ≤5 bullets.”) and render as ExplanationCard.

---

## G. The “Futuristic” Layer (tasteful extras)

- **Ambient stripe**: behind the chat list, a very faint diagonal gradient stripe (5% opacity) that scrolls parallax by 8px.
- **Neon hairline**: 1px animated gradient border on active card headers (60-90 sec slow sweep).
- **RPE Gauge**: small arc with animated sweep to target; stop at value with ease-out.
- **Confetti micro-burst** when a plan references a recent PR (check milestones by `exerciseId`). Keep it subtle.

---

## H. Performance Guardrails

- Thumbnails only in lists via `getOptimalImageUrl()`; originals only in detail screens.
- No heavy Lotties; prefer SVG and Moti for small effects.
- Virtualized list for messages; avoid nested FlatLists.
- Keep animations under 220 ms and avoid layout thrash (translate/opacity > height reflow).

---

## I. Accessibility & Settings

- Contrast ≥ 4.5:1 for body text on surface.
- **Reduce Motion** toggle: disable animated borders & parallax.
- Dynamic Type: scale body font up to 115% without clipping.
- Large touch targets (min 40×40).

---

## J. Acceptance Criteria

- No raw JSON visible to users; all assistant content renders as a card or pretty text bubble.
- WorkoutPlanCard resolves all `exerciseId` → names; RPE gauges render for entries with `@RPE`.
- Save/Start actions work; success haptics and optimistic UI.
- Invalid JSON degrades gracefully; “Format again” works.
- UI matches brand: dark, neon gradients, glass accents, breathable spacing; 60 fps scroll on mid-range device.

---

## K. Copilot Task (paste this)

Implement the AI chat UI per **HLTHY — AI Chat Premium UI Spec (v2)**.  
Create the components in §B, theme tokens in `theme/ai.ts`, and `utils/aiMessage.safeParseAssistant`.  
Render assistant responses via `MessageRenderer`.  
Cards must follow §D visual/interaction rules and actions in §F.  
Add ambient stripe, neon hairline, and RPE gauge from §G with the performance limits in §H.  
Meet all acceptance criteria in §J.
