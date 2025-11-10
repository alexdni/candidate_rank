# Design: Candidate Card Layout Refinement

## Overview

This design refines the candidate ranking UI to improve space efficiency and resume viewing experience through a 2-column card layout and enlarged PDF modal.

## Current State

### Candidate Cards (CandidateRanking.tsx)
- **Layout**: Full-width blocks (lines 100-163)
- **Container**: Single column flex container
- **Spacing**: 12px margin bottom between cards
- **Card width**: 100% of parent container

### PDF Modal (PDFModal.tsx)
- **Max width**: 1000px (line 36)
- **Height**: 90vh (line 38)
- **Positioning**: Centered in viewport
- **Context**: No awareness of source card location

## Proposed Changes

### 1. Two-Column Card Grid

**Approach**: Use flexbox with flex-wrap for responsive 2-column layout

```typescript
// Current (line 94-165 in CandidateRanking.tsx)
{sortedCandidates.map((candidate, index) => (
  <View style={{ ...singleCardStyles }}>
    {/* card content */}
  </View>
))}

// Proposed
<View style={{
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 16,  // Spacing between cards
}}>
  {sortedCandidates.map((candidate, index) => (
    <View style={{
      ...cardStyles,
      flex: '1 1 calc(50% - 8px)',  // 50% width minus half gap
      minWidth: 400,  // Prevent excessive shrinking
    }}>
      {/* card content */}
    </View>
  ))}
</View>
```

**Trade-offs:**
- **Pro**: Natural responsive behavior - stacks to single column on narrow screens
- **Pro**: No media queries needed
- **Con**: Cards may have slightly different heights
- **Solution**: Accept variable heights; content alignment is maintained per-card

### 2. Enlarged PDF Modal

**Size increase**: 1000px → 1400px (or 95% viewport width)

```typescript
// PDFModal.tsx line 36
maxWidth: 1400,  // Changed from 1000
width: '95%',    // Ensure proper scaling
```

**Rationale**:
- Standard resume PDF width is ~8.5 inches
- 1400px provides ~1.6x improvement in horizontal resolution
- 95% viewport width prevents modal from touching screen edges
- Maintains 90vh height for consistency

### 3. Modal Positioning Context

**Current behavior**: Always centers in viewport (lines 16-30)

**Proposed**: Track clicked card position and adjust modal placement

```typescript
// CandidateRanking.tsx - Pass card index to modal
const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);

<TouchableOpacity onPress={() => {
  setSelectedCandidate(candidate);
  setSelectedCandidateIndex(index);
}}>

// PDFModal.tsx - Accept and use index for positioning hint
interface PDFModalProps {
  // ... existing props
  cardIndex?: number;
}

// Use cardIndex to determine if modal should prefer top/bottom placement
```

**Implementation options**:
1. **Simple**: Just enlarge modal, keep center alignment
2. **Enhanced**: Shift modal vertically based on card position (top half vs bottom half)
3. **Advanced**: Calculate card position and position modal adjacent

**Recommendation**: Start with option 1 (simple) - the size increase alone improves UX significantly. Option 2 can be added later if needed.

## Responsive Behavior

### Breakpoints
- **Desktop (>800px)**: 2-column grid
- **Mobile (<800px)**: Single column (automatic via flexbox min-width)

### Card Content Reflow
No changes needed - existing card content already uses flexbox and wraps naturally.

## Visual Hierarchy Preservation

### Ranking indicators
- Position badges (1, 2, 3...) remain at same size
- Color coding (green/amber/gray) maintains meaning

### Criteria badges
- Wrap within card width naturally
- No truncation needed

### Summary text
- May wrap to more lines in narrower cards
- Background color maintains readability

## Performance Considerations

- **No additional re-renders**: Layout change is CSS-only
- **No state complexity**: Grid is declarative, no dynamic calculations
- **PDF loading**: Modal size doesn't affect iframe load time

## Accessibility

- **Keyboard navigation**: Unchanged, tab order flows left-to-right, top-to-bottom
- **Screen readers**: Card order preserved in DOM
- **Focus management**: Modal focus trap still works with larger size

## Browser Compatibility

- **Flexbox**: Supported in all modern browsers
- **calc()**: IE11+, all modern browsers
- **Gap property**: IE not supported, but acceptable (cards just touch edges)
- **Fallback**: Can use margin-right: 16px on cards as alternative

## Future Enhancements

1. **User preference**: Allow toggle between 1-column and 2-column views
2. **Column count**: Make grid columns configurable (2, 3, 4...)
3. **Card height equalization**: Use CSS grid for uniform card heights
4. **Modal transitions**: Add slide-in/fade animation
5. **Modal side panel**: Show candidate summary alongside PDF
