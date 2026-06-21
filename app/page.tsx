'use client';

import { useEditorStore } from '@/store/useEditorStore';
import Sidebar from '@/components/Editor/Sidebar';
import Canvas from '@/components/Editor/Canvas';
import PropertiesPanel from '@/components/Editor/PropertiesPanel';

export default function EditorPage() {
  const state = useEditorStore();

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="hidden md:flex flex-1 min-h-0">
        <Sidebar {...state} />
        <Canvas {...state} />
        <PropertiesPanel {...state} />
      </div>
      <div className="md:hidden flex flex-col h-full">
        <Sidebar {...state} />
        <Canvas {...state} />
        <PropertiesPanel {...state} />
      </div>
    </div>
  );
}
