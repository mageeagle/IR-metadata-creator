import type { ConfigModel, GridSettings } from './types';

interface JSONExportV1 {
  version: 1;
  exportedAt: string;
  config: ConfigModel;
  gridSettings: GridSettings;
  scaleFactor: number | null;
}

const DEFAULT_GRID_SETTINGS: GridSettings = {
  snapToGrid: false,
  gridSize: 1,
  showGrid: false,
};

export function exportToJSON(
  config: ConfigModel,
  gridSettings: GridSettings,
  scaleFactor: number | null
): string {
  const exportData: JSONExportV1 = {
    version: 1,
    exportedAt: new Date().toISOString(),
    config,
    gridSettings,
    scaleFactor,
  };

  return JSON.stringify(exportData, null, 2);
}

export function importFromJSON(
  jsonString: string
): { config: ConfigModel; gridSettings: GridSettings; scaleFactor: number | null } {
  const parsed = JSON.parse(jsonString) as Partial<JSONExportV1>;

  if (parsed.version !== 1) {
    throw new Error(`Unsupported export version: ${parsed.version}. Expected version 1.`);
  }

  if (!parsed.config) {
    throw new Error('Invalid export file: missing config data.');
  }

  return {
    config: parsed.config as ConfigModel,
    gridSettings: parsed.gridSettings ?? DEFAULT_GRID_SETTINGS,
    scaleFactor: parsed.scaleFactor ?? null,
  };
}
