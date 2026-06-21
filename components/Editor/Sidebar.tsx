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

export default function Sidebar(_props: EditorState) {
  return (
    <aside className="w-[340px] min-w-[340px] max-w-[340px] border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Scenarios</h2>
      </div>
    </aside>
  );
}
