# Room Z Preset Maker — Architecture & Design Document

## Overview

A browser-based desktop application for creating and editing Roomz `config.xml` files. The app provides an interactive 3-panel UI for placing sources and receivers on a room map image with full 3D position and rotation control.

**Tech Stack:** Next.js 16 + React 19 + Tailwind CSS v4 + TypeScript + fast-xml-parser

---

## Project Structure

```
room-z-preset-maker/
├── app/
│   └── page.tsx              # Root layout — 3-panel layout, wires store to all panels
├── lib/
│   ├── types.ts              # All TypeScript interfaces and types
│   ├── xml-parser.ts         # XML → ConfigModel parser (fast-xml-parser)
│   └── xml-serializer.ts     # ConfigModel → XML serializer (XMLBuilder)
├── store/
│   └── useEditorStore.ts     # Zustand-like global state (React hooks pattern)
├── components/
│   ├── Editor/
│   │   ├── Sidebar.tsx       # Left panel: import/export, room map, scenarios
│   │   ├── Canvas.tsx        # Center panel: room map image + draggable markers
│   │   └── PropertiesPanel.tsx  # Right panel: property editing per marker/scenario
│   └── common/
│       └── Button.tsx        # Reusable button component
├── example/
│   ├── config.xml            # Example XML with all three scenarios
│   └── room.jpg              # Example room map image
├── tests/
│   ├── lib/
│   │   ├── xml-parser.test.ts
│   │   └── xml-serializer.test.ts
│   └── ...
└── docs/
    └── superpowers/
        ├── specs/
        ├── plans/
        └── notes/
```

---

## Data Model (lib/types.ts)

### Core Interfaces

```typescript
interface Position {
  x: number;      // X coordinate in meters
  y: number;      // Y coordinate in meters (positive = North)
  z: number;      // Z coordinate in meters
  rotX: number;   // Rotation on X axis in degrees
  rotY: number;   // Rotation on Y axis in degrees
  rotZ: number;   // Rotation on Z axis in degrees
}

interface RoomConfig {
  width: number;   // Room width in meters (X-axis)
  depth: number;   // Room depth/length in meters (Y-axis) — maps to XML "height"
  height: number;  // Room height in meters (Z-axis) — for future use
  originX: number; // Origin offset X
  originY: number; // Origin offset Y
  originZ: number; // Origin offset Z
}

interface Source {
  id: string;
  isLocked?: boolean;
  filePath?: string;
  position: Position;
}

interface Receiver {
  id: string;
  isLocked?: boolean;
  fileNames: string[];  // Multi-channel audio file paths
  position: Position;
}

interface Scenario {
  id: string;
  name: string;
  locked: 'source' | 'receiver' | 'none';
  lockedSources: Source[];      // Fixed sources at scenario root
  lockedReceivers: Receiver[];  // Fixed receivers at scenario root
  sources: Source[];            // Movable sources (wrapped in <sources>)
  receivers: Receiver[];        // Movable receivers (wrapped in <receivers>)
}

interface ConfigModel {
  room: RoomConfig;
  info: InfoText;
  scenarios: Scenario[];
}

interface InfoText {
  data: string;
  micElevation?: number;        // Microphone elevation in meters
  micModel?: string;            // Microphone model and type
  spkElevation?: number;        // Speaker elevation in meters
  spkModel?: string;            // Speaker model and type
  irMethod?: 'sineSweep' | 'clap';  // Impulse response measurement method
  sweepDuration?: number;       // Sine sweep duration in seconds
  sweepFreqStart?: number;      // Sine sweep starting frequency in Hz
  spaceMaterials?: string;      // Description of room/space materials
  roomGeometry?: string;        // Description of space shape and dimensions
}

type BulkLoadTarget = 'sources' | 'receivers';

interface GridSettings {
  snapToGrid: boolean;
  gridSize: number;      // in meters
  showGrid: boolean;
}
```

### ID Convention

All marker IDs follow the format: `<scenarioId>::<itemId>`

Example: `"scen_abc123::src_def456"`

This convention allows the PropertiesPanel to determine which scenario a selected marker belongs to by splitting on `::`.

---

## State Management (store/useEditorStore.ts)

### EditorState Interface

```typescript
interface EditorState {
  config: ConfigModel | null;
  roomMapImage: File | null;
  roomMapPreviewUrl: string | null;
  selectedScenarioId: string | null;
  selectedMarkerId: string | null;
  dragRoomPos: { x: number; y: number } | null;
  dragState: {
    isDragging: boolean;
    draggedMarkerId: string | null;
    startMouseX: number;
    startMouseY: number;
    isLocked: boolean;
  } | null;
  gridSettings: GridSettings;
  scaleFactor?: number | null;
  setScaleFactor?: (value: number | null) => void;
}
```

### Key State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `config` | `ConfigModel \| null` | Current parsed config data |
| `roomMapPreviewUrl` | `string \| null` | Blob URL for displaying uploaded room map |
| `selectedScenarioId` | `string \| null` | Currently active scenario (filters canvas markers) |
| `selectedMarkerId` | `string \| null` | Currently selected marker (shows properties) |
| `dragRoomPos` | `{x,y} \| null` | Live room coordinates during drag |
| `dragState` | `{isDragging, draggedMarkerId, startMouseX, startMouseY, isLocked} \| null` | Drag state for UI feedback; `isLocked` indicates if the dragged marker is a locked scenario marker |
| `gridSettings` | `GridSettings` | Grid settings: snapToGrid, gridSize (meters), showGrid — persisted in localStorage |
| `scaleFactor` | `number | null` | Manual image scale factor (meters per pixel) — set via scale tool |

### localStorage Key

```typescript
const STORAGE_KEY = 'room-z-preset-maker';
```

Auto-saves `config` to localStorage on every change.

### Key Store Methods

| Method | Purpose |
|--------|---------|
| `loadXML(xmlString)` | Parse XML → ConfigModel, automatically switches to RoomZ mode |
| `exportFile()` | Serialize → XML blob, triggers browser download |
| `addScenario(name?)` | Create new scenario with default name |
| `deleteScenario(id)` | Remove scenario from config |
| `updateScenario(id, updates)` | Update name or locked type |
| `addSource(scenarioId, position?)` | Add source at center or given position |
| `removeSource(scenarioId, sourceId)` | Remove source |
| `addReceiver(scenarioId, position?, fileNames?)` | Add receiver |
| `removeReceiver(scenarioId, receiverId)` | Remove receiver |
| `updatePosition(scenarioId, markerId, positionData)` | Update position of any marker |
| `updateLockedPosition(scenarioId, markerId, positionData)` | Update locked source/receiver position (called when dragging locked markers on canvas) |
| `updateFilePaths(scenarioId, receiverId, fileNames)` | Update receiver channel file paths |
| `loadRoomMap(file)` | Load room map image (create blob URL) or clear image (if file.size === 0) |
| `bulkLoad(scenarioId, target, lines)` | Bulk import from CSV text |
| `setRoom(room)` | Update room dimensions/origin |
| `setInfo(info)` | Update info text |
| `clearAll()` | Clear everything including localStorage |
| `setSelectedScenarioId(id)` | Select scenario |
| `setSelectedMarkerId(id)` | Select marker |
| `setDragRoomPos(pos)` | Update live drag position |
| `setDragState(state)` | Update drag state |
| `setSnapToGrid(val)` | Enable/disable grid snapping |
| `setGridSize(size)` | Set grid size in meters |
| `setShowGrid(val)` | Show/hide grid overlay |
| `setScaleFactor(value)` | Set manual image scale factor (meters per pixel) |

---

## Coordinate System

### Image Scaling

The image is scaled using a manual scale tool. The user clicks two points on the image and enters the real-world distance in meters. The scale factor is calculated as:

```typescript
const pixelDist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
const scaleFactor = meters / pixelDist;  // meters per pixel
```

The scale factor is applied to all marker positioning and drag coordinate calculations. The formula is inverted for display: `pixels / meters` for intuitive understanding.

### Center Origin Mode (Default)

- **Origin:** Center of the room (`originX`, `originY`)
- **Room bounds:** X: `originX - width/2` to `originX + width/2`, Y: `originY - depth/2` to `originY + depth/2`
- **Y positive:** Points toward North (top of canvas)
- **Y negative:** Points toward South (bottom of canvas)

### Pixel-to-Coordinate Mapping

With manual image scaling, the pixel-to-coordinate mapping uses the scale factor:

```typescript
// With scale factor (meters per pixel):
const imgWidth = room.width * pxPerMeter;
const imgHeight = room.depth * pxPerMeter;
const imgOffsetX = (canvasWidth - imgWidth) / 2;
const imgOffsetY = (canvasHeight - imgHeight) / 2;

// Canvas pixel → Room coordinate
const px = relX - imgWidth / 2 - imgOffsetX;
const py = relY - imgHeight / 2 - imgOffsetY;
const effectiveOriginX = room.originX + room.width / 2;
const effectiveOriginY = room.originY + room.depth / 2;
const roomX = px / pxPerMeter + effectiveOriginX;
const roomY = -py / pxPerMeter + effectiveOriginY;

// Room coordinate → Canvas pixel
const px = (markerX - effectiveOriginX + room.width / 2) * pxPerMeter + imgWidth / 2 + imgOffsetX;
const py = -(markerY - effectiveOriginY + room.depth / 2) * pxPerMeter + imgHeight / 2 + imgOffsetY;
```

Without scale factor (fallback):
```typescript
// Canvas pixel → Room coordinate
const pixelsPerX = canvasWidth / room.width;
const pixelsPerY = canvasHeight / room.depth;
const effectiveOriginX = room.originX + room.width / 2;
const effectiveOriginY = room.originY + room.depth / 2;
const roomX = (relX - canvasWidth / 2) / pixelsPerX + effectiveOriginX;
const roomY = -(relY - canvasHeight / 2) / pixelsPerY + effectiveOriginY;

// Room coordinate → Canvas pixel
const px = (markerX - effectiveOriginX + room.width / 2) * pixelsPerX + canvasWidth / 2;
const py = -(markerY - effectiveOriginY + room.depth / 2) * pixelsPerY + canvasHeight / 2;
```

### Grid Scaling

The grid overlay renders as a CSS `backgroundImage` with gradients. Grid spacing scales with the image scale factor:

```typescript
// 1. pxPerMeter — how many CSS pixels = 1 meter
pxPerMeterX = containerWidth / roomWidth
pxPerMeterY = containerHeight / roomDepth

// 2. Grid line spacing in pixels
gridPxX = gridSize * pxPerMeterX
gridPxY = gridSize * pxPerMeterY

// 3. Origin position in container (where room's logical origin sits)
imgOffsetX = (containerWidth - roomWidth * pxPerMeterX) / 2
effectiveOriginX = room.originX + room.width / 2
originX = imgOffsetX + (effectiveOriginX - room.originX + room.width / 2) * pxPerMeterX

// 4. Align grid lines with snap positions
gridOffsetX = originX % gridPxX
gridOffsetY = originY % gridPxY

// 5. CSS rendering
backgroundSize: ${gridPxX}px ${gridPxY}px
backgroundPosition: ${gridOffsetX}px ${gridOffsetY}px
```

**Key point:** The grid uses the same `pxPerMeter` as the markers, so they align. The `object-contain` scaling of the `<img>` doesn't affect the grid because `pxPerMeter` is calculated from the *rendered* image dimensions (via `onLoad`), which already includes the CSS scaling.

**Default scale:** When no manual scale is set, the room is fitted to the container with 5% padding:
```typescript
const defaultScale = Math.min(containerWidth / roomWidth, containerHeight / roomDepth) * 0.95;
```

---

## Component Architecture

### Page (app/page.tsx)

**Role:** Layout orchestrator

- Calls `useEditorStore()` once
- Passes all state and methods as props to all three panels via spread (`{...state}`)
- Provides `dragRoomPos` and `draggedMarkerId` to PropertiesPanel with null coalescing

**Layout:**
- Desktop: Three columns (Sidebar | Canvas | PropertiesPanel)
- Mobile: Stacked vertically

### Sidebar (components/Editor/Sidebar.tsx)

**Role:** Configuration and file operations

**Sections:**
1. **Header Toolbar:** Import XML, Export XML, Clear All
2. **Room Map:** File input for room map image (JPG/PNG/WebP) with drag-and-drop support
3. **Room Dimensions:** Width, Length (Y-axis), Height (Z-axis) inputs — all in a 3-column grid; Origin X/Y/Z also in a 3-column grid
4. **Acoustic Metadata:** Collapsible section with all metadata fields (mic/spk elevation, model/type, IR method, sweep settings, space materials, geometry, and Space Info)
6. **Bulk Load:** CSV textarea for bulk importing positions
6. **Scenarios:** List with selection, locked mode badges (S/R), source/receiver counts, delete buttons
7. **Add Scenario:** Button to create new scenario

**PropertiesPanel (Right Panel) Layout when no marker selected:**
- **Sources:** Combined list of all sources (locked sources first, then moving sources) under a single "Sources" header
- **Receivers:** Moving receivers under a "Receivers" header
- **Add buttons:** "+ Add Source" and "+ Add Receiver" at the bottom

**State:**
- `bulkTarget`: `'sources' | 'receivers'` — which type to bulk-load
- `bulkText`: String — raw CSV input
- `room`: Partial<RoomConfig> — temporary room state before commit
- `infoData`: String — temporary info text before commit
- `acousticData`: Partial<InfoText> — temporary acoustic metadata before commit
- `isAcousticCollapsed`: boolean — whether the acoustic metadata section is collapsed
- `localRoomMapPreviewUrl`: String | null — synced with store's roomMapPreviewUrl
- `localRoomMapImage`: File | null — synced with store's roomMapImage

**Acoustic Metadata Section**

A collapsible section containing all metadata fields:
- **Mic Elevation (m):** Number input for microphone height
- **Mic Model/Type:** Text input for microphone identification
- **Spk Elevation (m):** Number input for speaker height
- **Spk Model/Type:** Text input for speaker identification
- **IR Method:** Radio button selection ("Sine Sweep" or "Clap")
- **Sweep Duration (s):** Number input (visible when IR Method = Sine Sweep)
- **Sweep Freq Start (Hz):** Number input (visible when IR Method = Sine Sweep)
- **Space Materials:** Textarea for room materials description
- **Space Geometry:** Textarea for room shape/dimensions description
- **Space Info:** Free-form text area (moved from standalone section into accordion)

The section is collapsed by default and expands when the header is clicked.

**Key refs:**
- `xmlInputRef`: Hidden file input for XML import
- `roomMapInputRef`: Hidden file input for room map upload

**Room Map behavior:**
- Supports both click-to-browse and drag-and-drop for image files
- After loading, shows "Image loaded on canvas" with an X button to remove (right-aligned)
- The preview image is not displayed in the sidebar (shown on canvas instead)
- `loadRoomMap(new File([''], '', { type: 'image/png' }))` clears the image (empty file triggers clear)

### Canvas (components/Editor/Canvas.tsx)

**Role:** Visual marker placement and dragging

**Image display:**
- Uses standard `<img>` tag (not Next.js `next/image`) to avoid blob URL validation issues and keep lint clean
- Captures natural image dimensions via `onLoad` event (`img.naturalWidth`, `img.naturalHeight`)
- Image is centered within the container based on aspect ratio

**Scale tool:**
- "Set Scale" button in toolbar activates scale mode
- User clicks two points on the image to define a known distance
- Input field for entering the real-world distance in meters
- Scale factor = pixels / meters (stored in `scaleFactor` state)
- Scale persists until cleared; points are removed when "Done" is pressed
- Scale factor is applied to all marker positioning and drag coordinate calculation

**State (refs for drag):**
```typescript
const dragRef = useRef<{ isDragging: boolean; draggedMarkerId: string | null; startMouseX: number; startMouseY: number; isLocked: boolean } | null>(null);
const dragRoomRef = useRef<{ x: number; y: number } | null>(null);
const mouseUpRef = useRef<(() => void) | null>(null);
const didDrag = useRef(false);
```

**State (React state for drag - updated in render):**
```typescript
const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
const [isDragging, setIsDragging] = useState(false);
const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
```

These React state variables are updated in `handleMouseMove` alongside ref-based tracking, ensuring the latest drag position is available during render for accurate marker positioning.

**State (scale tool):**
```typescript
const [scaleMode, setScaleMode] = useState<'off' | 'firstPoint' | 'secondPoint' | 'done'>('off');
const [scalePoint1, setScalePoint1] = useState<{ x: number; y: number } | null>(null);
const [scalePoint2, setScalePoint2] = useState<{ x: number; y: number } | null>(null);
const [knownDistance, setKnownDistance] = useState<string>('');
const [scaleFactor, setScaleFactor] = useState<number | null>(null);
```

**Key functions:**

| Function | Purpose |
|----------|---------|
| `getPixelsPerMeter(room, imgNaturalWidth, imgNaturalHeight)` | Calculates pixels per meter for scaling |
| `getMarkerCenterPx(markerX, markerY, room, canvasWidth, canvasHeight, pxPerMeter)` | Converts room coordinates to CSS `left`/`top` percentages using scale factor |
| `handleMouseMove(e)` | Updates drag state and live room position during drag, uses scale factor |
| `handleMouseUp()` | Commits final position, removes event listeners |
| `handleMouseDown(markerId, scenarioId)` | Starts drag, selects marker, adds event listeners |
| `handleAddSource()` | Adds source at room center |
| `handleAddReceiver()` | Adds receiver at room center |

**Canvas toolbar buttons:**
- **"Set Scale"**: Activates scale mode for manual image scaling
- **"Snap to Grid"** toggle: Enable/disable grid snapping
- **"Grid Size"** input: Set grid spacing in meters (default 0.5)
- **"Show Grid"** toggle: Show/hide grid overlay

**Scale mode UI:**
- Appears below toolbar buttons when scale mode is active
- Shows prompt: "Click first point" → "Click second point" → input field with "Apply"/"Reset"/"Done" buttons
- Red dot for first point, blue dot for second point, dashed white in second point selection

**Grid overlay:**
- Rendered as CSS `backgroundImage` with linear gradients
- Grid size in meters (default 0.5m), scales with image scale factor
- Grid lines aligned to snap positions using modulo of origin position
- Visible in both light and dark modes (gray `rgba(100, 100, 100, 0.6)`)
- Toggle via toolbar button, size via input field
- Uses same `pxPerMeter` as markers for alignment

**Marker rendering:**
- All markers use indexed labels (S1,S2, R1, R2) based on array position (1-based)
- Locked sources: Orange circle (`#f59e0b`), 26px diameter, 14px font
- Locked receivers: Blue circle (`#3b82f6`), 24px diameter, 12px font
- Moving sources: Orange-red circle (`#f97316`), 26px diameter, 14px font
- Moving receivers: Blue circle (`#3b82f6`), 24px diameter, 12px font
- Selected markers: White ring + colored ring (box-shadow)
- Markers are rendered using direct state access (no IIFE wrappers) for cleaner JSX and proper React reactivity

**Drag behavior:**
- All markers are freely draggable regardless of locked state
- Locked markers update their stored position when dragged (via `updateLockedPosition`)
- Non-locked markers update their stored position (via `updatePosition`)
- Drag threshold: 3px — must move more than 3px to count as drag vs click
- Drag position is tracked via both refs (for event handlers) and React state (for render) to ensure markers follow cursor correctly

**Selection behavior:**
- Clicking a marker selects it (no toggle)
- Clicking canvas background unselects all
- Each marker `onClick` has `e.stopPropagation()` to prevent bubbling
- `didDrag` ref prevents selection after drag (click-to-drag conflict)

### PropertiesPanel (components/Editor/PropertiesPanel.tsx)

**Role:** Edit properties of selected marker or all markers

**Scenario settings:** Includes a "Locked Type" dropdown that allows setting the scenario's locked mode (`source`, `receiver`, or `none`) as metadata for XML export.

**Layout when no marker is selected:**
- All sources (locked + moving) are displayed under a single "Sources" header in one unified section
- Moving receivers are displayed under a "Receivers" header
- Locked sources appear before moving sources within the combined section
- Each locked source uses `LockedSourceCard` (yellow-tinted, no remove button)
- Each moving source uses `MovingSourceCard` (white, with remove button)

**Input props:**
```typescript
interface PropertiesPanelProps {
  config: ConfigModel | null;
  selectedScenarioId: string | null;
  selectedMarkerId: string | null;
  dragRoomPos: { x: number; y: number } | null;
  draggedMarkerId: string | null;
  updateScenario: (id, updates) => void;
  addSource: (scenarioId, position?) => void;
  removeSource: (scenarioId, sourceId) => void;
  addReceiver: (scenarioId, position?, fileNames?) => void;
  removeReceiver: (scenarioId, receiverId) => void;
  updatePosition: (scenarioId, markerId, positionData) => void;
  updateFilePaths: (scenarioId, receiverId, fileNames) => void;
}
```

**Marker type detection:**
```typescript
// Split selectedMarkerId on "::" to get scenarioId and markerId
// Check if markerId exists in lockedSources, lockedReceivers, sources, or receivers
// Set markerType = 'source' or 'receiver'
```

**Live drag display:**
- Shows `X: {x.toFixed(2)}m, Y: {y.toFixed(2)}m, Z: {z.toFixed(2)}m | Rot X: {rx.toFixed(2)}°, Rot Y: {ry.toFixed(2)}°, Rot Z: {rz.toFixed(2)}°`
- Uses `dragRoomPos` for live X/Y, keeps stored Z and all rotations

**Rounding:** All numeric values rounded to 2 decimal places via `Math.round(val * 100) / 100`

**Card types:**
- `LockedSourceCard` — Yellow-tinted, no remove button
- `LockedReceiverCard` — Blue-tinted, no remove button
- `MovingSourceCard` — White, has remove button
- `MovingReceiverCard` — White, has remove button + channel file inputs

---

## XML Format

### Room Element Mapping

The XML `<room>` element uses `height` to represent the Y-axis/depth dimension (not the Z-axis height):

| Internal Field | XML Attribute | Description |
|----------------|---------------|-------------|
| `width` | `width` | X-axis dimension |
| `depth` | `height` | Y-axis/length dimension |
| `height` | *(not exported)* | Z-axis/height — reserved for future use |

**Import:** XML `height` → internal `depth`
**Export:** Internal `depth` → XML `height`
**Import:** XML `width` → internal `width`
**Export:** Internal `width` → XML `width`

The internal `height` field (Z-axis) is preserved in the interface but not yet used in XML serialization.

### Parser Configuration

```typescript
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '_',
  isArray: (_tagName) => true,  // All tags become arrays
});
```

All XML attributes are prefixed with `_` (e.g., `width` → `_width`).
All elements are normalized to arrays (single element → `[element]`).

### Source Attributes

| Attribute | Format |
|-----------|--------|
| `_src_x` | Float (meters) |
| `_src_y` | Float (meters) |
| `_src_z` | Float (meters) |
| `rot_x` | Float (degrees) |
| `rot_y` | Float (degrees) |
| `rot_z` | Float (degrees) |
| `_file_name` | String (file path) |

### Receiver Attributes

| Attribute | Format |
|-----------|--------|
| `_rcv_x` | Float (meters) |
| `_rcv_y` | Float (meters) |
| `_rcv_z` | Float (meters) |
| `rot_x` | Float (degrees) |
| `rot_y` | Float (degrees) |
| `rot_z` | Float (degrees) |
| `_file_name` | String (single channel) |
| `_file_name_1`, `_file_name_2`, ... | String (multi-channel) |

### Scenario Patterns

**Parser notes:** The XML parser handles both singular (`lockedSource`/`lockedReceiver`) and plural (`lockedSources`/`lockedReceivers`) attribute names for backward compatibility with existing XML files.

**1. Locked source at scenario root:**
```xml
<scenario name="Scenario 1" locked="source">
  <source src_x="..." src_y="..." src_z="..." rot_z="..." rot_y="..." rot_x="..."/>
</scenario>
```

**2. Locked source at scenario root + movable sources/receivers:**
```xml
<scenario name="Scenario 2" locked="source">
  <source src_x="..." src_y="..." src_z="..." rot_z="..." rot_y="..." rot_x="..."/>
  <sources>
    <source _src_x="..." _src_y="..." _src_z="..." _rot_x="..." _rot_y="..." _rot_z="..."/>
  </sources>
  <receivers>
    <receiver _rcv_x="..." _rcv_y="..." _rcv_z="..." rot_z="..." rot_y="..." rot_x="..."/>
  </receivers>
</scenario>
```

**3. Locked receiver at scenario root:**
```xml
<scenario name="Scenario 3" locked="receiver">
  <receiver rcv_x="..." rcv_y="..." rcv_z="..." rot_z="..." rot_y="..." rot_x="..."/>
  <sources>
    <source _src_x="..." _src_y="..." _src_z="..." _rot_x="..." _rot_y="..." _rot_z="..."/>
  </sources>
  <receivers>
    <receiver _rcv_x="..." _rcv_y="..." _rcv_z="..." rot_z="..." rot_y="..." rot_x="..." file_name="..."/>
  </receivers>
</scenario>
```

**4. Multiple locked sources (numbered):**
```xml
<scenario name="Scenario 4" locked="source">
  <source_1 src_x="..." src_y="..." src_z="..." rot_z="..." rot_y="..." rot_x="..."/>
  <source_2 src_x="..." src_y="..." src_z="..." rot_z="..." rot_y="..." rot_x="..."/>
  <sources>...</sources>
  <receivers>...</receivers>
</scenario>
```

**5. Multiple locked receivers (numbered):**
```xml
<scenario name="Scenario 5" locked="receiver">
  <receiver_1 rcv_x="..." rcv_y="..." rcv_z="..." rot_z="..." rot_y="..." rot_x="..."/>
  <receiver_2 rcv_x="..." rcv_y="..." rcv_z="..." rot_z="..." rot_y="..." rot_x="..."/>
  <sources>...</sources>
  <receivers>...</receivers>
</scenario>
```

### Info Element Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `data` | string | Free-form info text |
| `mic_elevation` | float | Microphone elevation in meters |
| `mic_model` | string | Microphone model and type |
| `spk_elevation` | float | Speaker elevation in meters |
| `spk_model` | string | Speaker model and type |
| `ir_method` | string | IR measurement method ("sineSweep" or "clap") |
| `sweep_duration` | float | Sine sweep duration in seconds |
| `sweep_freq_start` | float | Sine sweep starting frequency in Hz |
| `space_materials` | string | Room materials description |
| `space_geometry` | string | Room shape and dimensions description |

### Multi-channel Receivers

When there are multiple sources or locked sources:
- Each receiver gets `file_name_1`, `file_name_2`, etc.
- File path matrix: each receiver gets N file paths when there are N sources
- When only 1 source exists: uses `file_name` (singular)

---

## Bulk Load Format

CSV format, one line per marker:

```
x,y,z,rot_z,rot_y,rot_x
```

Example:
```
0.5, 1.2, 0.0, 45.0, 0.0, 90.0
-1.0, -2.5, 0.5, 0.0, 0.0, 0.0
```

Parsed in `Sidebar.handleBulkLoad`:
```typescript
const parts = line.split(',').map(Number);
return {
  x: parts[0] || 0,
  y: parts[1] || 0,
  z: parts[2] || 0,
  rotX: parts[5] ?? 0,
  rotY: parts[4] ?? 0,
  rotZ: parts[3] ?? 0,
};
```

---

## Key Implementation Details

### Drag State Architecture

**Why refs instead of store state?**

The drag state needs to be read synchronously during `mousemove` events. Using `useRef` avoids:
1. React's batching — `setState` in `mousemove` handler would batch updates
2. Closure staleness — `useEffect` conditions on `dragRef.current?.isDragging` don't re-trigger when ref changes
3. Event listener removal issues — `removeEventListener` needs the exact same function reference

**Why React state for drag position?**

The drag position must also be tracked in React state (`dragPosition`, `isDragging`, `draggedMarkerId`) to ensure the latest values are available during render. Reading from refs during render causes stale values (the ref-in-render anti-pattern). The ref is still used for event handler closure safety, but state is updated alongside it in `handleMouseMove` and read in the marker rendering logic.

**Event listener lifecycle:**
```
mousedown → assign handleMouseUp to mouseUpRef.current, add document 'mousemove' + 'mouseup' listeners
mousemove → update dragRef.current, setDragState(), setDragRoomPos(), setDragPosition()
mouseup → remove listeners, commit position to store, clear refs and state
```

### Selection Persistence

**Problem:** Clicking a marker would select it, but clicking again would deselect it.

**Solution:** Each marker's `onClick` calls `setSelectedMarkerId(markerId)` unconditionally (no toggle). Background click unselects via `setSelectedMarkerId(null)`.

### Center Origin (Default)

The origin is always centered on the room. The effective origin accounts for the offset between the room's logical origin and the image center:
```typescript
effectiveOriginX = room.originX + room.width / 2;
effectiveOriginY = room.originY + room.depth / 2;
// All coordinate conversions include ±room.width/2 or ±room.depth/2 adjustments
```

### XML Attribute Prefix Handling

`fast-xml-parser` uses `_` prefix for attributes. The parser handles both prefixed and unprefixed attributes via `getAttr()`:

```typescript
function getAttr(obj, key) {
  const val = obj[key];
  if (val !== undefined) return String(unwrap(val));
  const uKey = key.startsWith('_') ? key.slice(1) : `_${key}`;
  const uVal = obj[uKey];
  if (uVal !== undefined) return String(unwrap(uVal));
  return '';
}
```

This handles both `_src_x` and `src_x` attribute names.

### ID Generation

```typescript
function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
```

Combines random string + timestamp for uniqueness.

---

## File Paths

### Source File Path

- Single source or locked source: `file_name="path/to/file.wav"`
- Moving source in `<sources>`: `_file_name="path/to/file.wav"`

### Receiver File Paths

- Single channel: `file_name="path/to/file.wav"`
- Multi-channel: `file_name_1="path/to/file1.wav"`, `file_name_2="path/to/file2.wav"`, etc.

---

## Testing

### xml-parser.test.ts

Tests XML parsing for all three scenario patterns.

### xml-serializer.test.ts

Tests XML serialization round-trip: parse → serialize → parse should produce equivalent config.

---

## Future Considerations

1. **Undo/Redo:** Not implemented — could add command pattern to store
2. **Keyboard shortcuts:** Not implemented — could add global listener
3. **Drag threshold:** Currently 3px — could make configurable
4. **Grid snapping:** Implemented — snap positions aligned with grid lines using modulo of origin position
5. **Zoom/Pan:** Not implemented — canvas uses percentage-based positioning
6. **Dark mode:** Already supported via Tailwind `dark:` variants
7. **i18n:** Not implemented — all labels are English
 
 ---

## JSON Export/Import

The application supports exporting and importing the full editor state as JSON. This includes all config data, grid settings, and the manual image scale factor.

### Exported Data (v2)

```json
{
  "version": 2,
  "exportedAt": "2026-06-26T12:00:00.000Z",
  "config": { "room": {...}, "info": {...}, "scenarios": [...] },
  "gridSettings": { "snapToGrid": false, "gridSize": 1, "showGrid": false },
  "scaleFactor": null
}
```

### v2 Changes

v2 adds acoustic metadata fields to the `info` object:
- `micElevation`, `micModel`, `spkElevation`, `spkModel`
- `irMethod`, `sweepDuration`, `sweepFreqStart`
- `spaceMaterials`, `roomGeometry`

### Backward Compatibility

v1 files are still supported for import. Missing fields default to `undefined`.

### What is NOT exported

- **Room map image** ??The image is not embedded in the JSON. When importing, the user must re-upload the room map image separately.

### Important

**Every time a new piece of data is added to the editor state (new metadata, settings, or features), the JSON export/import feature must be updated to include it.** This ensures the JSON file remains a complete representation of the editor state and allows full restoration of all settings when importing.

---
