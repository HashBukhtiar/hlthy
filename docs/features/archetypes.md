# Archetypes

An archetype is a fitness persona that users choose during signup. It personalizes their experience across the entire app.

---

## The Five Archetypes

| Archetype | Description | Icon |
|-----------|-------------|------|
| `athlete` | All-around competitive athlete | `assets/images/athlete.png` |
| `bodybuilder` | Focused on hypertrophy and physique | `assets/images/bodybuilder.png` |
| `crossfitter` | High-intensity functional training | `assets/images/crossfitter.png` |
| `generalist` | Recreational fitness without a specific focus | `assets/images/generalist.png` |
| `powerlifter` | Strength sport: squat, bench, deadlift | `assets/images/powerlifter.png` |

---

## Where Archetypes Are Used

### Profile

The archetype badge appears on every profile, below the profile photo. It shows the archetype icon and name.

### Explore Feed

The post grid in Explore prioritizes posts from users with the same archetype as the viewer. This is implemented via:

```
where('authorArchetype', '==', userProfile.archetype)
```

The popular posts query then fills in the rest with posts from other archetypes.

### AI Coach

The archetype is passed to the AI backend with every message. The AI uses it to tailor:
- Exercise recommendations (a powerlifter gets different advice than a crossfitter)
- Workout plan structure
- Coaching tone and terminology

### Analytics & Insights

The `archetype` field on each post (`authorArchetype`) is denormalized from the user's profile at post-creation time. This is why you'll see `authorArchetype` stored on post documents — it allows Explore queries to filter by archetype without joining to the users collection.

---

## Changing Your Archetype

Archetypes can be changed in **Settings → Profile Info → Archetype**. This updates the user document immediately. It does NOT retroactively update `authorArchetype` on existing posts (that field is a snapshot at creation time).

---

## Archetype Selection Screen

New users choose their archetype immediately after email verification, on the `/select-archetype` route. They must pick one before accessing the main app — there is no "skip" option.

---

## Adding a New Archetype

To add a new archetype value:

1. Add it to the union type in `types/user.ts`:
   ```typescript
   archetype: 'athlete' | 'bodybuilder' | 'crossfitter' | 'generalist' | 'powerlifter' | 'new_type'
   ```

2. Add the display name and icon in `utils/profileUtils.ts` (the `archetypeDescriptions` map)

3. Add an icon image at `assets/images/new_type.png`

4. Update `utils/settingsValidation.ts` — the `validArchetypes` array in `validateSettings()` must include the new value

5. Update the archetype picker UI in `app/select-archetype.tsx` and `screens/Settings.tsx`
