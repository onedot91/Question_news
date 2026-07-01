# Question News Design System

## 1. Current Direction

Question News uses a classroom worksheet style: warm paper, dotted separators, white card borders, small sticker-like highlights, and readable Korean-first typography. Performance fixes should preserve this friendly material while reducing expensive offscreen paint on low-power Chromebooks.

## 2. Tokens

- Color tokens live in `src/styles/global.css` under `:root`: `--ink`, `--muted`, `--line`, `--paper`, `--mint`, `--mint-strong`, `--coral`, `--coral-strong`, `--sky`, `--banana`, `--lavender`, `--pink`.
- Elevation tokens: `--shadow` for normal cards and `--shadow-lift` for hover/lifted states.
- Radius: cards, panels, buttons, and chips use `8px`; pill controls use `999px`.
- Spacing follows a 4px grid. Existing major gaps use 8, 10, 12, 14, 16, 18, 20, 22, 24, 30, 32, and 48px.

## 3. Typography

- Font stack: `"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Headings use heavy weights, tight line-height, and no negative letter spacing.
- Body and card text use Korean-friendly line-height between 1.4 and 1.7.

## 4. Layout

- Pages use a centered `min(1120px, calc(100% - 32px))` content width.
- Student write cards use a two-column grid on wide screens and collapse in responsive CSS.
- Collection cards are repeated list items and may use CSS containment/content visibility to keep long lists smooth.

## 5. Primitives

- `question-card`: primary writing surface with white border, paper fill, small decorative tape/dots, selected and saved states.
- `shared-card`: repeated question collection item. It must remain lightweight because many instances can exist on one student page.
- `history-modal`: fixed dialog with scrollable history list and visible close control.
- `primary-button` and `secondary-button`: 8px rounded command buttons with clear focus and disabled states.
- `collection-tabs`: pill segmented control for switching personal/topic collections.

## 6. Motion

- Use transform/opacity animation only.
- Avoid animation or expensive paint on large repeated collections.
- Respect `prefers-reduced-motion` where broad animation is added.

## 7. Accessibility

- Korean text must not clip or overlap at Chromebook widths.
- Focus outlines remain visible on text inputs and controls.
- Decorative images use empty `alt`; meaningful controls have labels.
