/**
 * Detects a file's real type by inspecting its binary signature, not the
 * client-supplied filename or Content-Type header (both are trivially
 * spoofable). Used to both validate uploads and choose the correct
 * storage extension/content-type.
 */

export type DetectedFileType = {
  mimeType: string;
  extension: string;
  label: string;
};

const SUPPORTED: Record<string, DetectedFileType> = {
  pdf: { mimeType: "application/pdf", extension: "pdf", label: "PDF" },
  docx: {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
    label: "Word Document",
  },
  doc: { mimeType: "application/msword", extension: "doc", label: "Word Document (legacy)" },
  jpg: { mimeType: "image/jpeg", extension: "jpg", label: "JPEG Image" },
  png: { mimeType: "image/png", extension: "png", label: "PNG Image" },
  webp: { mimeType: "image/webp", extension: "webp", label: "WebP Image" },
};

function bytesStartWith(buf: Buffer, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buf[offset + i] !== sig[i]) return false;
  }
  return true;
}

/**
 * DOCX (and .doc's modern successor formats generally) are ZIP archives
 * with a specific internal file present near the start of the central
 * directory listing. A full ZIP parse is overkill here; checking for the
 * ZIP magic bytes plus the "word/" path fragment within the first few KB
 * is a reliable, cheap way to distinguish a real DOCX from an arbitrary
 * ZIP renamed to .docx.
 */
function isDocx(buf: Buffer): boolean {
  const isZip = bytesStartWith(buf, [0x50, 0x4b, 0x03, 0x04]);
  if (!isZip) return false;
  const headSlice = buf.subarray(0, Math.min(buf.length, 4096)).toString("latin1");
  return headSlice.includes("word/") || headSlice.includes("[Content_Types].xml");
}

/** Legacy .doc (OLE Compound File Binary Format) signature. */
function isLegacyDoc(buf: Buffer): boolean {
  return bytesStartWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
}

export function detectFileType(buf: Buffer): DetectedFileType | null {
  if (bytesStartWith(buf, [0x25, 0x50, 0x44, 0x46])) return SUPPORTED.pdf; // %PDF
  if (bytesStartWith(buf, [0xff, 0xd8, 0xff])) return SUPPORTED.jpg; // JPEG SOI marker
  if (bytesStartWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return SUPPORTED.png;
  if (bytesStartWith(buf, [0x52, 0x49, 0x46, 0x46]) && bytesStartWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
    return SUPPORTED.webp; // "RIFF" .... "WEBP"
  }
  if (isDocx(buf)) return SUPPORTED.docx;
  if (isLegacyDoc(buf)) return SUPPORTED.doc;
  return null;
}

export const ACCEPTED_FILE_EXTENSIONS = ".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp";
export const ACCEPTED_FILE_LABEL = "PDF, Word (.docx/.doc), or image (JPG/PNG/WebP)";
