'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { serializeConfigToXML } from '@/lib/xml-serializer';
import type { ConfigModel, RoomConfig, InfoText, Position } from '@/lib/types';
import { Button } from '@/components/common/Button';

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
  setInfo: (info: InfoText) => void;
  clearAll: () => void;
  setSelectedScenarioId: (id: string | null) => void;
}

export default function Sidebar(props: EditorState) {
  const { config, roomMapImage, roomMapPreviewUrl, selectedScenarioId, loadXML, loadRoomMap, exportFile, addScenario, deleteScenario, bulkLoad, setRoom, setInfo, clearAll, updateScenario: updateScenarioFn, setSelectedScenarioId } = props;
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const roomMapInputRef = useRef<HTMLInputElement>(null);
  const [bulkTarget, setBulkTarget] = useState<'sources' | 'receivers'>('sources');
  const [bulkText, setBulkText] = useState('');
  const [room, setRoomState] = useState<Partial<RoomConfig>>({});

  // Reset room state when config changes (on XML load)
  useEffect(() => {
    if (config) {
      setRoomState({});
    }
  }, [config]);
  const [infoData, setInfoData] = useState('');

  const handleXmlImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const xmlString = reader.result as string;
      loadXML(xmlString);
    };
    reader.readAsText(file);
    if (xmlInputRef.current) xmlInputRef.current.value = '';
  }, [loadXML]);

  const handleXmlExport = useCallback(() => {
    if (!config) return;
    const xml = serializeConfigToXML(config);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.xml';
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const handleRoomMapChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadRoomMap(file);
    if (roomMapInputRef.current) roomMapInputRef.current.value = '';
  }, [loadRoomMap]);

  const handleBulkLoad = useCallback(() => {
    if (!selectedScenarioId) return;
    const lines = bulkText.trim().split('\n').filter(line => line.trim()).map(line => {
      const parts = line.split(',').map(Number);
      return {
        x: parts[0] || 0,
        y: parts[1] || 0,
        z: parts[2] || 0,
        rotX: parts[5] ?? 0,
        rotY: parts[4] ?? 0,
        rotZ: parts[3] ?? 0,
      };
    });
    bulkLoad(selectedScenarioId, bulkTarget, lines);
    setBulkText('');
  }, [selectedScenarioId, bulkTarget, bulkText, bulkLoad]);

  const handleRoomChange = useCallback((field: keyof RoomConfig, value: number) => {
    if (!config) return;
    const updated = { ...config.room, [field]: value };
    setRoomState(updated);
    setRoom(updated);
  }, [config, setRoom]);

  const handleInfoChange = useCallback((value: string) => {
    setInfoData(value);
    setInfo({ data: value });
  }, [setInfo]);

  const handleRemoveRoomMap = useCallback(() => {
    props.loadRoomMap(new File([''], '', { type: 'image/png' }));
    URL.revokeObjectURL(roomMapPreviewUrl || '');
  }, [props.loadRoomMap, roomMapPreviewUrl]);

  return (
    <aside className="w-[340px] min-w-[340px] max-w-[340px] border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
      {/* Header Toolbar */}
      <div className="p-4 pb-2">
        <div className="flex gap-1.5 mb-2">
          <input
            ref={xmlInputRef}
            type="file"
            accept=".xml"
            onChange={handleXmlImport}
            className="hidden"
          />
          <Button variant="default" onClick={() => xmlInputRef.current?.click()}>Import XML</Button>
          <Button variant="primary" onClick={handleXmlExport} disabled={!config}>Export XML</Button>
        </div>
        <Button variant="danger" onClick={clearAll} className="w-full">Clear All</Button>
      </div>

      {/* Room Map Load Zone */}
      <div className="px-4 pt-3"><h3 className="text-[10px] font-medium tracking-wider uppercase text-gray-500 dark:text-gray-400">Room Map</h3></div>
      <div className="px-4 pb-2">
        <div
          onClick={() => roomMapInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded p-3 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
        >
          <input
            ref={roomMapInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleRoomMapChange}
            className="hidden"
          />
          {roomMapPreviewUrl ? (
            <div className="relative">
              <img src={roomMapPreviewUrl} alt="Room map" className="w-full h-auto rounded" />
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveRoomMap(); }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">Drop room map image here or click to browse</p>
          )}
        </div>
      </div>

      {/* Room Metadata */}
      {config && (
        <>
          <div className="px-4 pt-3"><h3 className="text-[10px] font-medium tracking-wider uppercase text-gray-500 dark:text-gray-400">Room Dimensions</h3></div>
          <div className="px-4 pb-2 space-y-1.5">
            <label className="block"><span className="text-[10px] uppercase tracking-wider text-gray-400">Width</span><input type="number" step="0.1" value={room.width ?? config.room.width} onChange={(e) => handleRoomChange('width', parseFloat(e.target.value) || 0)} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></label>
            <label className="block"><span className="text-[10px] uppercase tracking-wider text-gray-400">Height</span><input type="number" step="0.1" value={room.height ?? config.room.height} onChange={(e) => handleRoomChange('height', parseFloat(e.target.value) || 0)} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></label>
            <label className="block"><span className="text-[10px] uppercase tracking-wider text-gray-400">Origin X</span><input type="number" step="0.1" value={room.originX ?? config.room.originX} onChange={(e) => handleRoomChange('originX', parseFloat(e.target.value) || 0)} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></label>
            <label className="block"><span className="text-[10px] uppercase tracking-wider text-gray-400">Origin Y</span><input type="number" step="0.1" value={room.originY ?? config.room.originY} onChange={(e) => handleRoomChange('originY', parseFloat(e.target.value) || 0)} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></label>
            <label className="block"><span className="text-[10px] uppercase tracking-wider text-gray-400">Origin Z</span><input type="number" step="0.1" value={room.originZ ?? config.room.originZ} onChange={(e) => handleRoomChange('originZ', parseFloat(e.target.value) || 0)} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></label>
          </div>
        </>
      )}

      {/* Info Text */}
      <div className="px-4 pt-3"><h3 className="text-[10px] font-medium tracking-wider uppercase text-gray-500 dark:text-gray-400">Info</h3></div>
      <div className="px-4 pb-2">
        <textarea
          value={infoData}
          onChange={(e) => handleInfoChange(e.target.value)}
          placeholder="Enter info text..."
          className="w-full px-1.5 py-1.5 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px] resize-y"
        />
      </div>

      {/* Bulk Load */}
      {selectedScenarioId && (
        <>
          <div className="px-4 pt-3"><h3 className="text-[10px] font-medium tracking-wider uppercase text-gray-500 dark:text-gray-400">Bulk Load</h3></div>
          <div className="px-4 pb-2 space-y-1.5">
              <select value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value as 'sources' | 'receivers')} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="sources">Sources</option>
              <option value="receivers">Receivers</option>
            </select>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="x,y,z,rot_z,rot_y,rot_x (one per line)"
              className="w-full px-1.5 py-1.5 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono min-h-[80px] resize-y"
            />
            <Button variant="primary" onClick={handleBulkLoad} className="w-full">Load All</Button>
          </div>
        </>
      )}

      {/* Scenarios */}
      <div className="px-4 pt-3"><h3 className="text-[10px] font-medium tracking-wider uppercase text-gray-500 dark:text-gray-400">Scenarios</h3></div>
      <div className="px-4 pb-2">
        {!config || config.scenarios.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No config loaded. Import XML or add a scenario to get started.</p>
        ) : (
          <div className="space-y-1">
            {config.scenarios.map((scenario) => {
              const isSelected = selectedScenarioId === scenario.id;
              return (
                <div
                  key={scenario.id}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                >
                  <span className="text-xs text-zinc-700 dark:text-zinc-300 flex-1 truncate">{scenario.name}</span>
                  {scenario.locked === 'source' && <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-[10px] font-bold rounded">S</span>}
                  {scenario.locked === 'receiver' && <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-[10px] font-bold rounded">R</span>}
                  {scenario.sources.length > 0 && <span className="text-[10px] text-gray-400" title={`${scenario.sources.length} source(s)`}>{scenario.sources.length}</span>}
                  {scenario.receivers.length > 0 && <span className="text-[10px] text-gray-400" title={`${scenario.receivers.length} receiver(s)`}>+{scenario.receivers.length}</span>}
                  <Button variant="danger" onClick={(e) => { e.stopPropagation(); deleteScenario(scenario.id); }} className="px-1.5 py-0.5 text-[10px] h-auto">×</Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Scenario */}
      <div className="px-4 pb-4">
        <Button variant="primary" onClick={() => addScenario()} className="w-full mt-1">+ Add Scenario</Button>
      </div>
    </aside>
  );
}
