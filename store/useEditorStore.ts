import { useState, useCallback, useEffect } from 'react';
import type { ConfigModel, Source, Receiver, Position, BulkLoadTarget, RoomConfig } from '../lib/types';

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
}

function createEmptyConfig(): ConfigModel {
  return {
    room: { width: 4, height: 4, originX: 0, originY: 0, originZ: 0 },
    info: { data: '' },
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
        return { ...parsed, roomMapImage: null, roomMapPreviewUrl: null };
      }
    } catch {
      // Ignore parse errors
    }
    return { config: null, roomMapImage: null, roomMapPreviewUrl: null, selectedScenarioId: null, selectedMarkerId: null };
  });

  const saveToLocalStorage = useCallback((config: ConfigModel) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ config }));
    } catch {
      // Storage full or unavailable
    }
  }, []);

  const loadXML = useCallback((xmlString: string) => {
    setState(prev => ({ ...prev, config: createEmptyConfig() }));
  }, []);

  const exportFile = useCallback(() => {
    if (!state.config) return null;
    return null;
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
    const url = URL.createObjectURL(file);
    setState(prev => ({ ...prev, roomMapImage: file, roomMapPreviewUrl: url }));
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
    setState({ config: null, roomMapImage: null, roomMapPreviewUrl: null, selectedScenarioId: null, selectedMarkerId: null });
  }, [state.roomMapPreviewUrl]);

  useEffect(() => {
    if (state.config) saveToLocalStorage(state.config);
  }, [state.config, saveToLocalStorage]);

  return {
    ...state,
    loadXML,
    exportFile,
    addScenario,
    deleteScenario,
    updateScenario,
    addSource,
    removeSource,
    addReceiver,
    removeReceiver,
    updatePosition,
    updateFilePaths,
    loadRoomMap,
    bulkLoad,
    setRoom,
    setInfo,
    clearAll,
  };
}
