'use client';

interface EditorState {
  config: any;
  roomMapImage: File | null;
  roomMapPreviewUrl: string | null;
  selectedScenarioId: string | null;
  selectedMarkerId: string | null;
  loadXML: (xmlString: string) => void;
  exportFile: () => any;
  addScenario: (name?: string) => void;
  deleteScenario: (id: string) => void;
  updateScenario: (id: string, updates: any) => void;
  addSource: (scenarioId: string, position?: any) => void;
  removeSource: (scenarioId: string, sourceId: string) => void;
  addReceiver: (scenarioId: string, position?: any, fileNames?: string[]) => void;
  removeReceiver: (scenarioId: string, receiverId: string) => void;
  updatePosition: (scenarioId: string, markerId: string, positionData: any) => void;
  updateFilePaths: (scenarioId: string, receiverId: string, fileNames: string[]) => void;
  loadRoomMap: (file: File) => void;
  bulkLoad: (scenarioId: string, target: any, lines: any[]) => void;
  setRoom: (room: any) => void;
  setInfo: (info: any) => void;
  clearAll: () => void;
}

export default function PropertiesPanel(_props: EditorState) {
  return (
    <aside className="w-[360px] min-w-[360px] max-w-[360px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Properties</h2>
      </div>
    </aside>
  );
}
