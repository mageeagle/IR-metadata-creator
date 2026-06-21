import { XMLBuilder } from 'fast-xml-parser';
import type { ConfigModel, Source, Receiver } from './types';

function toXmlAttr(val: number): string {
  return String(Math.round(val * 1000) / 1000);
}

function formatPositionXml(srcOrRcv: 'src' | 'rcv', pos: { x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }): string {
  const p = srcOrRcv === 'src' ? 'src_' : 'rcv_';
  return ` ${p}x="${toXmlAttr(pos.x)}" ${p}y="${toXmlAttr(pos.y)}" ${p}z="${toXmlAttr(pos.z)}" rot_z="${toXmlAttr(pos.rotZ)}" rot_y="${toXmlAttr(pos.rotY)}" rot_x="${toXmlAttr(pos.rotX)}"`;
}

function serializeSourceToXml(source: Source, isLocked: boolean, index: number | null): string {
  const tag = isLocked && index !== null ? `source_${index + 1}` : 'source';
  const attrs = formatPositionXml('src', source.position);
  if (source.filePath) {
    return `<${tag} file_name="${source.filePath}"${attrs}/>`;
  }
  return `<${tag}${attrs}/>`;
}

function serializeReceiverToXml(receiver: Receiver, hasMultipleSources: boolean): string {
  const prefix = 'rcv_';
  let attrs = ` ${prefix}x="${toXmlAttr(receiver.position.x)}" ${prefix}y="${toXmlAttr(receiver.position.y)}" ${prefix}z="${toXmlAttr(receiver.position.z)}" rot_z="${toXmlAttr(receiver.position.rotZ)}" rot_y="${toXmlAttr(receiver.position.rotY)}" rot_x="${toXmlAttr(receiver.position.rotX)}"`;

  if (hasMultipleSources) {
    for (let i = 0; i < receiver.fileNames.length; i++) {
      if (receiver.fileNames[i]) {
        attrs += ` file_name_${i + 1}="${receiver.fileNames[i]}"`;
      }
    }
  } else if (receiver.fileNames[0]) {
    attrs = ` file_name="${receiver.fileNames[0]}"` + attrs;
  }

  return `<receiver${attrs}/>`;
}

export function serializeConfigToXML(config: ConfigModel): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '_',
    format: false,
    cdataPadding: '',
  });

  let xml = '<root>\n\n';

  // Room
  xml += `\t<room width="${toXmlAttr(config.room.width)}" height="${toXmlAttr(config.room.height)}" origin_x="${toXmlAttr(config.room.originX)}" origin_y="${toXmlAttr(config.room.originY)}" origin_z="${toXmlAttr(config.room.originZ)}"/>\n`;

  // Info
  if (config.info.data) {
    xml += `\n\t<info data="${config.info.data}"/>\n`;
  }

  // Scenarios
  for (const scenario of config.scenarios) {
    const lockedAttr = scenario.locked !== 'none' ? ` locked="${scenario.locked}"` : '';
    xml += `\n\t<scenario name="${scenario.name}"${lockedAttr}>\n`;

    // Locked sources (multiple)
    for (let i = 0; i < scenario.lockedSources.length; i++) {
      const src = scenario.lockedSources[i];
      xml += `\t\t<source_${i + 1}${formatPositionXml('src', { x: parseFloat(String(src.src_x || 0)), y: parseFloat(String(src.src_y || 0)), z: parseFloat(String(src.src_z || 0)), rotX: 0, rotY: parseFloat(String(src.rot_y || 0)), rotZ: parseFloat(String(src.rot_z || 0)) })}/>`;
    }

    // Locked receiver (single)
    if (scenario.lockedReceiver) {
      xml += `\t\t<receiver${formatPositionXml('rcv', { x: parseFloat(String(scenario.lockedReceiver.rcv_x || 0)), y: parseFloat(String(scenario.lockedReceiver.rcv_y || 0)), z: parseFloat(String(scenario.lockedReceiver.rcv_z || 0)) as number, rotX: 0, rotY: parseFloat(String(scenario.lockedReceiver.rot_y || 0)), rotZ: parseFloat(String(scenario.lockedReceiver.rot_z || 0)) as number })}/>`;
    }

    // Moving sources (wrapped in <sources>)
    if (scenario.sources.length > 0) {
      xml += '\t\t<sources>\n';
      for (const src of scenario.sources) {
        const isLocked = !!src.isLocked;
        const idx = isLocked ? scenario.lockedSources.indexOf(src) : null;
        // For moving sources, we always use 'source' tag (not source_N)
        if (src.filePath) {
          xml += `\t\t\t<source file_name="${src.filePath}"${formatPositionXml('src', src.position)}/>`;
        } else {
          xml += `\t\t\t<source${formatPositionXml('src', src.position)}/>`;
        }
      }
      xml += '\t\t</sources>\n';
    }

    // Moving receivers (wrapped in <receivers>)
    if (scenario.receivers.length > 0) {
      const hasMultipleSources = scenario.lockedSources.length > 1 || scenario.sources.length > 1;
      xml += '\t\t<receivers>\n';
      for (const rcv of scenario.receivers) {
        xml += `\t\t\t${serializeReceiverToXml(rcv, hasMultipleSources)}`;
      }
      xml += '\t\t</receivers>\n';
    }

    // Single locked source at root (not part of lockedSources array)
    if (scenario.locked && !scenario.lockedSources?.length && scenario.sources?.length === 0) {
      // Check if there's a single source that should be at root
      const singleSrc = scenario.sources?.find(s => s.isLocked);
      if (singleSrc) {
        xml += `\t\t<source${formatPositionXml('src', singleSrc.position)}/>`;
      }
    }

    xml += '\t</scenario>\n';
  }

  xml += '\n</root>';
  return xml;
}
