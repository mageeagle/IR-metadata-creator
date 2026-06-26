'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import type { ConfigModel, RoomConfig, Position, GridSettings } from '@/lib/types';

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
  } | null;
  loadXML: (xmlString: string) => void;
  exportFile: () => unknown;
  addScenario: (name?: string) => void;
  deleteScenario: (id: string) => void;
  updateScenario: (id: string, updates: { name?: string; locked?: 'source' | 'receiver' | 'none' }) => void;
  addSource: (scenarioId: string, position?: Partial<Position>) => void;
  removeSource: (scenarioId: string, sourceId: string) => void;
  addReceiver: (scenarioId: string, position?: Partial<Position>, fileNames?: string[]) => void;
  removeReceiver: (scenarioId: string, receiverId: string) => void;
  updatePosition: (scenarioId: string, markerId: string, positionData: Partial<Position>) => void;
  updateLockedPosition: (scenarioId: string, markerId: string, positionData: Partial<Position>) => void;
  updateFilePaths: (scenarioId: string, receiverId: string, fileNames: string[]) => void;
  loadRoomMap: (file: File) => void;
  bulkLoad: (scenarioId: string, target: 'sources' | 'receivers', lines: Array<{ x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => void;
  setRoom: (room: RoomConfig) => void;
  setInfo: (info: { data: string }) => void;
  clearAll: () => void;
  setSelectedScenarioId: (id: string | null) => void;
  setSelectedMarkerId: (id: string | null) => void;
  setDragRoomPos: (pos: { x: number; y: number } | null) => void;
  setDragState: (state: Partial<{ isDragging: boolean; draggedMarkerId: string | null; startMouseX: number; startMouseY: number }> | null) => void;
  gridSettings: GridSettings;
  setSnapToGrid: (snapToGrid: boolean) => void;
  setGridSize: (gridSize: number) => void;
  setShowGrid: (showGrid: boolean) => void;
  onJsonImported?: () => void;
}

function getPixelsPerMeter(room: RoomConfig | undefined, imgNaturalWidth: number, imgNaturalHeight: number): { pxPerMeterX: number; pxPerMeterY: number } {
  if (!room || !isFinite(room.width) || !isFinite(room.depth) || room.width <= 0 || room.depth <= 0) {
    return { pxPerMeterX: 0, pxPerMeterY: 0 };
  }
  return {
    pxPerMeterX: imgNaturalWidth / room.width,
    pxPerMeterY: imgNaturalHeight / room.depth,
  };
}

function getMarkerCenterPx(
  markerX: number,
  markerY: number,
  room: RoomConfig | undefined,
  canvasWidth: number,
  canvasHeight: number,
  pxPerMeter: { pxPerMeterX: number; pxPerMeterY: number } | null,
): { left: string; top: string } {
  if (!room || !pxPerMeter || pxPerMeter.pxPerMeterX === 0 || pxPerMeter.pxPerMeterY === 0) {
    return { left: '0%', top: '0%' };
  }
  const effectiveOriginX = room.originX + room.width / 2;
  const effectiveOriginY = room.originY + room.depth / 2;
  const imgWidth = room.width * pxPerMeter.pxPerMeterX;
  const imgHeight = room.depth * pxPerMeter.pxPerMeterY;
  const imgOffsetX = (canvasWidth - imgWidth) / 2;
  const imgOffsetY = (canvasHeight - imgHeight) / 2;
  const px = (markerX - effectiveOriginX + room.width / 2) * pxPerMeter.pxPerMeterX + imgWidth / 2 + imgOffsetX;
  const py = -(markerY - effectiveOriginY + room.depth / 2) * pxPerMeter.pxPerMeterY + imgHeight / 2 + imgOffsetY;
  return {
    left: `${(px / canvasWidth) * 100}%`,
    top: `${(py / canvasHeight) * 100}%`,
  };
}

function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

function Canvas({
  config,
  roomMapPreviewUrl,
  selectedScenarioId,
  selectedMarkerId,
  dragRoomPos: storeDragRoomPos,
  dragState: storeDragState,
  addSource,
  addReceiver,
  updatePosition,
  updateLockedPosition,
  setSelectedMarkerId,
  setDragRoomPos,
  setDragState,
  gridSettings,
  setSnapToGrid,
  setGridSize,
  setShowGrid,
  onJsonImported,
}: EditorState) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [scaleMode, setScaleMode] = useState<'off' | 'firstPoint' | 'secondPoint' | 'done'>('off');
  const [scalePoint1, setScalePoint1] = useState<{ x: number; y: number } | null>(null);
  const [scalePoint2, setScalePoint2] = useState<{ x: number; y: number } | null>(null);
  const [knownDistance, setKnownDistance] = useState<string>('');
  const [scaleFactor, setScaleFactor] = useState<number | null>(null);
  const didDrag = useRef(false);
  const dragRef = useRef<{ isDragging: boolean; draggedMarkerId: string | null; startMouseX: number; startMouseY: number; isLocked: boolean } | null>(null);
  const dragRoomRef = useRef<{ x: number; y: number } | null>(null);
  const mouseUpRef = useRef<(() => void) | null>(null);

  const room = config?.room;
  const rawPxPerMeter = scaleFactor ? { pxPerMeterX: scaleFactor, pxPerMeterY: scaleFactor } : getPixelsPerMeter(room, imgNaturalSize?.width ?? 0, imgNaturalSize?.height ?? 0);
  const pxPerMeter = rawPxPerMeter.pxPerMeterX > 0 && rawPxPerMeter.pxPerMeterY > 0 ? rawPxPerMeter : (() => {
    if (!room || !isFinite(room.width) || !isFinite(room.depth) || room.width <= 0 || room.depth <= 0) return { pxPerMeterX: 1, pxPerMeterY: 1 };
    const pad = 0.95;
    const cx = containerSize.width * pad;
    const cy = containerSize.height * pad;
    const sx = cx / room.width;
    const sy = cy / room.depth;
    const s = Math.min(sx, sy);
    return { pxPerMeterX: s, pxPerMeterY: s };
  })();

  // Measure container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = Math.abs(e.clientX - drag.startMouseX);
      const dy = Math.abs(e.clientY - drag.startMouseY);
      if (dx > 3 || dy > 3) {
        didDrag.current = true;
      }
      drag.startMouseX = e.clientX;
      drag.startMouseY = e.clientY;
      setDragState(drag);
      const el = containerRef.current;
      if (el && room && room.width > 0 && room.depth > 0 && isFinite(room.width) && isFinite(room.depth)) {
        const rect = el.getBoundingClientRect();
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;
        if (canvasWidth > 0 && canvasHeight > 0) {
          const relX = e.clientX - rect.left;
          const relY = e.clientY - rect.top;
          const imgWidth = room.width * pxPerMeter.pxPerMeterX;
          const imgHeight = room.depth * pxPerMeter.pxPerMeterY;
          const imgOffsetX = (canvasWidth - imgWidth) / 2;
          const imgOffsetY = (canvasHeight - imgHeight) / 2;
          const px = relX - imgWidth / 2 - imgOffsetX;
          const py = relY - imgHeight / 2 - imgOffsetY;
          const effectiveOriginX = room.originX + room.width / 2;
          const effectiveOriginY = room.originY + room.depth / 2;
           const roomPos = { x: px / pxPerMeter.pxPerMeterX + effectiveOriginX - room.width / 2, y: -py / pxPerMeter.pxPerMeterY + effectiveOriginY - room.depth / 2 };
             if (gridSettings.snapToGrid) {
              roomPos.x = snapToGrid(roomPos.x, gridSettings.gridSize);
              roomPos.y = snapToGrid(roomPos.y, gridSettings.gridSize);
            }
           dragRoomRef.current = roomPos;
           setDragRoomPos(roomPos);
        } else {
          dragRoomRef.current = null;
          setDragRoomPos(null);
        }
      } else {
        dragRoomRef.current = null;
        setDragRoomPos(null);
      }
    },
    [room, setDragState, setDragRoomPos, pxPerMeter, gridSettings],
  );

  const handleMouseUp = useCallback(() => {
    const drag = dragRef.current;
    const roomPos = dragRoomRef.current;
    if (drag?.draggedMarkerId && roomPos) {
      const snappedX = gridSettings.snapToGrid ? snapToGrid(roomPos.x, gridSettings.gridSize) : roomPos.x;
      const snappedY = gridSettings.snapToGrid ? snapToGrid(roomPos.y, gridSettings.gridSize) : roomPos.y;
      const [sid, mid] = drag.draggedMarkerId.split('::');
      if (sid && mid) {
        if (drag.isLocked) {
          updateLockedPosition(sid, mid, { x: snappedX, y: snappedY });
        } else {
          updatePosition(sid, mid, { x: snappedX, y: snappedY });
        }
      }
    }
    didDrag.current = false;
    dragRef.current = null;
    dragRoomRef.current = null;
    setDragState(null);
    setDragRoomPos(null);
    document.removeEventListener('mousemove', handleMouseMove);
    if (mouseUpRef.current) {
      document.removeEventListener('mouseup', mouseUpRef.current);
    }
  }, [updatePosition, updateLockedPosition, setDragState, setDragRoomPos, handleMouseMove, gridSettings]);

  mouseUpRef.current = handleMouseUp;

  const handleJsonImported = useCallback(() => {
    setScaleFactor(null);
    if (onJsonImported) {
      onJsonImported();
    }
  }, [onJsonImported]);

  const selectedScenario = config?.scenarios.find((s) => s.id === selectedScenarioId);

  const handleMouseDown = useCallback(
    (markerId: string, scenarioId: string) => (
      e: React.MouseEvent
    ) => {
      e.preventDefault();
      didDrag.current = false;
      const fullId = `${scenarioId}::${markerId}`;
      const isLocked = !!selectedScenario?.lockedSources.find(s => s.id === markerId) ||
        !!selectedScenario?.lockedReceivers.find(r => r.id === markerId);
      dragRef.current = {
        isDragging: true,
        draggedMarkerId: fullId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        isLocked,
      };
      setDragState({ isDragging: true, draggedMarkerId: fullId, startMouseX: e.clientX, startMouseY: e.clientY });
      setSelectedMarkerId(fullId);
      setDragRoomPos(null);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', mouseUpRef.current!);
    },
    [setDragState, setDragRoomPos, handleMouseMove, handleMouseUp, setSelectedMarkerId, config, selectedScenarioId],
  );

  const handleAddSource = useCallback(() => {
    if (!selectedScenarioId || !room) return;
    const centerX = room.originX + room.width / 2;
    const centerY = room.originY + room.depth / 2;
    addSource(selectedScenarioId, { x: centerX, y: centerY, z: 0, rotX: 0, rotY: 0, rotZ: 0 });
  }, [selectedScenarioId, room, addSource]);

  const handleAddReceiver = useCallback(() => {
    if (!selectedScenarioId || !room) return;
    const centerX = room.originX + room.width / 2;
    const centerY = room.originY + room.depth / 2;
    addReceiver(selectedScenarioId, { x: centerX, y: centerY, z: 0, rotX: 0, rotY: 0, rotZ: 0 });
  }, [selectedScenarioId, room, addReceiver]);

  // Extract drag position outside render to avoid ref-in-render eslint error
  let dragX: number | null = null;
  let dragY: number | null = null;
  if (dragRef.current?.isDragging && dragRoomRef.current) {
    dragX = dragRoomRef.current.x;
    dragY = dragRoomRef.current.y;
  }

  if (!roomMapPreviewUrl && !room) {
    return (
      <main className="flex-1 min-w-0 bg-zinc-900 overflow-hidden relative">
        {/* Grid overlay */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.12]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="25%" height="25%" patternUnits="objectBoundingBox">
              <rect width="1" />
              <rect x="0.75" y="0" width="0.25" height="1" fill="white" />
              <rect x="0" y="0.75" width="1" height="0.25" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-sm text-zinc-500">Drop a room map in the sidebar to get started</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 bg-zinc-100 dark:bg-zinc-950 overflow-hidden relative">
      {/* Toolbar buttons */}
      {selectedScenarioId && (roomMapPreviewUrl || room) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 items-center">
          <button
            onClick={() => {
              setScaleMode('firstPoint');
              setScalePoint1(null);
              setScalePoint2(null);
              setKnownDistance('');
              setScaleFactor(null);
            }}
            className="px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded shadow hover:bg-green-700 transition-colors"
          >
            Set Scale
          </button>
          <button
            onClick={handleAddSource}
            disabled={!room}
            className="px-2.5 py-1 bg-orange-500 text-white text-xs font-medium rounded shadow hover:bg-orange-600 transition-colors disabled:opacity-40"
          >
            + Source
          </button>
          <button
            onClick={handleAddReceiver}
            disabled={!room}
            className="px-2.5 py-1 bg-blue-500 text-white text-xs font-medium rounded shadow hover:bg-blue-600 transition-colors disabled:opacity-40"
          >
            + Receiver
          </button>
          <button
            onClick={() => setSnapToGrid(!gridSettings.snapToGrid)}
            className={`px-2.5 py-1 text-xs font-medium rounded shadow transition-colors ${gridSettings.snapToGrid ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-600 text-white hover:bg-gray-700'}`}
          >
            Snap: {gridSettings.snapToGrid ? 'ON' : 'OFF'}
          </button>
          <input
            type="number"
            value={gridSettings.gridSize}
            onChange={(e) => setGridSize(parseFloat(e.target.value) || 1)}
            min={0.1}
            step={0.1}
            className="w-16 px-1.5 py-1 bg-gray-700 border border-gray-500 rounded text-xs text-white text-center"
          />
          <button
            onClick={() => setShowGrid(!gridSettings.showGrid)}
            className={`px-2.5 py-1 text-xs font-medium rounded shadow transition-colors ${gridSettings.showGrid ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-600 text-white hover:bg-gray-700'}`}
          >
            Grid: {gridSettings.showGrid ? 'ON' : 'OFF'}
          </button>
 
        </div>
      )}

      {/* Scale mode UI */}
      {scaleMode !== 'off' && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-300">
              {scaleMode === 'firstPoint' ? 'Click first point' : scaleMode === 'secondPoint' ? 'Click second point' : 'Click to reset'}
            </span>
            {scalePoint1 && scalePoint2 && scaleMode === 'secondPoint' && (
              <span className="text-xs text-zinc-400">
                ({Math.round(Math.sqrt(Math.pow(scalePoint2.x - scalePoint1.x, 2) + Math.pow(scalePoint2.y - scalePoint1.y, 2)))}px)
              </span>
            )}
            {scaleMode === 'done' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={knownDistance}
                  onChange={(e) => setKnownDistance(e.target.value)}
                  placeholder="Distance in meters"
                  className="w-20 px-1.5 py-0.5 bg-zinc-700 border border-zinc-500 rounded text-xs text-white placeholder-zinc-500"
                />
                <button
                  onClick={() => {
                    const dist = parseFloat(knownDistance);
                    if (dist > 0 && scalePoint1 && scalePoint2) {
                      const pixelDist = Math.sqrt(Math.pow(scalePoint2.x - scalePoint1.x, 2) + Math.pow(scalePoint2.y - scalePoint1.y, 2));
                      setScaleFactor(pixelDist / dist);
                      setScaleMode('done');
                    }
                  }}
                  className="px-1.5 py-0.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  Apply
                </button>
                <button
                  onClick={() => setScaleMode('secondPoint')}
                  className="px-1.5 py-0.5 bg-zinc-600 text-white text-xs rounded hover:bg-zinc-700"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    setScaleMode('off');
                    setScalePoint1(null);
                    setScalePoint2(null);
                  }}
                  className="px-1.5 py-0.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Canvas container */}
      <div ref={containerRef} className="relative w-full h-full" onClick={(e) => {
        if (scaleMode === 'firstPoint') {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          setScalePoint1({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setScaleMode('secondPoint');
        } else if (scaleMode === 'secondPoint') {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          setScalePoint2({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setScaleMode('done');
        } else {
          setSelectedMarkerId(null);
        }
      }}>
        {/* Room map image */}
        {roomMapPreviewUrl && (
          <div className="absolute inset-0 w-full h-full" style={{ pointerEvents: scaleMode !== 'off' ? 'none' : 'auto' }}>
            <img
              src={roomMapPreviewUrl}
              alt="Room map"
              className="absolute inset-0 w-full h-full object-contain"
              onClick={(e) => e.stopPropagation()}
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
              }}
            />
            {scalePoint1 && (
              <div
                className="absolute w-4 h-4 rounded-full bg-red-500 border-2 border-white pointer-events-none"
                style={{
                  left: `${(scalePoint1.x / containerSize.width) * 100}%`,
                  top: `${(scalePoint1.y / containerSize.height) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}
            {scalePoint2 && (
              <div
                className="absolute w-4 h-4 rounded-full bg-blue-500 border-2 border-white pointer-events-none"
                style={{
                  left: `${(scalePoint2.x / containerSize.width) * 100}%`,
                  top: `${(scalePoint2.y / containerSize.height) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}
            {scalePoint1 && scalePoint2 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line
                  x1={`${(scalePoint1.x / containerSize.width) * 100}%`}
                  y1={`${(scalePoint1.y / containerSize.height) * 100}%`}
                  x2={`${(scalePoint2.x / containerSize.width) * 100}%`}
                  y2={`${(scalePoint2.y / containerSize.height) * 100}%`}
                  stroke="white"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />
              </svg>
            )}
          </div>
        )}

        {/* Grid overlay */}
      {room && gridSettings.showGrid && containerSize.width > 0 && containerSize.height > 0 && (() => {
          const gridPxX = gridSettings.gridSize * pxPerMeter.pxPerMeterX;
          const gridPxY = gridSettings.gridSize * pxPerMeter.pxPerMeterY;
          const gridColor = 'rgba(100, 100, 100, 0.6)';
          const imgW = room.width * pxPerMeter.pxPerMeterX;
          const imgH = room.depth * pxPerMeter.pxPerMeterY;
          const imgOffsetX = (containerSize.width - imgW) / 2;
          const imgOffsetY = (containerSize.height - imgH) / 2;
          const effectiveOriginX = room.originX + room.width / 2;
          const effectiveOriginY = room.originY + room.depth / 2;
          const originX = imgOffsetX + (effectiveOriginX - room.originX + room.width / 2) * pxPerMeter.pxPerMeterX;
          const originY = imgOffsetY + (effectiveOriginY - room.originY + room.depth / 2) * pxPerMeter.pxPerMeterY;
          const gridOffsetX = originX % gridPxX;
          const gridOffsetY = originY % gridPxY;
          if (!isFinite(gridPxX) || !isFinite(gridPxY) || !isFinite(gridOffsetX) || !isFinite(gridOffsetY) || gridPxX <= 0 || gridPxY <= 0) return null;
          return (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
                backgroundSize: `${gridPxX}px ${gridPxY}px`,
                backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
              }}
            />
          );
        })()}

        {/* Markers */}
        {selectedScenario && room && (
          <>
            {/* Locked sources */}
            {selectedScenario.lockedSources.map((source, idx) => {
              const pos = getMarkerCenterPx(
                 source.position.x,
                 source.position.y,
                 room,
                 containerSize.width,
                 containerSize.height,
                 pxPerMeter,
               );
              const markerId = `${selectedScenarioId}::${source.id}`;
              const isSelected = selectedMarkerId === markerId;

              let finalX = source.position.x;
              let finalY = source.position.y;
              if (dragRef.current?.isDragging && dragRef.current.draggedMarkerId === markerId && dragRoomRef.current) {
                finalX = dragRoomRef.current.x;
                finalY = dragRoomRef.current.y;
              }
              const newPos = getMarkerCenterPx(finalX, finalY, room, containerSize.width, containerSize.height, pxPerMeter);

              return (
                <div
                  key={source.id}
                  className="absolute flex items-center justify-center rounded-full text-white font-bold select-none cursor-grab active:cursor-grabbing"
                  style={{
                    left: newPos.left,
                    top: newPos.top,
                    width: '26px',
                    height: '26px',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: '#f59e0b',
                    fontSize: '14px',
                    boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px #f59e0b' : undefined,
                  }}
                  onMouseDown={handleMouseDown(source.id, selectedScenarioId!)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!didDrag.current) {
                      setSelectedMarkerId(markerId);
                    }
                  }}
                >
                  S{idx + 1}
                </div>
              );
            })}

            {/* Locked receivers */}
           {selectedScenario.lockedReceivers.map((receiver, idx) => {
              const pos = getMarkerCenterPx(
                receiver.position.x,
                receiver.position.y,
                room,
                containerSize.width,
                containerSize.height,
                pxPerMeter,
              );
              const markerId = `${selectedScenarioId}::${receiver.id}`;
              const isSelected = selectedMarkerId === markerId;

              let finalX = receiver.position.x;
              let finalY = receiver.position.y;
              if (dragRef.current?.isDragging && dragRef.current.draggedMarkerId === markerId && dragRoomRef.current) {
                finalX = dragRoomRef.current.x;
                finalY = dragRoomRef.current.y;
              }
              const newPos = getMarkerCenterPx(finalX, finalY, room, containerSize.width, containerSize.height, pxPerMeter);

              return (
                <div
                  key={receiver.id}
                  className="absolute flex items-center justify-center rounded-full text-white font-bold select-none cursor-grab active:cursor-grabbing"
                  style={{
                    left: newPos.left,
                    top: newPos.top,
                    width: '24px',
                    height: '24px',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: '#3b82f6',
                    fontSize: '12px',
                    boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px #3b82f6' : undefined,
                  }}
                  onMouseDown={handleMouseDown(receiver.id, selectedScenarioId!)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!didDrag.current) {
                      setSelectedMarkerId(markerId);
                    }
                  }}
                >
                  R{idx + 1}
                </div>
              );
            })}

            {/* Sources */}
          {selectedScenario.sources.map((source, idx) => {
              const markerId = `${selectedScenarioId}::${source.id}`;
              const isSelected = selectedMarkerId === markerId;

              let finalX = source.position.x;
              let finalY = source.position.y;
              if (dragRef.current?.isDragging && dragRef.current.draggedMarkerId === markerId && dragRoomRef.current) {
                finalX = dragRoomRef.current.x;
                finalY = dragRoomRef.current.y;
              }
              const newPos = getMarkerCenterPx(finalX, finalY, room, containerSize.width, containerSize.height, pxPerMeter);

              return (
                <div
                  key={source.id}
                  className="absolute flex items-center justify-center rounded-full text-white font-bold select-none cursor-grab active:cursor-grabbing"
                  style={{
                    left: newPos.left,
                    top: newPos.top,
                    width: '26px',
                    height: '26px',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: '#f97316',
                    fontSize: '14px',
                    boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px #f97316' : undefined,
                  }}
                  onMouseDown={handleMouseDown(source.id, selectedScenarioId!)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!didDrag.current) {
                      setSelectedMarkerId(markerId);
                    }
                  }}
                >
                  S{idx + 1}
                </div>
              );
            })}

            {/* Receivers */}
          {selectedScenario.receivers.map((receiver, idx) => {
              const markerId = `${selectedScenarioId}::${receiver.id}`;
              const isSelected = selectedMarkerId === markerId;

              let finalX = receiver.position.x;
              let finalY = receiver.position.y;
              if (dragRef.current?.isDragging && dragRef.current.draggedMarkerId === markerId && dragRoomRef.current) {
                finalX = dragRoomRef.current.x;
                finalY = dragRoomRef.current.y;
              }
              const newPos = getMarkerCenterPx(finalX, finalY, room, containerSize.width, containerSize.height, pxPerMeter);

              return (
                <div
                  key={receiver.id}
                  className="absolute flex items-center justify-center rounded-full text-white font-bold select-none cursor-grab active:cursor-grabbing"
                  style={{
                    left: newPos.left,
                    top: newPos.top,
                    width: '24px',
                    height: '24px',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: '#3b82f6',
                    fontSize: '12px',
                    boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px #3b82f6' : undefined,
                  }}
                  onMouseDown={handleMouseDown(receiver.id, selectedScenarioId!)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!didDrag.current) {
                      setSelectedMarkerId(markerId);
                    }
                  }}
                >
                  R{idx + 1}
                </div>
              );
            })}
          </>
        )}
      </div>
    </main>
  );
}

export default Canvas;
