# Specification: UI Layout

## ADDED Requirements

### Requirement: Candidate cards display in two-column grid

Candidate cards in the ranking view MUST be arranged in a responsive two-column grid that maximizes screen space utilization while maintaining readability.

#### Scenario: Desktop viewport displays two columns
**Given** a user is viewing the candidate ranking on a desktop screen (>800px width)
**When** the ranking component renders multiple candidates
**Then** candidate cards SHALL be displayed in two columns side-by-side
**And** each card SHALL occupy approximately 50% of the container width
**And** cards SHALL have consistent spacing (16px gap) between columns and rows

#### Scenario: Mobile viewport displays single column
**Given** a user is viewing the candidate ranking on a mobile screen (<800px width)
**When** the ranking component renders
**Then** candidate cards SHALL stack vertically in a single column
**And** each card SHALL occupy 100% of the container width

#### Scenario: Card height varies based on content
**Given** candidate cards with different amounts of content
**When** displayed in the two-column grid
**Then** each card SHALL size to fit its content
**And** card heights MAY differ between cards
**And** content within each card SHALL remain aligned and readable

---

### Requirement: PDF modal provides enlarged viewing area

The PDF resume viewer modal MUST be enlarged to improve readability and reduce the need for zooming.

#### Scenario: Modal displays at increased width
**Given** a user clicks on a candidate name to view their resume
**When** the PDF modal opens
**Then** the modal SHALL have a maximum width of 1400px (or 95% viewport width)
**And** the modal SHALL maintain a height of 90vh
**And** the PDF iframe SHALL fill the available modal space

#### Scenario: Modal remains centered on viewport
**Given** the PDF modal is open
**When** displayed on any screen size
**Then** the modal SHALL be horizontally centered in the viewport
**And** the modal SHALL be vertically centered in the viewport
**And** proper padding (24px) SHALL be maintained around the modal edges

---

### Requirement: Grid layout preserves visual hierarchy

The two-column grid layout MUST maintain the existing visual hierarchy and ranking indicators.

#### Scenario: Ranking numbers remain visible
**Given** candidates are displayed in a two-column grid
**When** a user scans the list
**Then** ranking numbers (1, 2, 3...) SHALL remain clearly visible
**And** ranking numbers SHALL maintain their position at the start of each card
**And** the numerical order SHALL flow left-to-right, top-to-bottom

#### Scenario: Color-coded indicators persist
**Given** candidates with different qualification levels
**When** displayed in the grid
**Then** top candidates (all criteria) SHALL maintain green highlighting
**And** strong candidates (50%+ criteria) SHALL maintain amber highlighting
**And** other candidates SHALL maintain neutral gray styling
**And** color borders and backgrounds SHALL scale proportionally to card size

---

### Requirement: Layout adapts responsively without breaking functionality

The grid layout MUST gracefully adapt to different screen sizes while preserving all interactive functionality.

#### Scenario: Criteria badges wrap within card width
**Given** a candidate card with 5 criteria badges
**When** displayed at 50% container width
**Then** badges SHALL wrap to multiple rows if necessary
**And** all badges SHALL remain fully visible
**And** badge text SHALL not be truncated

#### Scenario: Summary text remains readable
**Given** a candidate card with a summary paragraph
**When** displayed in a narrower column
**Then** text SHALL wrap to multiple lines as needed
**And** line height and spacing SHALL maintain readability
**And** background highlight SHALL extend to cover all wrapped text

#### Scenario: Clickable elements remain accessible
**Given** a candidate card in the grid layout
**When** a user interacts with the card
**Then** the candidate name link SHALL remain clickable
**And** clicking the name SHALL open the PDF modal
**And** touch/click targets SHALL meet minimum size requirements (44px)
