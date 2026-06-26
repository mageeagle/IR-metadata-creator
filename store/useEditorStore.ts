import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import type { ConfigModel, Source, Receiver, Position, BulkLoadTarget, RoomConfig, GridSettings } from '../lib/types';
import { parseConfigXML } from '../lib/xml-parser';
import { serializeConfigToXML } from '../lib/xml-serializer';
import { exportToJSON, importFromJSON } from '../lib/json-export';

const STORAGE_KEY = 'room-z-preset-maker';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

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
  gridSettings: GridSettings;
  scaleFactor: number | null;
}

function createEmptyConfig(): ConfigModel {
  return {
    room: { width: 4, depth: 4, height: 4, originX: 0, originY: 0, originZ: 0 },
    info: {
      data: '',
      micElevation: undefined,
      micModel: undefined,
      spkElevation: undefined,
      spkModel: undefined,
      irMethod: undefined,
      sweepDuration: undefined,
      sweepFreqStart: undefined,
      spaceMaterials: undefined,
      roomGeometry: undefined,
    },
    scenarios: [],
  };
}

function createEmptyPosition(): Position {
  return { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 };
}

export function useEditorStore() {
  const [state, setState] = useState<EditorState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedGrid = parsed.gridSettings as GridSettings | undefined;
        const savedScale = parsed.scaleFactor as number | null | undefined;
        const gridDefaults: GridSettings = { snapToGrid: false, gridSize: 1, showGrid: false };
        return { ...parsed, roomMapImage: null, roomMapPreviewUrl: null, gridSettings: savedGrid || gridDefaults, scaleFactor: savedScale ?? null };
      }
    } catch {
      // Ignore parse errors
    }
    return { config: null, roomMapImage: null, roomMapPreviewUrl: null, selectedScenarioId: null, selectedMarkerId: null, dragRoomPos: null, dragState: null, gridSettings: { snapToGrid: false, gridSize: 1, showGrid: false }, scaleFactor: null };
  });

  const saveToLocalStorage = useCallback((config: ConfigModel, gridSettings: GridSettings, scaleFactor: number | null) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ config, gridSettings, scaleFactor }));
    } catch {
      // Storage full or unavailable
    }
  }, []);

  const loadXML = useCallback((xmlString: string) => {
    try {
      const parsed = parseConfigXML(xmlString);

      const config: ConfigModel = {
        room: { width: parsed.room.width, depth: parsed.room.depth, height: parsed.room.height, originX: parsed.room.originX, originY: parsed.room.originY, originZ: parsed.room.originZ },
        info: {
          data: parsed.info.data ?? '',
          micElevation: parsed.info.micElevation,
          micModel: parsed.info.micModel,
          spkElevation: parsed.info.spkElevation,
          spkModel: parsed.info.spkModel,
          irMethod: parsed.info.irMethod as 'sineSweep' | 'clap' | undefined,
          sweepDuration: parsed.info.sweepDuration,
          sweepFreqStart: parsed.info.sweepFreqStart,
          spaceMaterials: parsed.info.spaceMaterials,
          roomGeometry: parsed.info.roomGeometry,
        },
        scenarios: parsed.scenarios.map((sc) => {
          const lockedSourcesArr: Array<Record<string, number>> = (sc.lockedSources as Array<Record<string, number>>) ?? [];
          const lockedSourceSingle = sc.lockedSource as Record<string, number> | undefined;
          const lockedSources: Source[] = (lockedSourcesArr.length > 0 ? lockedSourcesArr : (lockedSourceSingle ? [lockedSourceSingle] : []) as Array<Record<string, number>>).map((s) => {
            const srcX = parseFloat((s as Record<string, unknown>)?.['src_x'] as string) || 0;
            const srcY = parseFloat((s as Record<string, unknown>)?.['src_y'] as string) || 0;
            const srcZ = parseFloat((s as Record<string, unknown>)?.['src_z'] as string) || 0;
            const rotX = parseFloat((s as Record<string, unknown>)?.['rot_x'] as string) || 0;
            const rotY = parseFloat((s as Record<string, unknown>)?.['rot_y'] as string) || 0;
            const rotZ = parseFloat((s as Record<string, unknown>)?.['rot_z'] as string) || 0;
            return {
              id: generateId(),
              isLocked: true,
              position: { x: srcX, y: srcY, z: srcZ, rotX: rotX, rotY: rotY, rotZ: rotZ },
            };
          });

          const lockedReceivers: Receiver[] = ((sc.lockedReceiver ? [sc.lockedReceiver] : []) as Array<Record<string, number>>).map((r) => {
            const rcvX = parseFloat((r as Record<string, unknown>)?.['rcv_x'] as string) || 0;
            const rcvY = parseFloat((r as Record<string, unknown>)?.['rcv_y'] as string) || 0;
            const rcvZ = parseFloat((r as Record<string, unknown>)?.['rcv_z'] as string) || 0;
            const rotX = parseFloat((r as Record<string, unknown>)?.['rot_x'] as string) || 0;
            const rotY = parseFloat((r as Record<string, unknown>)?.['rot_y'] as string) || 0;
            const rotZ = parseFloat((r as Record<string, unknown>)?.['rot_z'] as string) || 0;
            return {
              id: generateId(),
              isLocked: true,
              fileNames: [],
              position: { x: rcvX, y: rcvY, z: rcvZ, rotX: rotX, rotY: rotY, rotZ: rotZ },
            };
          });

      const sources: Source[] = (sc.sources || []).map((s) => {
            const inner = (s as Record<string, unknown>)?.['source'];
            const sItem = Array.isArray(inner) ? inner[0] : (typeof inner === 'object' && inner !== null ? inner : s);
            const srcX = parseFloat((sItem as Record<string, unknown>)?.['_src_x'] as string) || 0;
            const srcY = parseFloat((sItem as Record<string, unknown>)?.['_src_y'] as string) || 0;
            const srcZ = parseFloat((sItem as Record<string, unknown>)?.['_src_z'] as string) || 0;
            const rotX = parseFloat((sItem as Record<string, unknown>)?.['_rot_x'] as string) || 0;
            const rotY = parseFloat((sItem as Record<string, unknown>)?.['_rot_y'] as string) || 0;
            const rotZ = parseFloat((sItem as Record<string, unknown>)?.['_rot_z'] as string) || 0;
            const filePath = (sItem as Record<string, unknown>)?.['_file_name'];
            return {
              id: generateId(),
              filePath: typeof filePath === 'string' ? filePath : (Array.isArray(filePath) && typeof filePath[0] === 'string' ? filePath[0] : undefined),
              position: { x: srcX, y: srcY, z: srcZ, rotX: rotX, rotY: rotY, rotZ: rotZ },
            };
          });

          const receivers: Receiver[] = (sc.receivers || []).map((r) => {
            const inner = (r as Record<string, unknown>)?.['receiver'];
            const rItem = Array.isArray(inner) ? inner[0] : (typeof inner === 'object' && inner !== null ? inner : r);
            const rcvX = parseFloat((rItem as Record<string, unknown>)?.['_rcv_x'] as string) || 0;
            const rcvY = parseFloat((rItem as Record<string, unknown>)?.['_rcv_y'] as string) || 0;
            const rcvZ = parseFloat((rItem as Record<string, unknown>)?.['_rcv_z'] as string) || 0;
            const rotX = parseFloat((rItem as Record<string, unknown>)?.['_rot_x'] as string) || 0;
            const rotY = parseFloat((rItem as Record<string, unknown>)?.['_rot_y'] as string) || 0;
            const rotZ = parseFloat((rItem as Record<string, unknown>)?.['_rot_z'] as string) || 0;
            const fileNames = Array.isArray((r as Record<string, unknown>)?.['_file_name']) ? (r as Record<string, unknown>)['_file_name'] as string[] : [(r as Record<string, unknown>)?.['_file_name'] as string ?? ''];
            return {
              id: generateId(),
              fileNames: fileNames.map(f => typeof f === 'string' ? f : String(f)),
              position: { x: rcvX, y: rcvY, z: rcvZ, rotX: rotX, rotY: rotY, rotZ: rotZ },
            };
          });

          return {
            id: generateId(),
            name: sc.name || '',
            locked: sc.locked || 'none',
            lockedSources,
            lockedReceivers,
            sources,
            receivers,
          };
        }),
      };

     setState(prev => ({
        ...prev,
        config,
        selectedScenarioId: null,
        selectedMarkerId: null,
      }));
    } catch (err) {
      console.error('Failed to parse XML:', err);
      setState(prev => ({ ...prev, config: createEmptyConfig() }));
    }
  }, []);

  const exportFile = useCallback(() => {
    if (!state.config) return;
    const xmlString = serializeConfigToXML(state.config);
    const blob = new Blob([xmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'room-z-preset.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.config]);

  const addScenario = useCallback((name?: string) => {
    setState(prev => {
      if (!prev.config) {
        const newConfig = createEmptyConfig();
        const newScenario = {
          id: generateId(),
          name: name || `Scenario ${1}`,
          locked: 'none' as const,
          lockedSources: [] as Source[],
          lockedReceivers: [] as Receiver[],
          sources: [] as Source[],
          receivers: [] as Receiver[],
        };
        return {
          ...prev,
          config: { ...newConfig, scenarios: [newScenario] },
        };
      }
      const newScenario = {
        id: generateId(),
        name: name || `Scenario ${prev.config.scenarios.length + 1}`,
        locked: 'none' as const,
        lockedSources: [] as Source[],
        lockedReceivers: [] as Receiver[],
        sources: [] as Source[],
        receivers: [] as Receiver[],
      };
      return {
        ...prev,
        config: { ...prev.config, scenarios: [...prev.config.scenarios, newScenario] },
      };
    });
  }, []);

  const deleteScenario = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? { ...prev.config, scenarios: prev.config.scenarios.filter(s => s.id !== id) } : null,
    }));
  }, []);

  const updateScenario = useCallback((id: string, updates: Partial<Pick<NonNullable<EditorState['config']>['scenarios'][0], 'name' | 'locked'>>) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? {
        ...prev.config,
        scenarios: prev.config.scenarios.map(s => s.id === id ? { ...s, ...updates } : s),
      } : null,
    }));
  }, []);

  const addSource = useCallback((scenarioId: string, position?: Partial<Position>) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? {
        ...prev.config,
        scenarios: prev.config.scenarios.map(s => {
          if (s.id !== scenarioId) return s;
          const newSource: Source = { id: generateId(), position: { ...createEmptyPosition(), ...(position || {}) } };
          return { ...s, sources: [...s.sources, newSource] };
        }),
      } : null,
    }));
  }, []);

  const removeSource = useCallback((scenarioId: string, sourceId: string) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? {
        ...prev.config,
        scenarios: prev.config.scenarios.map(s => {
          if (s.id !== scenarioId) return s;
          return { ...s, sources: s.sources.filter(src => src.id !== sourceId) };
        }),
      } : null,
    }));
  }, []);

  const addReceiver = useCallback((scenarioId: string, position?: Partial<Position>, fileNames?: string[]) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? {
        ...prev.config,
        scenarios: prev.config.scenarios.map(s => {
          if (s.id !== scenarioId) return s;
          const newReceiver: Receiver = {
            id: generateId(),
            position: { ...createEmptyPosition(), ...(position || {}) },
            fileNames: fileNames || [],
          };
          return { ...s, receivers: [...s.receivers, newReceiver] };
        }),
      } : null,
    }));
  }, []);

  const removeReceiver = useCallback((scenarioId: string, receiverId: string) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? {
        ...prev.config,
        scenarios: prev.config.scenarios.map(s => {
          if (s.id !== scenarioId) return s;
          return { ...s, receivers: s.receivers.filter(r => r.id !== receiverId) };
        }),
      } : null,
    }));
  }, []);

  const updateLockedPosition = useCallback((scenarioId: string, markerId: string, positionData: Partial<Position>) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? {
        ...prev.config,
        scenarios: prev.config.scenarios.map(s => {
          if (s.id !== scenarioId) return s;
          const updateLocked = <T extends { id: string; position: Partial<Position> }>(items: T[]) => items.map((item: T) =>
            item.id === markerId ? { ...item, position: { ...(item.position as Partial<Position>), ...positionData } } : item
          );
          return {
            ...s,
            lockedSources: updateLocked(s.lockedSources) as Source[],
            lockedReceivers: updateLocked(s.lockedReceivers) as Receiver[],
          };
        }),
      } : null,
    }));
  }, []);

  const updatePosition = useCallback((scenarioId: string, markerId: string, positionData: Partial<Position>) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? {
        ...prev.config,
        scenarios: prev.config.scenarios.map(s => {
          if (s.id !== scenarioId) return s;
          const updateItem = <T extends { id: string; position: Partial<Position> }>(items: T[]) => items.map((item: T) =>
            item.id === markerId ? { ...item, position: { ...(item.position as Partial<Position>), ...positionData } } : item
          );
          return {
            ...s,
            sources: updateItem(s.sources) as Source[],
            receivers: updateItem(s.receivers) as Receiver[],
          };        }),
      } : null,
    }));
  }, []);

  const updateFilePaths = useCallback((scenarioId: string, receiverId: string, fileNames: string[]) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? {
        ...prev.config,
        scenarios: prev.config.scenarios.map(s => {
          if (s.id !== scenarioId) return s;
          return {
            ...s,
            receivers: s.receivers.map(r => r.id === receiverId ? { ...r, fileNames } : r),
          };
        }),
      } : null,
    }));
  }, []);

  const loadRoomMap = useCallback((file: File) => {
    setState(prev => {
      if (file.size === 0) {
        if (prev.roomMapPreviewUrl) URL.revokeObjectURL(prev.roomMapPreviewUrl);
        return { ...prev, roomMapImage: null, roomMapPreviewUrl: null };
      }
      const url = URL.createObjectURL(file);
      return { ...prev, roomMapImage: file, roomMapPreviewUrl: url };
    });
  }, []);

  const bulkLoad = useCallback((scenarioId: string, target: BulkLoadTarget, lines: Array<{ x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? {
        ...prev.config,
        scenarios: prev.config.scenarios.map(s => {
          if (s.id !== scenarioId) return s;
          const newItems = lines.map(line => ({
            id: generateId(),
            position: { ...createEmptyPosition(), ...line },
            ...(target === 'receivers' ? { fileNames: [] as string[] } : {}),
          })) as (Source | Receiver)[];
          if (target === 'sources') {
            return { ...s, sources: [...s.sources, ...newItems] as Source[] };
          }
          return { ...s, receivers: [...s.receivers, ...newItems] as Receiver[] };
        }),
      } : null,
    }));
  }, []);

  const setRoom = useCallback((room: RoomConfig) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? { ...prev.config, room } : null,
    }));
  }, []);

  const setInfo = useCallback((info: ConfigModel['info']) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? { ...prev.config, info } : null,
    }));
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    if (state.roomMapPreviewUrl) {
      URL.revokeObjectURL(state.roomMapPreviewUrl);
    }
    setState({ config: null, roomMapImage: null, roomMapPreviewUrl: null, selectedScenarioId: null, selectedMarkerId: null, dragRoomPos: null, dragState: null, gridSettings: { snapToGrid: false, gridSize: 1, showGrid: false }, scaleFactor: null });
  }, [state.roomMapPreviewUrl]);

  const setSelectedScenarioId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedScenarioId: id }));
  }, []);

  const setSelectedMarkerId = useCallback((id: string | null) => {
    console.log('SET selectedMarkerId:', id);
    setState(prev => ({ ...prev, selectedMarkerId: id }));
  }, []);

  const setDragRoomPos = useCallback((pos: { x: number; y: number } | null) => {
    setState(prev => ({ ...prev, dragRoomPos: pos }));
  }, []);

  const setDragState = useCallback((state: Partial<{
    isDragging: boolean;
    draggedMarkerId: string | null;
    startMouseX: number;
    startMouseY: number;
  }> | null) => {
    const mergeState = (prev: { isDragging: boolean; draggedMarkerId: string | null; startMouseX: number; startMouseY: number }, next: Partial<typeof prev> | null) => {
      if (!next) return null;
      return {
        isDragging: next.isDragging ?? prev.isDragging,
        draggedMarkerId: next.draggedMarkerId ?? prev.draggedMarkerId,
        startMouseX: next.startMouseX ?? prev.startMouseX,
        startMouseY: next.startMouseY ?? prev.startMouseY,
      };
    };
    setState(prev => ({ ...prev, dragState: prev.dragState ? mergeState(prev.dragState, state) : state as { isDragging: boolean; draggedMarkerId: string | null; startMouseX: number; startMouseY: number } | null }));
  }, []);

 

  const setSnapToGrid = useCallback((snapToGrid: boolean) => {
    setState(prev => ({ ...prev, gridSettings: { ...prev.gridSettings, snapToGrid } }));
  }, []);

  const setGridSize = useCallback((gridSize: number) => {
    setState(prev => ({ ...prev, gridSettings: { ...prev.gridSettings, gridSize } }));
  }, []);

  const setShowGrid = useCallback((showGrid: boolean) => {
    setState(prev => ({ ...prev, gridSettings: { ...prev.gridSettings, showGrid } }));
  }, []);

  const setScaleFactor = useCallback((scaleFactor: number | null) => {
    setState(prev => ({ ...prev, scaleFactor }));
  }, []);

  const importJSON = useCallback((jsonString: string) => {
    try {
      const { config, gridSettings, scaleFactor } = importFromJSON(jsonString);
      setState(prev => ({
        ...prev,
        config,
        gridSettings,
        scaleFactor,
        selectedScenarioId: null,
        selectedMarkerId: null,
      }));
    } catch (err) {
      console.error('Failed to import JSON:', err);
    }
  }, []);

  const exportJSON = useCallback(() => {
    if (!state.config) return;
    const jsonString = exportToJSON(state.config, state.gridSettings, state.scaleFactor);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'room-z-preset.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.config, state.gridSettings, state.scaleFactor]);

  useEffect(() => {
    if (state.config) saveToLocalStorage(state.config, state.gridSettings, state.scaleFactor);
  }, [state.config, state.gridSettings, state.scaleFactor, saveToLocalStorage]);

  return {
    ...state,
    loadXML,
    exportFile,
    exportJSON,
    importJSON,
    setScaleFactor,
    addScenario,
    deleteScenario,
    updateScenario,
    addSource,
    removeSource,
    addReceiver,
    removeReceiver,
    updateLockedPosition,
    updatePosition,
    updateFilePaths,
    loadRoomMap,
    bulkLoad,
    setRoom,
    setInfo,
    clearAll,
    setSelectedScenarioId,
    setSelectedMarkerId,
    setDragRoomPos,
    setDragState,
    setSnapToGrid,
    setGridSize,
    setShowGrid,
  };
}

