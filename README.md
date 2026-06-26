# IR Metadata Creator

A browser-based desktop application for creating and editing Roomz `config.xml` files. Place sources and receivers on a room map image with full 3D position and rotation control, organized into multiple scenarios.

---

## How to Use

### 1. Import or Start Fresh

Click **Import XML** in the sidebar to load an existing `config.xml` file, or start with a blank canvas.

### 2. Upload a Room Map

Upload a JPG, PNG, or WebP image of your room layout in the **Room Map** section of the sidebar. You can also drag and drop the image directly.

### 3. Set Room Dimensions

Enter your room's width, depth (Y-axis), and height (Z-axis) in meters. Set the origin offset if your room's coordinate system differs from the center.

### 4. Scale the Image (Optional)

Click **Set Scale** on the canvas toolbar, then click two points on the image and enter the real-world distance between them in meters. This gives accurate pixel-to-meter conversion.

### 5. Create a Scenario

Click **Add Scenario** in the sidebar. Choose whether the scenario has locked sources, locked receivers, or neither. Locked markers stay fixed while moving markers can be freely placed.

### 6. Add Sources & Receivers

- Click **+ Add Source** or **+ Add Receiver** in the Properties panel, or use the buttons on the canvas toolbar.
- New markers appear at the center of the room.
- **Drag** markers to position them on the room map.
- Select a marker to edit its position (X, Y, Z) and rotation (Rot X, Rot Y, Rot Z) in the Properties panel.

### 7. Set Properties

For each source or receiver:
- **Source:** Set the audio file path and 3D position/rotation.
- **Receiver:** Set multi-channel file paths and 3D position/rotation.

### 8. Export

Click **Export XML** in the sidebar to download the `config.xml` file.

---

## Features

- **Import/Export XML** — Load and save Roomz `config.xml` files
- **Import/Export JSON** — Save and restore full editor state including grid settings and scale factor
- **Drag-and-drop room map** — Upload images by browsing or dragging
- **Manual image scaling** — Define real-world distances on the image for accurate positioning
- **Grid overlay** — Show/hide grid lines with adjustable spacing (default 0.5m)
- **Snap to grid** — Align markers to grid positions
- **Multiple scenarios** — Each scenario can have locked sources/receivers plus movable markers
- **Bulk load** — Import multiple positions at once via CSV (format: `x,y,z,rot_z,rot_y,rot_x`)
- **Acoustic metadata** — Record microphone/speaker elevation, model/type, IR method, sweep settings, and room description
- **Dark mode** — Built-in dark theme support
- **Auto-save** — Editor state persists in the browser's local storage

---

## Known Issues

**Markers won't move:** If you can't drag a marker, refresh the page and try again. This is a known issue that will be fixed.

---

## License

MIT
