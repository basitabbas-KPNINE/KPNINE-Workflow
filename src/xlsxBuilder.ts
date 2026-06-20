/**
 * Pure Node.js XLSX builder — no external dependencies.
 * Generates a real .xlsx file (ZIP + XML) with multiple sheets.
 */
import { createDeflateRaw } from "zlib";

function escapeXml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""); // strip invalid XML chars
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function cellRef(col: number, row: number) {
  return `${colLetter(col)}${row}`;
}

function buildSheetXml(headers: string[], rows: (string | number)[][]): string {
  const totalCols = headers.length;
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>`;

  // Header row
  xml += `<row r="1">`;
  headers.forEach((h, ci) => {
    xml += `<c r="${cellRef(ci + 1, 1)}" t="inlineStr" s="1"><is><t>${escapeXml(h)}</t></is></c>`;
  });
  xml += `</row>`;

  // Data rows
  rows.forEach((row, ri) => {
    xml += `<row r="${ri + 2}">`;
    row.forEach((cell, ci) => {
      const val = cell ?? "";
      if (typeof val === "number") {
        xml += `<c r="${cellRef(ci + 1, ri + 2)}"><v>${val}</v></c>`;
      } else {
        xml += `<c r="${cellRef(ci + 1, ri + 2)}" t="inlineStr"><is><t>${escapeXml(String(val))}</t></is></c>`;
      }
    });
    xml += `</row>`;
  });

  xml += `</sheetData></worksheet>`;
  return xml;
}

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function deflateSync(buf: Buffer): Buffer {
  // Use deflate-raw synchronously via a workaround
  const zlib = require("zlib");
  return zlib.deflateRawSync(buf, { level: 6 });
}

function uint16LE(n: number): Buffer {
  const b = Buffer.alloc(2); b.writeUInt16LE(n); return b;
}
function uint32LE(n: number): Buffer {
  const b = Buffer.alloc(4); b.writeUInt32LE(n); return b;
}

interface ZipEntry {
  name: string;
  data: Buffer;
  compressed: Buffer;
  crc: number;
  offset: number;
}

function buildZip(files: { name: string; content: string }[]): Buffer {
  const entries: ZipEntry[] = [];
  let offset = 0;
  const localParts: Buffer[] = [];

  for (const file of files) {
    const data = Buffer.from(file.content, "utf8");
    const compressed = deflateSync(data);
    const crc = crc32(data);
    const nameBytes = Buffer.from(file.name, "utf8");

    // Local file header
    const local = Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x03, 0x04]), // signature
      uint16LE(20),          // version needed
      uint16LE(0),           // flags
      uint16LE(8),           // compression: deflate
      uint16LE(0),           // mod time
      uint16LE(0),           // mod date
      uint32LE(crc),
      uint32LE(compressed.length),
      uint32LE(data.length),
      uint16LE(nameBytes.length),
      uint16LE(0),           // extra length
      nameBytes,
      compressed,
    ]);

    entries.push({ name: file.name, data, compressed, crc, offset });
    offset += local.length;
    localParts.push(local);
  }

  // Central directory
  const cdParts: Buffer[] = [];
  for (const e of entries) {
    const nameBytes = Buffer.from(e.name, "utf8");
    cdParts.push(Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x01, 0x02]), // signature
      uint16LE(20), uint16LE(20),             // versions
      uint16LE(0),                            // flags
      uint16LE(8),                            // deflate
      uint16LE(0), uint16LE(0),               // time/date
      uint32LE(e.crc),
      uint32LE(e.compressed.length),
      uint32LE(e.data.length),
      uint16LE(nameBytes.length),
      uint16LE(0), uint16LE(0),               // extra, comment
      uint16LE(0), uint16LE(0),               // disk, attr
      uint32LE(0),                            // ext attr
      uint32LE(e.offset),                     // local header offset
      nameBytes,
    ]));
  }

  const cdBuf = Buffer.concat(cdParts);
  const cdOffset = offset;

  // End of central directory
  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4B, 0x05, 0x06]),
    uint16LE(0), uint16LE(0),
    uint16LE(entries.length), uint16LE(entries.length),
    uint32LE(cdBuf.length),
    uint32LE(cdOffset),
    uint16LE(0),
  ]);

  return Buffer.concat([...localParts, cdBuf, eocd]);
}

export interface SheetDef {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

export function buildXlsx(sheets: SheetDef[]): Buffer {
  const styleXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts><font><b/><sz val="11"/></font><font><sz val="11"/></font></fonts>
<fills><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
</styleSheet>`;

  const sheetRels = sheets.map((_, i) => ({
    id: `rId${i + 1}`,
    name: `sheet${i + 1}.xml`,
    sheetName: _.name,
  }));

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheetRels.map((s, i) => `<sheet name="${escapeXml(s.sheetName)}" sheetId="${i + 1}" r:id="${s.id}"/>`).join("\n")}
</sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetRels.map((s) => `<Relationship Id="${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/${s.name}"/>`).join("\n")}
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheetRels.map((s) => `<Override PartName="/xl/worksheets/${s.name}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const files: { name: string; content: string }[] = [
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: rootRelsXml },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml },
    { name: "xl/styles.xml", content: styleXml },
  ];

  sheets.forEach((sheet, i) => {
    files.push({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      content: buildSheetXml(sheet.headers, sheet.rows),
    });
  });

  return buildZip(files);
}
