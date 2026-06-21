'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { ConfigModel, RoomConfig, Scenario, Position } from '@/lib/types';

interface EditorState {
  config: ConfigModel | null;
  roomMapImage: File | null;
  roomMapPreviewUrl: string | null;
  selectedScenarioId: string | null;
  selectedMarkerId: string | null;
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
  updateFilePaths: (scenarioId: string, receiverId: string, fileNames: string[]) => void;
  loadRoomMap: (file: File) => void;
  bulkLoad: (scenarioId: string, target: 'sources' | 'receivers', lines: Array<{ x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => void;
  setRoom: (room: RoomConfig) => void;
  setInfo: (info: { data: string }) => void;
  clearAll: () => void;
}

interface CanvasProps extends EditorState {}

function getMarkerCenterPx(
  markerX: number,
  markerY: number,
  room: RoomConfig | undefined,
  canvasWidth: number,
  canvasHeight: number,
): { left: string; top: string } {
  if (!room || canvasWidth === 0 || canvasHeight === 0) {
    return { left: '0%', top: '0%' };
  }
  const pixelsPerX = canvasWidth / room.width;
  const pixelsPerY = canvasHeight / room.height;
  const px = (markerX - room.originX) * pixelsPerX;
  const py = (markerY - room.originY) * pixelsPerY;
  return {
    left: `${(px / canvasWidth) * 100}%`,
    top: `${(py / canvasHeight) * 100}%`,
  };
}

function pxToRoom(
  mouseX: number,
  mouseY: number,
  containerEl: HTMLElement | null,
  room: RoomConfig | undefined,
): { x: number; y: number } | null {
  if (!containerEl || !room) return null;
  const rect = containerEl.getBoundingClientRect();
  const canvasWidth = rect.width;
  const canvasHeight = rect.height;
  const relX = mouseX - rect.left;
  const relY = mouseY - rect.top;
  const pixelsPerX = canvasWidth / room.width;
  const pixelsPerY = canvasHeight / room.height;
  return {
    x: (relX / canvasWidth) * room.width + room.originX,
    y: (relY / canvasHeight * room.height) + room.originY,
  };
}

function Canvas({
  config,
  roomMapPreviewUrl,
  selectedScenarioId,
  selectedMarkerId,
  addSource,
  removeSource,
  addReceiver,
  removeReceiver,
  updatePosition,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedMarkerId: string | null;
    startMouseX: number;
    startMouseY: number;
  }>({ isDragging: false, draggedMarkerId: null, startMouseX: 0, startMouseY: 0 });

  const room = config?.room;

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

  // Drag handlers using document-level events
  const handleMouseDown = useCallback(
    (markerId: string, scenarioId: string, currentX: number, currentY: number) => (
      e: React.MouseEvent
    ) => {
      e.preventDefault();
      setDragState({
        isDragging: true,
        draggedMarkerId: `${scenarioId}::${markerId}`,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
      });
    },
    [],
  );

  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragState((prev) => ({ ...prev, startMouseX: e.clientX, startMouseY: e.clientY }));
    };

    const handleMouseUp = () => {
      setDragState({ isDragging: false, draggedMarkerId: null, startMouseX: 0, startMouseY: 0 });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging]);

  // Compute current drag position in room coords
  const dragRoomPos = useMemo(() => {
    if (!dragState.isDragging || !containerRef.current || !room) return null;
    return pxToRoom(
      dragState.startMouseX,
      dragState.startMouseY,
      containerRef.current,
      room,
    );
  }, [dragState.isDragging, dragState.startMouseX, dragState.startMouseY, room]);

  const handleAddSource = useCallback(() => {
    if (!selectedScenarioId || !room) return;
    const centerX = room.originX + room.width / 2;
    const centerY = room.originY + room.height / 2;
    addSource(selectedScenarioId, { x: centerX, y: centerY, z: 0, rotX: 0, rotY: 0, rotZ: 0 });
  }, [selectedScenarioId, room, addSource]);

  const handleAddReceiver = useCallback(() => {
    if (!selectedScenarioId || !room) return;
    const centerX = room.originX + room.width / 2;
    const centerY = room.originY + room.height / 2;
    addReceiver(selectedScenarioId, { x: centerX, y: centerY, z: 0, rotX: 0, rotY: 0, rotZ: 0 });
  }, [selectedScenarioId, room, addReceiver]);

  const selectedScenario = config?.scenarios.find((s) => s.id === selectedScenarioId);
  const isLockedSource = (id: string) =>
    !!selectedScenario?.lockedSources.find((s) => s.id === id);
  const isLockedReceiver = (id: string) =>
    !!selectedScenario?.lockedReceivers.find((r) => r.id === id);

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
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
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
        </div>
      )}

      {/* Canvas container */}
      <div ref={containerRef} className="relative w-full h-full">
        {/* Room map image */}
        {roomMapPreviewUrl && (
          <img
            src={roomMapPreviewUrl}
            alt="Room map"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}

        {/* Grid overlay */}
        {room && (
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="canvas-grid" width="25%" height="25%" patternUnits="objectBoundingBox">
                <rect x="0.75" y="0" width="0.25" height="1" fill="white" />
                <rect x="0" y="0.75" width="1" height="0.25" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#canvas-grid)" />
          </svg>
        )}

        {/* Markers */}
        {selectedScenario && room && (
          <>
            {/* Locked sources */}
            {selectedScenario.lockedSources.map((source) => {
              const pos = getMarkerCenterPx(
                source.position.x,
                source.position.y,
                room,
                containerSize.width,
                containerSize.height,
              );
              return (
                <div
                  key={source.id}
                  className="absolute flex items-center justify-center rounded-full text-white font-bold select-none"
                  style={{
                    left: pos.left,
                    top: pos.top,
                    width: '32px',
                    height: '32px',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: '#f59e0b',
                    fontSize: '16px',
                  }}
                >
                  🔊
                </div>
              );
            })}

            {/* Locked receivers */}
            {selectedScenario.lockedReceivers.map((receiver) => {
              const pos = getMarkerCenterPx(
                receiver.position.x,
                receiver.position.y,
                room,
                containerSize.width,
                containerSize.height,
              );
              return (
                <div
                  key={receiver.id}
                  className="absolute flex items-center justify-center rounded-full text-white font-bold select-none"
                  style={{
                    left: pos.left,
                    top: pos.top,
                    width: '24px',
                    height: '24px',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: '#3b82f6',
                    fontSize: '12px',
                  }}
                >
                  R
                </div>
              );
            })}

            {/* Sources */}
            {selectedScenario.sources.map((source) => {
              const isLocked = isLockedSource(source.id);
              if (isLocked) return null;
              const pos = getMarkerCenterPx(
                source.position.x,
                source.position.y,
                room,
                containerSize.width,
                containerSize.height,
              );
              const markerId = `${selectedScenarioId}::${source.id}`;
              const isSelected = selectedMarkerId === markerId;

              let finalX = source.position.x;
              let finalY = source.position.y;
              if (dragState.isDragging && dragState.draggedMarkerId === markerId && dragRoomPos) {
                finalX = dragRoomPos.x;
                finalY = dragRoomPos.y;
              }
              const newPos = getMarkerCenterPx(finalX, finalY, room, containerSize.width, containerSize.height);

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
                    backgroundColor: isLocked ? '#f59e0b' : '#f97316',
                    fontSize: '14px',
                    boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px #f97316' : undefined,
                  }}
                  onMouseDown={handleMouseDown(source.id, selectedScenarioId!, source.position.x, source.position.y)}
                  onClick={() => {
                    if (!dragState.isDragging) {
                      // Will be handled by the parent selection logic
                    }
                  }}
                >
                  S
                </div>
              );
            })}

            {/* Receivers */}
            {selectedScenario.receivers.map((receiver) => {
              const isLocked = isLockedReceiver(receiver.id);
              if (isLocked) return null;
              const pos = getMarkerCenterPx(
                receiver.position.x,
                receiver.position.y,
                room,
                containerSize.width,
                containerSize.height,
              );
              const markerId = `${selectedScenarioId}::${receiver.id}`;
              const isSelected = selectedMarkerId === markerId;

              let finalX = receiver.position.x;
              let finalY = receiver.position.y;
              if (dragState.isDragging && dragState.draggedMarkerId === markerId && dragRoomPos) {
                finalX = dragRoomPos.x;
                finalY = dragRoomPos.y;
              }
              const newPos = getMarkerCenterPx(finalX, finalY, room, containerSize.width, containerSize.height);

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
                  onMouseDown={handleMouseDown(receiver.id, selectedScenarioId!, receiver.position.x, receiver.position.y)}
                >
                  R
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
