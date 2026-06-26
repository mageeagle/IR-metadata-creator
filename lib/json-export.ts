import type { ConfigModel, GridSettings } from './types';

interface JSONExportV2 {
  version: 2;
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
  const exportData: JSONExportV2 = {
    version: 2,
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
  const parsed: { version?: number; config?: ConfigModel; gridSettings?: GridSettings; scaleFactor?: number | null } = JSON.parse(jsonString);

  const version = parsed.version as number | undefined;
  if (version !== 1 && version !== 2) {
    throw new Error(`Unsupported export version: ${version}. Expected version 1 or 2.`);
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
