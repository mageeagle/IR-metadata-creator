import { XMLParser } from 'fast-xml-parser';

export interface ParsedConfig {
  room: {
    width: number;
    depth: number;
    height: number;
    originX: number;
    originY: number;
    originZ: number;
  };
  info: {
    data: string;
    micElevation?: number;
    micModel?: string;
    spkElevation?: number;
    spkModel?: string;
    irMethod?: string;
    sweepDuration?: number;
    sweepFreqStart?: number;
    spaceMaterials?: string;
    roomGeometry?: string;
  };
  scenarios: Array<{
    name: string;
    locked: 'source' | 'receiver' | 'none';
    lockedSource?: Record<string, number>;
    lockedSources?: Array<Record<string, number>>;
    lockedReceiver?: Record<string, number>;
    sources?: Array<Record<string, string | undefined | number>>;
    receivers?: Array<Record<string, string | undefined | number>>;
  }>;
}

function unwrap(val: unknown): unknown {
  if (Array.isArray(val)) return val[0];
  return val;
}

function getAttr(obj: unknown, key: string): string {
  const o = obj as Record<string, unknown> | undefined;
  const val = o ? o[key] : undefined;
  if (val !== undefined) return String(unwrap(val));
  const uKey = key.startsWith('_') ? key.slice(1) : `_${key}`;
  const uVal = o ? o[uKey] : undefined;
  if (uVal !== undefined) return String(unwrap(uVal));
  return '';
}

function getNum(obj: unknown, key: string): number {
  return parseFloat(getAttr(obj, key)) || 0;
}

function unwrapObj(obj: unknown): Record<string, string | undefined | number> {
  if (!obj || typeof obj !== 'object') return {};
  const result: Record<string, string | undefined | number> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const unwrapped = unwrap(v);
    // If still an array, take its first element
    const finalVal = Array.isArray(unwrapped) ? unwrap(unwrapped) : unwrapped;
    result[k] = typeof finalVal === 'number' ? finalVal : (finalVal as string | undefined);
  }
  return result;
}

export function parseConfigXML(xmlString: string): ParsedConfig {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '_',
    isArray: (_tagName) => true,
  });

  const parsed = parser.parse(xmlString);
  const rootItems = parsed.root;
  const root = rootItems && rootItems[0];

  // Parse room
  const roomItems = root?.room;
  const roomEl = (Array.isArray(roomItems) ? roomItems[0] : roomItems) || {};
  const room = {
    width: getNum(roomEl, '_width'),
    depth: getNum(roomEl, '_height'),
    height: 0,
    originX: getNum(roomEl, '_origin_x'),
    originY: getNum(roomEl, '_origin_y'),
    originZ: getNum(roomEl, '_origin_z'),
  };

  // Parse info
  const infoItems = root?.info;
  const infoEl = (Array.isArray(infoItems) ? infoItems[0] : infoItems) || {};
  const info = {
    data: getAttr(infoEl, '_data') || '',
    micElevation: getNum(infoEl, '_mic_elevation'),
    micModel: getAttr(infoEl, '_mic_model') || undefined,
    spkElevation: getNum(infoEl, '_spk_elevation'),
    spkModel: getAttr(infoEl, '_spk_model') || undefined,
    irMethod: getAttr(infoEl, '_ir_method') || undefined,
    sweepDuration: getNum(infoEl, '_sweep_duration'),
    sweepFreqStart: getNum(infoEl, '_sweep_freq_start'),
    spaceMaterials: getAttr(infoEl, '_space_materials') || undefined,
    roomGeometry: getAttr(infoEl, '_space_geometry') || undefined,
  };

  // Parse scenarios
  const scenarios: ParsedConfig['scenarios'] = [];
  const scenarioList = root?.scenario;
  const scArray = Array.isArray(scenarioList) ? scenarioList : (scenarioList ? [scenarioList] : []);

  for (const sc of scArray) {
    if (!sc || typeof sc !== 'object') continue;
    const lockedValue = getAttr(sc, '_locked');
    const locked: 'source' | 'receiver' | 'none' = (lockedValue === 'source' || lockedValue === 'receiver') ? lockedValue : 'none';
    const name = getAttr(sc, '_name') || '';

    const parsedScenario: { name: string; locked: 'source' | 'receiver' | 'none'; [key: string]: unknown } = { name, locked };

    // Check for single locked source at scenario root level
    if (locked === 'source' && sc.source) {
      const sItem = Array.isArray(sc.source) ? sc.source[0] : sc.source;
      parsedScenario.lockedSource = {
        src_x: getNum(sItem, '_src_x'),
        src_y: getNum(sItem, '_src_y'),
        src_z: getNum(sItem, '_src_z'),
        rot_z: getNum(sItem, 'rot_z'),
        rot_y: getNum(sItem, 'rot_y'),
        rot_x: getNum(sItem, 'rot_x'),
      };
    }

    // Check for single locked receiver at scenario root level
    if (locked === 'receiver' && sc.receiver) {
      const rItem = Array.isArray(sc.receiver) ? sc.receiver[0] : sc.receiver;
      parsedScenario.lockedReceiver = {
        rcv_x: getNum(rItem, '_rcv_x'),
        rcv_y: getNum(rItem, '_rcv_y'),
        rcv_z: getNum(rItem, '_rcv_z'),
        rot_z: getNum(rItem, 'rot_z'),
        rot_y: getNum(rItem, 'rot_y'),
        rot_x: getNum(rItem, 'rot_x'),
      };
    }

    // Check for multiple sources: source_1, source_2, etc.
    const lockedSources: unknown[] = [];
    let n = 1;
    while (sc[`source_${n}`]) {
      const sEl = sc[`source_${n}`];
      const sItem = Array.isArray(sEl) ? sEl[0] : sEl;
      lockedSources.push({
        src_x: getNum(sItem, '_src_x'),
        src_y: getNum(sItem, '_src_y'),
        src_z: getNum(sItem, '_src_z'),
        rot_z: getNum(sItem, 'rot_z'),
        rot_y: getNum(sItem, 'rot_y'),
        rot_x: getNum(sItem, 'rot_x'),
      });
      n++;
    }
    if (lockedSources.length > 0) {
      parsedScenario.lockedSources = lockedSources;
    }

    // Check for <sources> wrapped array - may have nested { source: [...] } structure
    if (sc.sources) {
      const sourcesInner = sc.sources;
      const sourceItems: unknown[] = [];
      for (const s of Array.isArray(sourcesInner) ? sourcesInner : [sourcesInner]) {
        if (s && typeof s === 'object') {
          if (s.source) {
            const ra = Array.isArray(s.source) ? s.source : [s.source];
            for (const item of ra) {
              if (item) sourceItems.push(Array.isArray(item) ? item[0] : item);
            }
          } else {
            const item = Array.isArray(s) ? s[0] : s;
            if (item) sourceItems.push(item);
          }
        }
      }
      parsedScenario.sources = sourceItems.map(unwrapObj);
    }

    // Check for <receivers> wrapped array - may have nested { receiver: [...] } structure
    if (sc.receivers) {
      const recvsInner = sc.receivers;
      const recvItems: unknown[] = [];
      for (const r of Array.isArray(recvsInner) ? recvsInner : [recvsInner]) {
        if (r && typeof r === 'object') {
          if (r.receiver) {
            const ra = Array.isArray(r.receiver) ? r.receiver : [r.receiver];
            for (const item of ra) {
              if (item) recvItems.push(Array.isArray(item) ? item[0] : item);
            }
          } else {
            const item = Array.isArray(r) ? r[0] : r;
            if (item) recvItems.push(item);
          }
        }
      }
      parsedScenario.receivers = recvItems.map(unwrapObj);
    }

    scenarios.push(parsedScenario);
  }

  return { room, info, scenarios };
}
