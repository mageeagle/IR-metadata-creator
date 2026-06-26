'use client';

import { useCallback } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import Sidebar from '@/components/Editor/Sidebar';
import Canvas from '@/components/Editor/Canvas';
import PropertiesPanel from '@/components/Editor/PropertiesPanel';

export default function EditorPage() {
  const state = useEditorStore();

  const handleJsonImported = useCallback((jsonString: string) => {
    const parsed = JSON.parse(jsonString);
    state.importJSON(jsonString);
  }, [state.importJSON]);

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="hidden md:flex flex-1 min-h-0">
        <Sidebar
          {...state}
          exportJSON={state.exportJSON}
          importJSON={handleJsonImported}
        />
        <Canvas
          {...state}
          scaleFactor={state.scaleFactor}
          setScaleFactor={state.setScaleFactor}
          onJsonImported={handleJsonImported}
        />
        <PropertiesPanel
          {...state}
          dragRoomPos={state.dragRoomPos ?? null}
          draggedMarkerId={state.dragState?.draggedMarkerId ?? null}
        />
      </div>
      <div className="md:hidden flex flex-col h-full">
        <Sidebar
          {...state}
          exportJSON={state.exportJSON}
          importJSON={handleJsonImported}
        />
        <Canvas
          {...state}
          scaleFactor={state.scaleFactor}
          setScaleFactor={state.setScaleFactor}
          onJsonImported={handleJsonImported}
        />
        <PropertiesPanel
          {...state}
          dragRoomPos={state.dragRoomPos ?? null}
          draggedMarkerId={state.dragState?.draggedMarkerId ?? null}
        />
      </div>
    </div>
  );
}
