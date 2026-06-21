import { describe, it, expect } from 'vitest';
import { parseConfigXML } from '../../lib/xml-parser';

describe('parseConfigXML - room', () => {
  it('parses room dimensions and origin', () => {
    const xml = '<root><room width="4" height="4" origin_x="0.0" origin_y="0.0" origin_z="0.0"/></root>';
    const result = parseConfigXML(xml);
    expect(result.room).toEqual({
      width: 4,
      height: 4,
      originX: 0,
      originY: 0,
      originZ: 0,
    });
  });

  it('parses non-zero origin values', () => {
    const xml = '<root><room width="10" height="5" origin_x="2.5" origin_y="-1.0" origin_z="1.5"/></root>';
    const result = parseConfigXML(xml);
    expect(result.room).toEqual({
      width: 10,
      height: 5,
      originX: 2.5,
      originY: -1,
      originZ: 1.5,
    });
  });
});
