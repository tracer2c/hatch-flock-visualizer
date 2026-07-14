## Goal
Make Smart Analytics replies look like ChatGPT: headings, bold, bullets, numbered lists, blockquotes, tables, dividers, inline code, and fenced code blocks — instead of a flat paragraph.

## Root causes
1. `@tailwindcss/typography` is installed but **not registered** in `tailwind.config.ts`, so every `prose` / `prose-*` class in `ChatInterface.tsx` is a no-op. Markdown *is* rendered by `react-markdown`, but with zero visual hierarchy.
2. The `ai-chat` system prompt does not strictly force markdown structure, so short answers come back as plain sentences (matches the screenshot: "Suggested next step" is a line, not a heading).
3. No sanitizer and no code-syntax highlighting, so code blocks look like grey text.

## Changes

### 1. `tailwind.config.ts`
Register the typography plugin so `prose` classes actually style output:
```ts
plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
```

### 2. `src/components/chat/ChatInterface.tsx`
- Add `rehype-sanitize` and `rehype-highlight` to the `ReactMarkdown` pipeline (with `remark-gfm` already present) for GFM tables, task lists, strikethrough, sanitized HTML, and syntax-highlighted code.
- Expand the assistant `prose` wrapper with explicit styling for:
  - `h2` / `h3` (semibold, tight tracking, top margin)
  - `ul` / `ol` (proper markers + indentation)
  - `blockquote` (left border in `border-primary/40`, italic muted foreground)
  - `hr` (subtle divider)
  - `table` (bordered, zebra rows, right-aligned numeric column via GFM `---:`)
  - `code` inline vs `pre > code` block (rounded, `bg-muted`, mono)
  - `a` (primary color, underline on hover)
- Keep the existing `chart` fenced-block extraction untouched.
- Add a lightweight highlight.js theme import (`highlight.js/styles/github.css` and dark variant swap via CSS variable) so code blocks are readable in light/dark.

### 3. `supabase/functions/ai-chat/index.ts` — system prompt
Add an explicit "Formatting contract" section that *requires* GFM structure on every answer, e.g.:
- Start with a single `##` heading naming the analysis.
- Use `**bold**` for key metrics inline.
- Use bulleted lists for findings, numbered lists for steps.
- Use `>` blockquote for cautions / notes.
- Use GFM tables with right-aligned numeric columns (`|---:|`) whenever comparing ≥2 rows of numbers.
- Use `---` dividers between distinct sections.
- Use fenced code blocks with a language tag for any code or JSON.
- For empty-data replies, keep the existing "No data recorded" rule but render it as a `##` heading + bulleted "Suggested next steps" + blockquote note (fixes the screenshot).
- Keep the existing `chart` fenced-block instruction for visualizations.

Redeploy the edge function after editing.

### 4. Dependencies
Add: `rehype-sanitize`, `rehype-highlight`, `highlight.js`. (`react-markdown`, `remark-gfm` already installed.)

## Out of scope
- Custom interactive artifacts (writing blocks, citations, file cards, product carousels). Those require a structured tool-output protocol, not markdown — call out as a follow-up if the user wants them later.
- Streaming token-by-token rendering (current backend returns full response). Can be a later phase.

## Verification
- Reload `/chat`, ask "Show machine utilization analytics" → response renders with an `##` heading, bulleted "Suggested next steps", and a `>` note instead of a flat paragraph.
- Ask "Create a fertility vs hatch rate comparison" → GFM table + inline `chart` block below.
- Ask "Give me a SQL snippet" → fenced code block with syntax colors.
- Check both light and dark themes.
