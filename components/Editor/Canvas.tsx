'use client';

interface EditorState {
  config: unknown;
  roomMapImage: File | null;
  roomMapPreviewUrl: string | null;
  selectedScenarioId: string | null;
  selectedMarkerId: string | null;
  loadXML: (xmlString: string) => void;
  exportFile: () => unknown;
  addScenario: (name?: string) => void;
  deleteScenario: (id: string) => void;
  updateScenario: (id: string, updates: unknown) => void;
  addSource: (scenarioId: string, position?: unknown) => void;
  removeSource: (scenarioId: string, sourceId: string) => void;
  addReceiver: (scenarioId: string, position?: unknown, fileNames?: string[]) => void;
  removeReceiver: (scenarioId: string, receiverId: string) => void;
  updatePosition: (scenarioId: string, markerId: string, positionData: unknown) => void;
  updateFilePaths: (scenarioId: string, receiverId: string, fileNames: string[]) => void;
  loadRoomMap: (file: File) => void;
  bulkLoad: (scenarioId: string, target: unknown, lines: unknown[]) => void;
  setRoom: (room: unknown) => void;
  setInfo: (info: unknown) => void;
  clearAll: () => void;
}

export default function Canvas(_props: EditorState) {
  return (
    <main className="flex-1 min-w-0 bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-sm text-zinc-400 dark:text-zinc-600">Canvas</p>
      </div>
    </main>
  );
}
