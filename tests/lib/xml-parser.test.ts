import { describe, it, expect } from 'vitest';
import { parseConfigXML } from '../../lib/xml-parser';

describe('parseConfigXML - room', () => {
  it('parses room dimensions and origin', () => {
    const xml = '<root><room width="4" height="4" origin_x="0.0" origin_y="0.0" origin_z="0.0"/></root>';
    const result = parseConfigXML(xml);
    expect(result.room).toEqual({
      width: 4,
      depth: 4,
      height: 0,
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
      depth: 5,
      height: 0,
      originX: 2.5,
      originY: -1,
      originZ: 1.5,
    });
  });
});

describe('parseConfigXML - scenarios', () => {
  it('parses single locked source with multiple receivers (each with single file_name)', () => {
    const xml = `<root>
      <scenario locked="source" name="Source locked">
        <source src_x="2.0" src_y="2.0" src_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
        <receivers>
          <receiver file_name="rirs/01.wav" rcv_x="0.5" rcv_y="0.5" rcv_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
          <receiver file_name="rirs/02.wav" rcv_x="0.5" rcv_y="1.5" rcv_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
        </receivers>
      </scenario>
    </root>`;
    const result = parseConfigXML(xml);
    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0].name).toBe('Source locked');
    expect(result.scenarios[0].locked).toBe('source');
    expect(result.scenarios[0].lockedSource).toBeDefined();
    expect(result.scenarios[0].lockedSource!.src_x).toBe(2);
    expect(result.scenarios[0].lockedSource!.src_y).toBe(2);
    expect(result.scenarios[0].lockedSource!.src_z).toBe(0);
    expect(result.scenarios[0].lockedSource!.rot_z).toBe(0);
    expect(result.scenarios[0].lockedSource!.rot_y).toBe(90);
    expect(result.scenarios[0].lockedSource!.rot_x).toBe(0);
    expect(result.scenarios[0].receivers).toHaveLength(2);
    expect(result.scenarios[0].receivers![0]._file_name).toBe('rirs/01.wav');
    expect(result.scenarios[0].receivers![1]._file_name).toBe('rirs/02.wav');
  });

  it('parses single locked receiver with multiple sources (each with single file_name)', () => {
    const xml = `<root>
      <scenario locked="receiver" name="Receiver locked">
        <receiver rcv_x="2.0" rcv_y="2.0" rcv_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
        <sources>
          <source file_name="rirs/03.wav" src_x="0.5" src_y="2.5" src_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
          <source file_name="rirs/04.wav" src_x="0.5" src_y="3.5" src_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
        </sources>
      </scenario>
    </root>`;
    const result = parseConfigXML(xml);
    expect(result.scenarios[0].locked).toBe('receiver');
    expect(result.scenarios[0].lockedReceiver).toBeDefined();
    expect(result.scenarios[0].lockedReceiver!.rcv_x).toBe(2);
    expect(result.scenarios[0].sources).toHaveLength(2);
    expect(result.scenarios[0].sources![0]._file_name).toBe('rirs/03.wav');
    expect(result.scenarios[0].sources![1]._file_name).toBe('rirs/04.wav');
  });

  it('parses multiple sources as source_1..N with multi-file receivers (matrix)', () => {
    const xml = `<root>
      <scenario locked="source" name="Multiple sources locked">
        <source_1 src_x="0.5" src_y="3.5" src_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
        <source_2 src_x="1.5" src_y="3.5" src_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
        <source_3 src_x="2.5" src_y="3.5" src_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
        <source_4 src_x="3.5" src_y="3.5" src_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
        <receivers>
          <receiver file_name_1="rirs/01.wav" file_name_2="rirs/02.wav" file_name_3="rirs/03.wav" file_name_4="rirs/04.wav" rcv_x="0.5" rcv_y="1.5" rcv_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
          <receiver file_name_1="rirs/05.wav" file_name_2="rirs/06.wav" file_name_3="rirs/07.wav" file_name_4="rirs/08.wav" rcv_x="1.5" rcv_y="1.5" rcv_z="0.0" rot_z="0" rot_y="90" rot_x="0"/>
        </receivers>
      </scenario>
    </root>`;
    const result = parseConfigXML(xml);
    expect(result.scenarios[0].locked).toBe('source');
    expect(result.scenarios[0].lockedSources || []).toHaveLength(4);
  });
});
