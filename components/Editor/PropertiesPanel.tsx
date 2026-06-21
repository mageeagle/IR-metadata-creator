'use client';

import type { Scenario } from '../../lib/types';
import { useEditorStore } from '../../store/useEditorStore';
import { Button } from '../common/Button';

function PositionInputs({
  position,
  onPositionChange,
  disabled = false,
}: {
  position: { x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number };
  onPositionChange: (updates: Partial<{ x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => void;
  disabled?: boolean;
}) {
  const fieldRows = [
    { label: 'X (m)', key: 'x' as const, step: '0.01' },
    { label: 'Y (m)', key: 'y' as const, step: '0.01' },
    { label: 'Z (m)', key: 'z' as const, step: '0.01' },
  ];

  const rotRows = [
    { label: 'Rot X (°)', key: 'rotX' as const, step: '1' },
    { label: 'Rot Y (°)', key: 'rotY' as const, step: '1' },
    { label: 'Rot Z (°)', key: 'rotZ' as const, step: '1' },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {fieldRows.map(({ label, key, step }) => (
          <div key={key}>
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-6px truncate" title={label}>
              {label}
            </label>
            <input
              type="number"
              step={step}
              value={position[key] ?? 0}
              onChange={(e) => onPositionChange({ [key]: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {rotRows.map(({ label, key, step }) => (
          <div key={key}>
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-6px truncate" title={label}>
              {label}
            </label>
            <input
              type="number"
              step={step}
              value={position[key] ?? 0}
              onChange={(e) => onPositionChange({ [key]: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function LockedSourceCard({
  source,
  onPositionChange,
}: {
  source: NonNullable<Scenario['lockedSources']>[number];
  onPositionChange: (updates: Partial<{ x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => void;
}) {
  return (
    <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
      <PositionInputs
        position={source.position}
        onPositionChange={onPositionChange}
      />
    </div>
  );
}

function MovingSourceCard({
  source,
  onPositionChange,
  onRemove,
}: {
  source: NonNullable<Scenario['sources']>[number];
  onPositionChange: (updates: Partial<{ x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="p-2 rounded border border-gray-200 dark:border-gray-700 space-y-1.5">
      <PositionInputs
        position={source.position}
        onPositionChange={onPositionChange}
      />
      <Button variant="danger" className="w-full text-xs" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

function MovingReceiverCard({
  receiver,
  scenarioId,
  onPositionChange,
  onFilePathsChange,
  onAddChannel,
  onRemove,
}: {
  receiver: NonNullable<Scenario['receivers']>[number];
  scenarioId: string;
  onPositionChange: (updates: Partial<{ x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => void;
  onFilePathsChange: (fileNames: string[]) => void;
  onAddChannel: () => void;
  onRemove: () => void;
}) {
  const channels = receiver.fileNames || [];

  return (
    <div className="p-2 rounded border border-gray-200 dark:border-gray-700 space-y-1.5">
      <PositionInputs
        position={receiver.position}
        onPositionChange={onPositionChange}
      />
      <div className="space-y-1">
        <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Channels</label>
        {channels.map((fileName, index) => (
          <div key={index} className="flex gap-1.5 items-center">
            <span className="text-[10px] font-medium text-gray-400 shrink-0 w-8">ch{index + 1}</span>
            <input
              type="text"
              value={fileName}
              onChange={(e) => {
                const updated = [...channels];
                updated[index] = e.target.value;
                onFilePathsChange(updated);
              }}
              placeholder="file path"
              className="flex-1 px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
        <Button
          variant="default"
          className="w-full text-xs mt-1"
          onClick={onAddChannel}
        >
          + Add Channel
        </Button>
      </div>
      <Button variant="danger" className="w-full text-xs" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

export default function PropertiesPanel(_props: Record<string, unknown>) {
  const {
    config,
    selectedScenarioId,
    updateScenario,
    addSource,
    removeSource,
    addReceiver,
    removeReceiver,
    updatePosition,
    updateFilePaths,
  } = useEditorStore();

  const scenario = config?.scenarios.find((s) => s.id === selectedScenarioId) ?? null;

  if (!config || !selectedScenarioId) {
    return (
      <aside className="w-[360px] min-w-[360px] max-w-[360px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm p-4">
          Select a scenario or marker to edit properties
        </div>
      </aside>
    );
  }

  if (!scenario) {
    return (
      <aside className="w-[360px] min-w-[360px] max-w-[360px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm p-4">
          Scenario not found
        </div>
      </aside>
    );
  }

  const handleUpdateName = (name: string) => {
    updateScenario(scenario.id, { name });
  };

  const handleUpdateLocked = (locked: 'source' | 'receiver' | 'none') => {
    updateScenario(scenario.id, { locked });
  };

  const handleUpdateLockedPosition = (idx: number, updates: Partial<{ x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => {
    const source = scenario.lockedSources[idx];
    if (!source) return;
    updatePosition(scenario.id, source.id, updates);
  };

  const handleUpdateSourcePosition = (idx: number, updates: Partial<{ x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => {
    const source = scenario.sources[idx];
    if (!source) return;
    updatePosition(scenario.id, source.id, updates);
  };

  const handleRemoveSource = (idx: number) => {
    const source = scenario.sources[idx];
    if (!source) return;
    removeSource(scenario.id, source.id);
  };

  const handleUpdateReceiverPosition = (idx: number, updates: Partial<{ x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => {
    const receiver = scenario.receivers[idx];
    if (!receiver) return;
    updatePosition(scenario.id, receiver.id, updates);
  };

  const handleUpdateReceiverFilePaths = (idx: number, fileNames: string[]) => {
    const receiver = scenario.receivers[idx];
    if (!receiver) return;
    updateFilePaths(scenario.id, receiver.id, fileNames);
  };

  const handleAddChannel = (idx: number) => {
    const receiver = scenario.receivers[idx];
    if (!receiver) return;
    const updated = [...(receiver.fileNames || []), ''];
    updateFilePaths(scenario.id, receiver.id, updated);
  };

  const handleRemoveReceiver = (idx: number) => {
    const receiver = scenario.receivers[idx];
    if (!receiver) return;
    removeReceiver(scenario.id, receiver.id);
  };

  const handleAddSource = () => {
    addSource(scenario.id);
  };

  const handleAddReceiver = () => {
    addReceiver(scenario.id);
  };

  return (
    <aside className="w-[360px] min-w-[360px] max-w-[360px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Scenario Settings */}
        <div className="space-y-1.5 p-1.5 rounded border border-gray-200 dark:border-gray-700">
          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Scenario Name</label>
          <input
            type="text"
            value={scenario.name}
            onChange={(e) => handleUpdateName(e.target.value)}
            className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Locked Type</label>
          <select
            value={scenario.locked}
            onChange={(e) => handleUpdateLocked(e.target.value as 'source' | 'receiver' | 'none')}
            className="w-full px-1.5 py-1 text-xs border rounded bg-transparent border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="source">Source</option>
            <option value="receiver">Receiver</option>
          </select>
        </div>

        {/* Locked Sources */}
        {scenario.locked === 'source' && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Locked Sources</label>
            {(scenario.lockedSources || []).map((source, idx) => (
              <LockedSourceCard
                key={source.id}
                source={source}
                onPositionChange={(updates) => handleUpdateLockedPosition(idx, updates)}
              />
            ))}
          </div>
        )}

        {/* Moving Sources */}
        {scenario.locked !== 'receiver' && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Sources</label>
            {(scenario.sources || []).map((source, idx) => (
              <MovingSourceCard
                key={source.id}
                source={source}
                onPositionChange={(updates) => handleUpdateSourcePosition(idx, updates)}
                onRemove={() => handleRemoveSource(idx)}
              />
            ))}
          </div>
        )}

        {/* Moving Receivers */}
        {scenario.locked !== 'source' && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Receivers</label>
            {(scenario.receivers || []).map((receiver, idx) => (
              <MovingReceiverCard
                key={receiver.id}
                receiver={receiver}
                scenarioId={scenario.id}
                onPositionChange={(updates) => handleUpdateReceiverPosition(idx, updates)}
                onFilePathsChange={(fileNames) => handleUpdateReceiverFilePaths(idx, fileNames)}
                onAddChannel={() => handleAddChannel(idx)}
                onRemove={() => handleRemoveReceiver(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add buttons */}
      <div className="p-1.5 border-t border-gray-200 dark:border-gray-700 space-y-1">
        {scenario.locked !== 'source' && (
          <Button variant="primary" className="w-full text-xs" onClick={handleAddSource}>
            + Add Source
          </Button>
        )}
        {scenario.locked !== 'receiver' && (
          <Button variant="success" className="w-full text-xs" onClick={handleAddReceiver}>
            + Add Receiver
          </Button>
        )}
      </div>
    </aside>
  );
}
