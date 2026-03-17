# AI Chat

hlthy includes an AI fitness coach accessible from the **AI** tab. The coach is context-aware — it knows the user's archetype, recent workouts, and personal records.

---

## User Experience

- Each conversation is a persistent chat thread
- The AI responds in natural language and can also return structured cards (workout plans, exercise explanations, etc.)
- Users can share posts, milestones, and workouts into the chat for the AI to analyze
- Users can also share photos from their camera roll

---

## Key Files

| File | Purpose |
|------|---------|
| `app/chat/[id].tsx` | Chat UI — message list, input, shared content rendering |
| `ai/ai_chat.ts` | API client — sends messages to the backend AI service |
| `components/ai/MessageRenderer.tsx` | Renders AI responses (text or structured cards) |
| `components/ai/cards/` | Individual card components (WorkoutPlanCard, ExplanationCard, etc.) |
| `components/SmartChatInput.tsx` | Input bar with intent detection and attachment support |

---

## Sending a Message

```typescript
// ai/ai_chat.ts
const response = await sendMessage(conversationId, userMessage, options);
```

The backend receives the conversation history, user context, and optional `workoutPreferences`. It returns either a plain text response or a structured JSON response that gets rendered as a card.

### Context Passed to the AI

```typescript
interface SendMessageOptions {
  workoutPreferences?: {
    includeWarmup: boolean;
    includeCooldown: boolean;
    includeCardio: boolean;
  };
  editingWorkout?: any;    // If the user is editing an existing workout
  workoutHistory?: {
    recent_workouts: any[];
    exercise_history: any[];
    weekly_stats: any;
  };
}
```

---

## Response Types

The AI can return different response shapes. `MessageRenderer` inspects the response type and picks the right component:

| Response type | Component | What it shows |
|--------------|-----------|--------------|
| `text` | Inline text | Plain conversational reply |
| `workout_plan` | `WorkoutPlanCard` | Structured workout with segments and exercises |
| `workout_confirmation` | — | Confirmation that a workout has been logged |
| `technique_advice` | `TechniqueAdviceCard` | Exercise form tips |
| `schedule_plan` | `SchedulePlanCard` | Weekly training schedule |
| `explanation` | `ExplanationCard` | Concept explanation with examples |

---

## Shared Content

Users can attach content to a message:

| Content type | How | What gets sent |
|-------------|-----|---------------|
| Post | Share button on any post | `sharedPost: { postId, imageUrl, caption }` |
| Milestone | Share button on milestone | Milestone details |
| Workout | Share button on workout | Workout title and segments |
| Photo | Camera roll picker in chat | `sharedPhoto: { url, thumbnailUrl }` |

Shared content appears as a preview card above the user's message in the chat UI.

---

## Conversation Storage

Messages are stored in Firestore:

```
conversations/{conversationId}/messages/{messageId}
  senderId
  text
  createdAt
  isAiResponse
  sharedPost?    { postId, imageUrl, thumbnailUrl, caption }
  sharedPhoto?   { url, thumbnailUrl }
```

A real-time Firestore listener keeps the message list updated as the AI responds.

---

## AI Conversation vs DM Conversation

The `chat/[id].tsx` route handles both AI conversations and human DMs. The conversation ID determines which type it is. AI conversations have a special `isPinnedAI: true` flag in the DMs list and are shown first.
