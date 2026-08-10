# IssueReady UI Design System

Date: 2026-08-10
Status: Task 10 browser-verified visual system

## Product and direction

IssueReady is a developer/productivity tool for open-source maintainers and prospective contributors. Its one primary action is to analyze a public GitHub repository. The page should communicate auditability and care rather than AI novelty.

> A calm editorial-precision interface for open-source maintainers, built around an issue-readiness proof-sheet motif, using assertive system typography, paper/ink/cobalt contrast, ruled-grid composition, and restrained causal motion.

The dominant style family is precision product. Editorial rules, margin notation, and asymmetric type scale are the single secondary influence.

## Signature motif

The proof-sheet motif is a cobalt editorial margin rule with small audit ticks. It appears only beside the primary landing composition and in compact status marks. It is CSS-only, adds no image request, does not carry status by itself, and remains recognizable without animation.

## Frozen visual decisions

### Color

- Paper/page: `#F6F5F0`
- Ink/text: `#172033`
- Cobalt/primary action and focus: `#3159E8`
- Ready: `#16794A`
- Warning: `#A15C00`
- Stale/error: `#B63636`
- Strong control boundary: `#858D9C`; checked at approximately 3.06:1 against paper and 3.34:1 against white, meeting the 3:1 non-text contrast boundary.
- Decorative dividers retain the lighter neutral rule and are not used to identify control boundaries.
- Surfaces use white and restrained neutral rules; cobalt remains the only decorative accent.
- Status color must always be paired with text or a mark. Color is never the only signal.

### Typography

- Display and body: system sans-serif stack.
- Repository URLs and audit metadata only: system monospace stack.
- No remote fonts or font files.
- Base body text is at least 16 px with 1.6 line height. Long copy is limited to about 60–66 characters per line; Chinese copy receives the same or greater vertical breathing room.

### Space, grid, and shape

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, and 64 px.
- Maximum content width: 1120 px.
- Mobile-first one-column composition. At 800 px and wider, the hero becomes a 12-column grid with copy in seven columns and the form in five.
- At 480 px and below, the header deliberately becomes two rows and the language control spans the available width; the full English and Chinese labels remain visible without abbreviation or wrapping.
- Radii: 6 px for controls, 12 px for composed surfaces, and 999 px only for the compact language segmented control.
- Borders and tonal separation take precedence over shadow. The form receives one small cobalt-tinted proof-sheet offset.
- No horizontal overflow at supported widths.

### Report composition

- The repository summary is the first proof sheet: a cobalt top rule and numbered audit mark frame repository identity, warnings, and prerequisite file states.
- Report controls sit on a ruled editorial band. The single cobalt refresh action remains primary; methodology and GitHub destinations use bordered secondary links.
- Classification filters use a controlled two-column mobile grid and a four-column grid from 800 px. The pressed state uses ink plus paper text, while counts remain monospace audit metadata.
- Issue cards use the same structure but receive a semantic top rule: Ready green, Needs work amber, or Possibly stale red. Every color is repeated in visible classification text. Evidence rows explicitly say Passed or Missing and show deterministic points.
- At 1024 px and wider, issue cards form a two-column reading grid; below that boundary they remain one column so evidence labels retain a useful line measure. Repository summary content alone adopts the 12-column grid at 800 px.
- Empty, filtered-empty, partial-community, and error states use the same ruled surfaces and native actions. They do not substitute decoration for the state explanation or recovery action.
- Labels are restrained rectangular metadata chips rather than pill-shaped primary UI. Cards use borders and paper/white contrast without large shadows, gradients, glass, or remote imagery.

### Interaction and motion

- Every interactive target is at least 44 px high.
- Native form, input, and button elements provide the semantic base.
- Labels and persistent helper text remain visible; the repository input is natively required, and empty submission focuses the invalid field while showing feedback beside it.
- The submit action is disabled while loading, and one polite live region announces the current phase without moving focus.
- Hover, active, focus, and disabled states are visibly distinct. Keyboard focus uses a 3 px cobalt ring with 3 px offset.
- Non-essential transitions are at most 160 ms and explain hover, press, or state response. There is no continuous or entrance animation.
- `prefers-reduced-motion: reduce` removes transitions, animation repetition, and smooth scrolling.

## Responsive and accessibility rules

- Inspect around 375 px, 768–1024 px, and 1280–1440 px.
- Preserve source order when the 12-column grid activates.
- Body copy remains at least 16 px and controls do not depend on hover.
- URLs wrap rather than force horizontal scrolling.
- Page landmarks and heading order remain semantic.
- Text contrast targets WCAG 2.2 AA (4.5:1 for normal text); state colors are paired with explicit words or marks.
- Language controls use text labels and `aria-pressed`; no flags, emoji, icon font, or image stands in for language.
- Form help is associated through `aria-describedby`, and invalid state uses both `aria-invalid` and an inline alert.
- Browser zoom is never disabled.

## UI/UX Pro Max evidence and decisions

The required database searches were:

1. Design system: `open source maintainer developer productivity audit tool editorial precision calm` with React detected from `package.json`, variance 6, motion 2, density 5.
2. UX: `form accessibility loading inline validation keyboard focus`.
3. React: `responsive semantic forms rerender bundle`.
4. Validation: `animation accessibility z-index loading`.
5. Report UX: `data report filters cards responsive accessibility target size status`.
6. React report implementation: `report filters semantic controls responsive performance`.

Retained recommendations:

- keep one above-fold primary CTA and a controlled grid;
- use controlled React inputs and native submit semantics;
- keep visible labels, persistent help, inline errors, keyboard focus, loading feedback, and disabled double-submit protection;
- use mobile-first breakpoints, 44 px targets, readable measures, semantic tokens, and a complete reduced-motion path.
- keep status feedback adjacent to the affected report, prevent page-level horizontal overflow, and use semantic buttons and links for filters and destinations.

Rejected conflicts:

- The database's “Modern Dark” direction, deep-black palette, glassmorphism, blur, glow, gradients, and ambient-light decoration conflict with the approved light editorial proof-sheet direction.
- Remote Google Inter conflicts with the no-remote-assets and privacy/performance constraints.
- A green primary CTA would compete with semantic Ready green; cobalt remains the sole primary action color.
- 300–400 ms GSAP scroll reveals and an animation dependency exceed the 160 ms motion budget and do not explain a needed interaction.
- Haptic, cinematic, and native-app guidance is irrelevant to this static web interface.

The project specification and this frozen system take precedence whenever a database recommendation conflicts.

## Browser evidence and acceptance

- Deterministic Playwright routes cover all three GitHub endpoints; browser tests never depend on live GitHub state.
- Desktop Chromium and a Pixel 7 profile cover landing/report WCAG scans, keyboard form and filter operation, shared links, 404, rate-limit, community partial failure, hostile remote text, and one explicit three-request refresh cycle.
- A fixed 375 px check requires `scrollWidth <= clientWidth` and measures every visible link, button, and input at no less than 44 by 44 px. The first red run exposed 18–28 px report links; the report link and action rules are the evidence-driven correction.
- The responsive review matrix is 375, 900, and 1366 px. At 375 px actions stack cleanly; at 900 px the summary uses 12 columns while issue cards preserve a single reading column; at 1366 px issue cards use two columns inside the 1120 px content measure.
- The axe gate checks serious and critical WCAG 2 A/AA, 2.1 AA, and 2.2 AA findings on both the landing page and populated report. Automated checks complement, rather than replace, keyboard and responsive inspection.
