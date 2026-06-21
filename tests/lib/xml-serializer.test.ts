import { describe, it, expect } from 'vitest';
import { serializeConfigToXML } from '../../lib/xml-serializer';
import type { ConfigModel } from '../../lib/types';

const baseConfig: ConfigModel = {
  room: { width: 4, height: 4, originX: 0, originY: 0, originZ: 0 },
  info: { data: 'test' },
  scenarios: [],
};

describe('serializeConfigToXML - room', () => {
  it('serializes room element correctly', () => {
    const xml = serializeConfigToXML(baseConfig);
    expect(xml).toContain('width="4"');
    expect(xml).toContain('height="4"');
    expect(xml).toContain('origin_x="0"');
  });

  it('serializes info element', () => {
    const xml = serializeConfigToXML(baseConfig);
    expect(xml).toContain('<info data="test"');
  });
});
