import { XMLParser } from 'fast-xml-parser';

export interface ParsedConfig {
  room: {
    width: number;
    height: number;
    originX: number;
    originY: number;
    originZ: number;
  };
  info: { data: string };
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

function unwrap(val: any): any {
  if (Array.isArray(val)) return val[0];
  return val;
}

function getAttr(obj: any, key: string): string {
  const val = obj ? obj[key] : undefined;
  if (val !== undefined) return String(unwrap(val));
  const uKey = key.startsWith('_') ? key.slice(1) : `_${key}`;
  const uVal = obj ? obj[uKey] : undefined;
  if (uVal !== undefined) return String(unwrap(uVal));
  return '';
}

function getNum(obj: any, key: string): number {
  return parseFloat(getAttr(obj, key)) || 0;
}

function unwrapObj(obj: any): Record<string, string | undefined | number> {
  if (!obj || typeof obj !== 'object') return {};
  const result: Record<string, string | undefined | number> = {};
  for (const [k, v] of Object.entries(obj)) {
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
    isArray: (tagName) => true,
  });

  const parsed = parser.parse(xmlString);
  const rootItems = parsed.root;
  const root = rootItems && rootItems[0];

  // Parse room
  const roomItems = root?.room;
  const roomEl = (Array.isArray(roomItems) ? roomItems[0] : roomItems) || {};
  const room = {
    width: getNum(roomEl, '_width'),
    height: getNum(roomEl, '_height'),
    originX: getNum(roomEl, '_origin_x'),
    originY: getNum(roomEl, '_origin_y'),
    originZ: getNum(roomEl, '_origin_z'),
  };

  // Parse info
  const infoItems = root?.info;
  const infoEl = (Array.isArray(infoItems) ? infoItems[0] : infoItems) || {};
  const info = {
    data: getAttr(infoEl, '_data') || '',
  };

  // Parse scenarios
  const scenarios: ParsedConfig['scenarios'] = [];
  const scenarioList = root?.scenario;
  const scArray = Array.isArray(scenarioList) ? scenarioList : (scenarioList ? [scenarioList] : []);

  for (const sc of scArray) {
    if (!sc || typeof sc !== 'object') continue;
    const locked: 'source' | 'receiver' | 'none' = getAttr(sc, '_locked') === 'source' || getAttr(sc, '_locked') === 'receiver' ? getAttr(sc, '_locked') : 'none';
    const name = getAttr(sc, '_name') || '';

    const parsedScenario: any = { name, locked };

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
    const lockedSources: any[] = [];
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
      const sourceItems: any[] = [];
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
      const recvItems: any[] = [];
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
