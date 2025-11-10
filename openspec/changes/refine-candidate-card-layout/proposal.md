# Proposal: Refine Candidate Card Layout

## Why

The current candidate ranking UI displays each candidate card as a full-width block, consuming an entire horizontal line. This creates vertical scrolling for users viewing multiple candidates and makes it harder to compare candidates at a glance. Additionally, the PDF resume viewer modal is relatively small (max-width: 1000px) and doesn't provide optimal positioning context relative to the candidate card that was clicked.

## What Changes

### UI Layout Refinement (`ui-layout`)

**Added Requirements:**
- Candidate cards display in a 2-column grid layout (50% width each)
- PDF modal increases in size for better resume readability
- PDF modal positioning is contextually aware of the clicked candidate card

**Benefits:**
- Better space utilization - view twice as many candidates without scrolling
- Improved candidate comparison workflow
- Enhanced resume viewing experience with larger modal
- More intuitive UX with modal appearing near the source card

## Scope

This change affects:
- `CandidateRanking.tsx` - Card layout and grid structure
- `PDFModal.tsx` - Modal size and positioning logic

## Out of Scope

- Responsive mobile layout (cards will stack on small screens naturally via flexbox)
- Grid column count customization
- Modal animation/transitions
- Candidate card content/data structure changes

## Dependencies

None - this is a pure UI enhancement with no backend or data model changes.

## Success Criteria

1. Candidate cards display side-by-side in a 2-column grid on desktop viewports
2. PDF modal width increases to at least 1400px (or 95% viewport width)
3. Cards maintain visual hierarchy and readability in the new layout
4. Modal positioning provides better spatial context relative to the clicked card
