export interface Position {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

export interface RoomConfig {
  width: number;
  depth: number;
  height: number;
  originX: number;
  originY: number;
  originZ: number;
}

export interface InfoText {
  data: string;
}

export interface Source {
  id: string;
  isLocked?: boolean;
  filePath?: string;
  position: Position;
}

export interface Receiver {
  id: string;
  isLocked?: boolean;
  fileNames: string[];
  position: Position;
}

export interface Scenario {
  id: string;
  name: string;
  locked: 'source' | 'receiver' | 'none';
  lockedSources: Source[];
  lockedReceivers: Receiver[];
  sources: Source[];
  receivers: Receiver[];
}

export interface ConfigModel {
  room: RoomConfig;
  info: InfoText;
  scenarios: Scenario[];
}

export type BulkLoadTarget = 'sources' | 'receivers';

export interface GridSettings {
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
}
