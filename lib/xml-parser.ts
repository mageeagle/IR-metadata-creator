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
    lockedSource?: { src_x: number; src_y: number; src_z: number; rot_z: number; rot_y: number; rot_x: number };
    lockedReceiver?: { rcv_x: number; rcv_y: number; rcv_z: number; rot_z: number; rot_y: number; rot_x: number };
    sources?: Array<{ file_name?: string } & { src_x: number; src_y: number; src_z: number; rot_z: number; rot_y: number; rot_x: number }>;
    receivers?: Array<Record<string, string | undefined> & { rcv_x: number; rcv_y: number; rcv_z: number; rot_z: number; rot_y: number; rot_x: number }>;
  }>;
}

function getAttr(obj: any, key: string): string {
  const val = obj[key];
  if (Array.isArray(val)) return val[0] || '';
  return val || '';
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
  const roomItems = root.room;
  const roomEl = roomItems && roomItems[0];
  const room = {
    width: parseFloat(getAttr(roomEl || {}, '_width')) || 0,
    height: parseFloat(getAttr(roomEl || {}, '_height')) || 0,
    originX: parseFloat(getAttr(roomEl || {}, '_origin_x')) || 0,
    originY: parseFloat(getAttr(roomEl || {}, '_origin_y') || '0') || 0,
    originZ: parseFloat(getAttr(roomEl || {}, '_origin_z')) || 0,
  };

  // Parse info
  const infoItems = root.info;
  const infoEl = infoItems && infoItems[0];
  const info = {
    data: getAttr(infoEl || {}, '_data') || '',
  };

  return { room, info, scenarios: [] };
}
