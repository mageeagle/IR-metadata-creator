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
  exportJSON: () => void;
  importJSON: (jsonString: string) => void;
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
  const { config, roomMapPreviewUrl, selectedScenarioId, loadXML, loadRoomMap, exportJSON, importJSON, addScenario, deleteScenario, bulkLoad, setRoom, setInfo, clearAll, setSelectedScenarioId } = props;
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const roomMapInputRef = useRef<HTMLInputElement>(null);
  const [bulkTarget, setBulkTarget] = useState<'sources' | 'receivers'>('sources');
  const [bulkText, setBulkText] = useState('');
  const [room, setRoomState] = useState<Partial<RoomConfig>>({});
  const [infoData, setInfoData] = useState('');
  const [isAcousticExpanded, setIsAcousticExpanded] = useState(false);
  const [acousticMeta, setAcousticMeta] = useState({
    micElevation: undefined as number | undefined,
    micModel: undefined as string | undefined,
    spkElevation: undefined as number | undefined,
    spkModel: undefined as string | undefined,
    irMethod: undefined as 'sineSweep' | 'clap' | undefined,
    sweepDuration: undefined as number | undefined,
    sweepFreqStart: undefined as number | undefined,
    spaceMaterials: undefined as string | undefined,
    roomGeometry: undefined as string | undefined,
  });

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

  const handleJsonImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const jsonString = reader.result as string;
      importJSON(jsonString);
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  }, [importJSON]);

  const handleJsonExport = useCallback(() => {
    exportJSON();
  }, [exportJSON]);

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
    setInfo({ ...acousticMeta, data: value } as InfoText);
  }, [setInfo, acousticMeta]);

  useEffect(() => {
    if (config?.info) {
      const info = config.info;
      requestAnimationFrame(() => {
        setInfoData(info.data || '');
 
        setAcousticMeta({
          micElevation: info.micElevation,
          micModel: info.micModel,
          spkElevation: info.spkElevation,
          spkModel: info.spkModel,
          irMethod: info.irMethod,
          sweepDuration: info.sweepDuration,
          sweepFreqStart: info.sweepFreqStart,
          spaceMaterials: info.spaceMaterials,
          roomGeometry: info.roomGeometry,
        });
      });
    }
  }, [config?.info]);

  const handleAcousticChange = useCallback(<K extends keyof InfoText>(field: K, value: InfoText[K]) => {
    const updated = { ...acousticMeta, [field]: value };
    setAcousticMeta(updated);
    setInfo({ ...updated } as InfoText);
  }, [acousticMeta, setInfo]);

  const handleRemoveRoomMap = useCallback(() => {
    loadRoomMap(new File([''], '', { type: 'image/png' }));
  }, [loadRoomMap]);

  return (
    <aside className="w-[340px] min-w-[340px] max-w-[340px] border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
      {/* Header Toolbar */}
      <div className="p-4 pb-2">
        <div className="flex gap-1.5 mb-2 flex-wrap">
          <input
            ref={xmlInputRef}
            type="file"
            accept=".xml"
            onChange={handleXmlImport}
            className="hidden"
          />
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleJsonImport}
            className="hidden"
          />
          <Button variant="default" onClick={() => xmlInputRef.current?.click()}>Import XML</Button>
          <Button variant="default" onClick={() => jsonInputRef.current?.click()}>Import JSON</Button>
          <Button variant="primary" onClick={handleXmlExport} disabled={!config}>Export XML</Button>
          <Button variant="primary" onClick={handleJsonExport} disabled={!config}>Export JSON</Button>
        </div>
        <Button variant="danger" onClick={clearAll} className="w-full">Clear All</Button>
      </div>

      {/* Room Map Load Zone */}
      <div className="px-4 pt-3"><h3 className="text-[10px] font-medium tracking-wider uppercase text-gray-500 dark:text-gray-400">Room Map</h3></div>
      <div className="px-4 pb-2">
        <div
          onClick={() => roomMapInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer?.files[0];
            if (file && /\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
              handleRoomMapChange({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>);
            }
          }}
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
            <div className="flex justify-between items-center">
              <p className="text-xs text-green-500 text-center flex-1">Image loaded on canvas</p>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveRoomMap(); }}
                className="bg-red-500 text-white rounded-full size-5 flex items-center justify-center text-[10px] hover:bg-red-600 ml-1 cursor-pointer"
              >
                X
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
            <div className="grid grid-cols-3 gap-1.5">
              <label className="block"><span className="text-[10px] uppercase tracking-wider text-gray-400">Width</span><input type="number" step="0.1" value={room.width ?? config.room.width} onChange={(e) => handleRoomChange('width', parseFloat(e.target.value) || 0)} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></label>
              <label className="block"><span className="text-[10px] uppercase tracking-wider text-gray-400">Length</span><input type="number" step="0.1" value={room.depth ?? config.room.depth} onChange={(e) => handleRoomChange('depth', parseFloat(e.target.value) || 0)} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></label>
              <label className="block"><span className="text-[10px] uppercase tracking-wider text-gray-400">Height</span><input type="number" step="0.1" value={room.height ?? config.room.height} onChange={(e) => handleRoomChange('height', parseFloat(e.target.value) || 0)} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></label>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <label className="block"><span className="text-[10px] uppercase tracking-wider text-gray-400">Origin X</span><input type="number" step="0.1" value={room.originX ?? config.room.originX} onChange={(e) => handleRoomChange('originX', parseFloat(e.target.value) || 0)} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></label>
              <label className="block"><span className="text-[10px] uppercase tracking-wider text-gray-400">Origin Y</span><input type="number" step="0.1" value={room.originY ?? config.room.originY} onChange={(e) => handleRoomChange('originY', parseFloat(e.target.value) || 0)} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></label>
              <label className="block"><span className="text-[10px] uppercase tracking-wider text-gray-400">Origin Z</span><input type="number" step="0.1" value={room.originZ ?? config.room.originZ} onChange={(e) => handleRoomChange('originZ', parseFloat(e.target.value) || 0)} className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></label>
            </div>
          </div>
        </>
      )}

      {/* Acoustic Metadata - Collapsible Section */}
      <div className="px-4 pt-3">
        <button
          onClick={() => setIsAcousticExpanded(!isAcousticExpanded)}
          className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <span className="text-[8px]">{isAcousticExpanded ? '▼' : '▶'}</span>
          Acoustic Metadata
        </button>
      </div>
      {isAcousticExpanded && (
        <div className="px-4 pb-2 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Mic Elevation (m)</span>
              <input
                type="number"
                step="0.1"
                value={acousticMeta.micElevation ?? ''}
                onChange={(e) => handleAcousticChange('micElevation', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                placeholder="0"
                className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Spk Elevation (m)</span>
              <input
                type="number"
                step="0.1"
                value={acousticMeta.spkElevation ?? ''}
                onChange={(e) => handleAcousticChange('spkElevation', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                placeholder="0"
                className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Mic Model/Type</span>
              <input
                type="text"
                value={acousticMeta.micModel ?? ''}
                onChange={(e) => handleAcousticChange('micModel', e.target.value)}
                placeholder="e.g., Sennheiser MKH 416"
                className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Spk Model/Type</span>
              <input
                type="text"
                value={acousticMeta.spkModel ?? ''}
                onChange={(e) => handleAcousticChange('spkModel', e.target.value)}
                placeholder="e.g., Genelec 8030"
                className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="irMethod"
                value="sineSweep"
                checked={acousticMeta.irMethod === 'sineSweep'}
                onChange={(e) => handleAcousticChange('irMethod', e.target.value as 'sineSweep')}
                className="w-3.5 h-3.5 accent-blue-500"
              />
              <span className="text-xs text-gray-600 dark:text-gray-300">Sine Sweep</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="irMethod"
                value="clap"
                checked={acousticMeta.irMethod === 'clap'}
                onChange={(e) => handleAcousticChange('irMethod', e.target.value as 'clap')}
                className="w-3.5 h-3.5 accent-blue-500"
              />
              <span className="text-xs text-gray-600 dark:text-gray-300">Clap</span>
            </label>
          </div>
          {acousticMeta.irMethod === 'sineSweep' && (
            <div className="grid grid-cols-2 gap-1.5">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-gray-400">Sweep Duration (s)</span>
                <input
                  type="number"
                  step="1"
                  value={acousticMeta.sweepDuration ?? ''}
                  onChange={(e) => handleAcousticChange('sweepDuration', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  placeholder="60"
                  className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-gray-400">Sweep Freq Start (Hz)</span>
                <input
                  type="number"
                  step="1"
                  value={acousticMeta.sweepFreqStart ?? ''}
                  onChange={(e) => handleAcousticChange('sweepFreqStart', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  placeholder="20"
                  className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
            </div>
          )}
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-gray-400">Space Materials</span>
            <textarea
              value={acousticMeta.spaceMaterials ?? ''}
              onChange={(e) => handleAcousticChange('spaceMaterials', e.target.value)}
              placeholder="e.g., concrete, wood, glass"
              className="w-full px-1.5 py-1.5 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[50px] resize-y"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-gray-400">Space Geometry</span>
            <textarea
              value={acousticMeta.roomGeometry ?? ''}
              onChange={(e) => handleAcousticChange('roomGeometry', e.target.value)}
              placeholder="e.g., rectangular 8m x 6m x 3m"
              className="w-full px-1.5 py-1.5 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[50px] resize-y"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-gray-400">Space Info</span>
            <textarea
              value={infoData}
              onChange={(e) => handleInfoChange(e.target.value)}
              placeholder="Enter info text..."
              className="w-full px-1.5 py-1.5 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px] resize-y"
            />
          </label>
        </div>
      )}

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
