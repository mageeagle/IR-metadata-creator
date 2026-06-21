# Room-Z Preset Maker — Design Specification

**Date:** 2026-06-21  
**Status:** Approved by user

---

## Overview

A web application for creating and editing Roomz preset configuration files (`config.xml`). Users define room dimensions, upload a floor plan image as a visual map, and place sources and receivers on that map with precise coordinates and rotations. Multiple scenarios can be defined per config.

---

## Architecture

### Technology Stack
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4 (already configured)
- **State management:** React `useState` / `useReducer` — no external state library needed
- **XML parsing/generation:** `fast-xml-parser` (npm package) for reliable parsing and serialization
- **File I/O:** Browser `FileReader` API for import, `Blob` + `URL.createObjectURL` for export

### Project Structure
```
room-z-preset-maker/
├── app/
│   ├── page.tsx                    # Main editor page
│   ├── layout.tsx                  # Root layout (existing)
│   └── globals.css                 # Global styles (existing)
├── components/
│   ├── Editor/                     # All editor-related components
│   │   ├── Sidebar.tsx             # Left panel: room map load, room metadata, info, scenarios list, bulk load
│   │   ├── Canvas.tsx              # Center panel: image-based map with draggable markers
│   │   ├── PropertiesPanel.tsx     # Right panel: context-sensitive property editor
│   │   ├── ScenarioEditor.tsx      # Sub-component for editing a single scenario
│   │   ├── SourceMarker.tsx        # Draggable source marker on canvas
│   │   ├── ReceiverMarker.tsx      # Draggable receiver marker on canvas
│   │   └── AudioFileInput.tsx      # Multi-channel audio file path input
│   └── common/
│       ├── Button.tsx              # Styled button component
│       └── Modal.tsx               # For error messages, confirmation dialogs
├── lib/
│   ├── xml-parser.ts               # XML to JS model conversion
│   ├── xml-serializer.ts           # JS model back to XML string
│   └── types.ts                    # Shared TypeScript types/interfaces
├── store/
│   └── useEditorStore.ts           # Central state (useState with reducer pattern)
├── example/
│   ├── config.xml                  # Example config (existing)
│   ├── room.jpg                    # Example image (existing)
│   └── rirs/                       # Example audio files (existing)
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-06-21-room-z-preset-maker-design.md
```

---

## Data Model

### Core Types (`lib/types.ts`)

```typescript
// Room-level metadata
interface RoomConfig {
  width: number;
  height: number;
  originX: number;
  originY: number;
  originZ: number;
}

// Info text stored in <info> tag
interface InfoText {
  data: string; // may contain multi-line descriptions
}

// A single source or receiver position + orientation
interface Position { x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }

// A source with optional file path
interface Source {
  id: string; // unique identifier for UI state
  isLocked?: boolean;
  filePath?: string; // e.g. "rirs/03.wav" (optional)
  position: Position;
}

// A receiver with optional multi-channel file paths
interface Receiver {
  id: string; // unique identifier
  isLocked?: boolean;
  fileNames: string[]; // [ch1, ch2, ch3, ch4] — each element optional
  position: Position;
}

// A scenario with a locked type and lists of sources/receivers
// When locked='source' with multiple fixed sources (e.g., source_1..4),
// each receiver gets N file paths forming a matrix (one per each source).
interface Scenario {
  id: string; // unique identifier
  name: string;
  locked: 'source' | 'receiver' | 'none';
  lockedSources: Source[];        // when locked = 'source' — can be 1 or more
  lockedReceivers: Receiver[];    // when locked = 'receiver' — can be 1 or more
  sources: Source[];              // moving sources (when locked = 'receiver')
  receivers: Receiver[];          // moving receivers (when locked = 'source')
}

// The full config model
interface ConfigModel {
  room: RoomConfig;
  info: InfoText;
  scenarios: Scenario[];
}
```

### XML Mapping (`lib/xml-parser.ts`)

#### Room Element
```xml
<root>
  <room width="4" height="4" origin_x="0.0" origin_y="0.0" origin_z="0.0"/>
  ...
</root>
```
- `width`, `height` → `RoomConfig.width`, `RoomConfig.height`
- `origin_x`, `origin_y`, `origin_z` → `RoomConfig.originX/Y/Z`

#### Info Element
```xml
<info data="..."/>
```
- `data` attribute → `InfoText.data` (preserved as-is, may contain multiline)

#### Scenario Element
```xml
<scenario locked="source" name="Source locked">
  <source src_x="2.0" src_y="2.0" src_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
  <receivers>
    <receiver file_name="rirs/01.wav" rcv_x="0.5" rcv_y="0.5" rcv_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
  </receivers>
</scenario>
```
- `locked` attribute → `Scenario.locked` (`'source'`, `'receiver'`, or missing/empty → `'none'`)
- `name` attribute → `Scenario.name`

**Single locked object (one fixed, rest moving):**
- `<source>` at scenario root (single) → added to `Scenario.lockedSources[]` when locked = 'source'
- `<receiver>` at scenario root (single) → added to `Scenario.lockedReceivers[]` when locked = 'receiver'

**Multiple sources/receivers in a scenario (matrix pattern applies whenever N sources × M receivers):**
- When there are multiple sources defined as `<source_1>`, `<source_2>`, ..., `<source_N>` → each maps to a separate entry in `Scenario.lockedSources[]` or `Scenario.sources[]` depending on context
- When there are multiple receivers defined as `<receiver_1>`, `<receiver_2>`, ..., `<receiver_N>` → each maps to a separate entry in `Scenario.lockedReceivers[]` or `Scenario.receivers[]` depending on context
- The matrix pattern (each receiver storing N file paths) triggers whenever the scenario has multiple sources AND multiple receivers simultaneously, regardless of locked state

**File path matrix (multi-source × multi-receiver):**
When a scenario has N sources and M receivers (both > 1), each receiver stores N file paths forming a matrix:
- `<receiver file_name_1="rirs/01.wav" file_name_2="rirs/02.wav" ... file_name_N="rirs/N.wav" rcv_x="..." .../>`
- Each `file_name_N` maps to `Receiver.fileNames[N-1]` — the IR from source N to this receiver
- The number of `file_name_*` attributes equals the count of sources in that scenario (not just locked sources)

**Single file path (one source, multiple receivers):**
- `<receiver file_name="rirs/01.wav" .../>` → each receiver has exactly one file path (the IR from the single locked source to this receiver)

#### Coordinate Attribute Naming
| Type | X attribute | Y attribute | Z attribute |
|------|-------------|-------------|-------------|
| Source (locked, single) | `src_x` | `src_y` | `src_z` |
| Source (moving) | `src_x` | `src_y` | `src_z` |
| Receiver (locked, single) | `rcv_x` | `rcv_y` | `rcv_z` |
| Receiver (moving) | `rcv_x` | `rcv_y` | `rcv_z` |

The UI always shows `X`, `Y`, `Z` regardless of the XML attribute name. The serializer handles the mapping.

---

## Component Design

### `page.tsx` — Main Layout
- Renders a 3-panel flex layout: Sidebar | Canvas | Properties Panel
- All state is managed via `useEditorStore` hook
- On mount, checks for a saved config in localStorage (auto-resume) and offers to load it
- No hardcoded defaults — starts with an empty room config if no file is loaded

### `Sidebar.tsx` — Left Panel
**Sections (top to bottom:**
1. **Room Map Load Zone**
   - Dashed drop zone for drag-and-drop or click-to-browse
   - Shows status: "Click or drag to load room map" / "✓ image.jpg loaded (click to change)"
   - On file selection, stores as `File` object and displays as `<img>` background on canvas via URL.createObjectURL()
2. **Room Metadata**
   - Inputs for width, height, origin_x, origin_y, origin_z
3. **Info Text**
   - `<textarea>` for free-form description
4. **Bulk Load**
   - Dropdown: "Load coordinates as" → Sources / Receivers
   - Monospace textarea with placeholder `x,y,z,rotZ,rotY,rotX` (one per line)
   - "Load Coordinates" button that parses CSV lines and appends to the current scenario's sources or receivers
5. **Scenarios List**
   - Each item shows: name, locked type, count of sources/receivers
   - Edit button opens inline editor, delete button removes scenario
   - "+ Add Scenario" button at bottom

### `Canvas.tsx` — Center Panel
- Renders the uploaded image as a full-width/height background `<img>`
- Applies a subtle grid overlay (25% width/height squares from SVG pattern)
- Shows coordinate labels: "X: 0 — {room.width} m | Y: 0 — {room.height} m" at bottom-left
- Toolbar at top-center with "+ Add Source" and "+ Add Receiver" buttons
- Each marker is a draggable `<div>`:
  - Sources: orange circle (S), size 26px
  - Receivers: blue circle (R), size 24px
  - Locked source: larger yellow circle with 🔊 icon, 32px
  - Clicking a marker selects it and opens its properties in the right panel
  - Dragging a marker updates its X/Y coordinates in real-time (mapped from pixel position to room coordinates)

### `PropertiesPanel.tsx` — Right Panel
- Context-sensitive: shows different content based on what's selected
- If no scenario is selected, shows "Click a marker on the canvas to edit"
- When a scenario is selected:
  1. **Scenario settings** (name input, locked type dropdown with None/Source/Receiver options)
  2. **Locked object section** (if locked = source or receiver) — shows position + rotation inputs
  3. **Sources list** — each source has its own card with X/Y/Z and Rot X/Y/Z fields, remove button
  4. **Receivers list** — each receiver has position/rotation inputs plus multi-channel file path inputs (each prefixed with ch1/ch2/ch3/ch4 labels), "Add Channel" button, remove button
- Each field is labeled: `X (m)`, `Y (m)`, `Z (m)`, `Rot X (°)`, `Rot Y (°)`

### `AudioFileInput.tsx` — Multi-channel file input
- Renders a list of file path inputs, each prefixed with a channel label (ch1, ch2, etc.)
- "Add Channel" button appends a new empty file path input
- Each input has a remove button
- Stores values as `string[]` in the model
- When a scenario has N sources and M receivers (both > 1), each receiver gets exactly N channels (auto-sized on scenario load or when source count changes)
- Adding/removing sources in any scenario with multiple sources updates all receivers' channel counts to match

---

## State Management (`store/useEditorStore.ts`)

```typescript
interface EditorState {
  config: ConfigModel | null; // null = no file loaded
  roomMapImage: File | null;  // uploaded image file (or null)
  roomMapPreviewUrl: string | null; // object URL for canvas background
  selectedScenarioId: string | null;
  selectedMarkerId: string | null; // selected source/receiver ID
}
```

### Actions
- `LOAD_XML(xmlString)` — parse XML, set config
- `IMPORT_FILE(file)` — read file as text, call LOAD_XML
- `EXPORT_FILE()` — serialize config to XML, trigger download
- `SET_ROOM(config.room)` — update room metadata
- `SET_INFO(config.info)` — update info text
- `ADD_SCENARIO()` — create new empty scenario with generated ID
- `DELETE_SCENARIO(id)` — remove scenario
- `UPDATE_SCENARIO(id, updates)` — update scenario fields
- `ADD_SOURCE(scenarioId, source)` — add to scenario.sources[] or lockedSources[]
- `REMOVE_SOURCE(scenarioId, sourceId)` — remove from sources array
- `ADD_RECEIVER(scenarioId, receiver)` — add to scenario.receivers[] or lockedReceivers[]
- `REMOVE_RECEIVER(scenarioId, receiverId)` — remove from receivers array
- `UPDATE_POSITION(id, positionData)` — update a source or receiver's position
- `UPDATE_FILE_PATHS(receiverId, fileNames)` — update multi-channel file paths
- `LOAD_ROOM_MAP(file)` — store file and create preview URL
- `BULK_LOAD(type, lines)` — parse CSV lines and add sources/receivers to current scenario
- `CLEAR_ALL()` — reset all state

### Persistence
- On every state change, save the current config (as JSON) to localStorage under key `room-z-preset-maker`.
- On app load, check for existing saved config and offer to resume.
- This is a convenience feature — the authoritative save is via XML export.

---

## Import/Parsing Flow

1. User clicks "Load room map" zone or drags a `.xml` file onto it.
2. If file has `.xml` extension, parse as config XML → populate all fields.
3. If file has image extensions (.jpg, .png, etc.), load as room map image.
4. On successful parse:
   - Populate sidebar fields (room metadata, info text)
   - Create scenarios with sources/receivers
   - Load image as canvas background
5. On parse error:
   - Show inline error message in the sidebar (red background, descriptive text)
   - Do not modify existing state

---

## Export/Serialization Flow

1. User clicks "Export XML" button (in sidebar or as a floating action button).
2. Serialize the current config state back to XML using `fast-xml-parser`.
3. Map UI field names back to XML attribute names:
    - Position.x → src_x (sources) or rcv_x (receivers)
    - fileNames[0] → file_name_1, etc.
    - When a receiver has N file paths, each becomes file_name_1 through file_name_N
- When a scenario has multiple sources or receivers, serialize each as <source_1>/<source_2>/... or <receiver_1>/<receiver_2>/... (use <source>/<receiver> without suffix only for single objects)
4. Create a Blob with the XML string, generate object URL, trigger download as `config.xml`.
5. On success: show confirmation toast/message in sidebar.

---

## Error Handling

- **XML Parse Errors:** Display inline error message in sidebar (red background, white text). Include line number and description if available from parser.
- **Invalid Coordinates:** If a user enters non-numeric values for X/Y/Z or rotations, show red border on the input and disable "Load Coordinates" button.
- **Missing Room Map:** No hard requirement — canvas works without an image (shows grid on dark background).
- **File Too Large:** Limit room map images to 10MB. Show error if exceeded.

---

## Testing Strategy

- **XML parser tests** (`lib/xml-parser.test.ts`): Parse the example `config.xml`, verify all fields match expected values (room dimensions, each scenario's sources/receivers, file paths).
- **Serializer tests** (`lib/xml-serializer.test.ts`): Serialize a known ConfigModel, compare output against expected XML string.
- **Bulk load parsing**: Test CSV line parsing with valid/invalid inputs, empty lines, extra whitespace.
- **State management**: Test each action in `useEditorStore` — verify state transitions are correct (e.g., adding a scenario creates unique ID, removing last scenario leaves empty array).

---

## UI/UX Details

### Color Coding
- Sources: orange (#f97316) — visible against dark canvas
- Receivers: blue (#3b82f6) — clear distinction from sources
- Locked objects: yellow/gold (#f59e0b) with larger size and icon
- Canvas background: dark (#1a1a2e) — makes colored markers pop
- Sidebar/backgrounds: white (#fff) with subtle borders for readability

### Responsive Behavior
- On narrow screens (< 1200px): collapse right panel below canvas (stack vertically)
- On very narrow screens (< 768px): sidebar becomes a hamburger menu
- Canvas always takes remaining space

### Accessibility
- All inputs have visible labels (not just placeholders)
- Color-coded markers include text labels (S/R) for colorblind users
- Keyboard navigation: Tab through all inputs, arrow keys to move markers on canvas
- ARIA labels on interactive canvas elements

---

## Dependencies to Add

```bash
npm install fast-xml-parser
```

No other new dependencies are needed — React and Next.js handle rendering, Tailwind handles styling.
