# Implementation Tasks

## Overview

This task list provides a sequential implementation path for refining the candidate card layout to a 2-column grid and enlarging the PDF modal.

---

## Task 1: Update candidate card container to use flexbox grid

**What**: Modify CandidateRanking.tsx to wrap candidate cards in a flex container with 2-column layout

**How**:
- Locate the candidate list rendering section (lines 94-165)
- Wrap the `.map()` loop in a container View with `flexDirection: 'row'`, `flexWrap: 'wrap'`
- Add `gap: 16` for spacing between cards
- Update individual card styles to use `flex: 1`, `minWidth: 400`, `maxWidth: '50%'`

**Validation**:
- View ranking page with 4+ candidates
- Verify cards display side-by-side in two columns
- Verify 16px gap between cards
- Verify cards stack to single column when window width < 800px

**Dependencies**: None

---

## Task 2: Adjust card styling for grid layout

**What**: Update card dimensions and spacing to work within 50% width constraint

**How**:
- Modify card wrapper styles (lines 100-109) to account for narrower width
- Ensure padding remains consistent
- Test that border colors and backgrounds scale properly
- Verify ranking badge (circle with number) remains properly sized

**Validation**:
- All card visual elements remain proportional
- Text doesn't overflow or get cut off
- Borders and backgrounds render correctly
- Color coding (green/amber/gray) is clearly visible

**Dependencies**: Task 1

---

## Task 3: Test criteria badge wrapping

**What**: Verify that qualification badges wrap gracefully within narrower card width

**How**:
- Load candidates with 5 criteria (maximum)
- Observe badge layout in 50% width cards
- Ensure badges wrap to multiple rows if needed
- Verify spacing between wrapped badges is consistent

**Validation**:
- All badges visible without horizontal scroll
- Badge text fully readable (not truncated)
- Wrapping looks intentional, not broken
- Margin/padding between rows is appropriate

**Dependencies**: Task 2

---

## Task 4: Enlarge PDF modal width

**What**: Increase PDFModal maximum width from 1000px to 1400px

**How**:
- Open `PDFModal.tsx`
- Update `maxWidth: 1000` to `maxWidth: 1400` (line 36)
- Add `width: '95%'` to ensure responsive scaling
- Keep `maxHeight: '90vh'` unchanged

**Validation**:
- Open PDF modal by clicking candidate name
- Measure modal width (should be 1400px on large screens)
- Verify modal scales down on smaller screens
- Verify modal doesn't touch screen edges (maintains padding)
- Verify PDF iframe fills the modal space correctly

**Dependencies**: None (can be done in parallel with Task 1-3)

---

## Task 5: Test responsive behavior

**What**: Verify layout works correctly across different viewport sizes

**How**:
- Test at desktop size (1920px, 1440px, 1280px)
- Test at tablet size (768px)
- Test at mobile size (375px, 414px)
- Use browser DevTools responsive mode

**Validation**:
- **Desktop**: 2-column grid displays
- **Tablet**: 2-column or 1-column (depending on card min-width)
- **Mobile**: 1-column stack
- **PDF Modal**: Scales appropriately at all sizes
- **No horizontal scrolling** at any breakpoint

**Dependencies**: Tasks 1, 2, 4

---

## Task 6: Verify accessibility and interactions

**What**: Ensure keyboard navigation and screen reader support remain functional

**How**:
- Tab through candidate cards
- Verify focus indicators are visible
- Use keyboard to open PDF modal (Enter/Space on candidate name)
- Test with screen reader (VoiceOver/NVDA)
- Verify modal can be closed with Escape key

**Validation**:
- Tab order flows logically (left-to-right, top-to-bottom)
- Focus visible on all interactive elements
- Screen reader announces card content correctly
- Modal opens and closes with keyboard
- No keyboard traps

**Dependencies**: Task 5

---

## Task 7: Browser compatibility testing

**What**: Test layout across major browsers

**How**:
- Test in Chrome/Edge (Chromium)
- Test in Firefox
- Test in Safari (macOS/iOS)
- Check for flexbox gap support fallback

**Validation**:
- Grid displays correctly in all browsers
- PDF modal renders properly in all browsers
- If gap not supported, fallback spacing works
- No visual regressions or layout breaks

**Dependencies**: Task 6

---

## Success Criteria

After all tasks are complete, verify:
- [ ] Candidate cards display in 2-column grid on desktop (>800px)
- [ ] Cards stack to single column on mobile (<800px)
- [ ] PDF modal width is 1400px (or 95% viewport)
- [ ] All visual hierarchy (ranking, colors) is preserved
- [ ] No content is cut off or illegible
- [ ] Keyboard navigation works correctly
- [ ] Layout is responsive across all screen sizes
- [ ] Performance is unchanged (no re-render issues)
