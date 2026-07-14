## Smart Analytics — Cleaner, more spacious UI

Restyle `src/components/chat/ChatInterface.tsx` so the chat surface feels enterprise-grade and gives the conversation more room. No backend / model changes.

### Changes

1. **Remove the top header bar**
   - Delete the fixed header block ("Smart Analytics · AI-powered insights" with the pulsing icon). The page already gets an in-body breadcrumb from the shared layout, so the extra title is redundant.
   - Reclaims ~64px of vertical space at the top.

2. **Empty state — tighter, more editorial**
   - Keep the welcome mark + "What can I help you analyze?" **only** on the empty state (it's the entry point, not a page header).
   - Reduce the icon size and move the "Popular questions" grid closer to the input so the eye lands on the composer.
   - Cap the grid at 6 prompts (currently 8) for a less busy first impression.

3. **Floating composer (the main ask)**
   - Change the input bar from a full-width bottom-docked strip to a **floating pill** that sits `absolute bottom-6` centered, `max-w-3xl`, with:
     - Rounded-2xl surface, subtle border, soft elevated shadow (`shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.25)]`), backdrop blur.
     - Focus ring uses the Auburn Royal Blue primary token.
     - Mic + Send as ghost/primary icon buttons inside the pill.
   - Messages scroll **underneath** the floating composer; the scroll container gets `pb-32` so the last message never hides behind the pill.
   - A soft top-to-bottom fade gradient sits behind the pill so scrolling text dissolves cleanly instead of hard-clipping.

4. **Message column widens + breathes**
   - Bump `max-w-5xl` → `max-w-4xl` for the message column but drop side padding on small screens; feels more focused.
   - Assistant messages: no bubble background (per chat-ui-composition), use plain foreground text with `prose-sm` markdown.
   - User messages: primary/primary-foreground pill, right-aligned, `max-w-[80%]`.
   - Increase inter-message spacing from `space-y-4` → `space-y-6`.

5. **Small polish**
   - Replace the 3-dot loader with a subtle shimmer line ("Thinking…") beside the assistant avatar.
   - Timestamp becomes a small muted caption under the message, only on hover, so the transcript stays clean.
   - Keep textarea focus on mount, after send, and after stream completion.

### Files touched

- `src/components/chat/ChatInterface.tsx` — layout restructure only (remove header, floating composer wrapper, message column tweaks, empty-state trim). All existing send/stream/summary/action logic preserved verbatim.

### Verification

- Load `/chat` empty → welcome + prompt grid centered; floating pill visible near bottom center.
- Send a prompt → assistant streams; last message stays visible above the pill; scrolling reveals earlier messages fading under it.
- Focus ring + hover states use primary token; no hardcoded colors.
- Typecheck stays clean.

No changes to the AI backend, tools, prompts, edge function, or message data model.