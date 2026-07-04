import { createCanvas } from "canvas";

// pdfjs-dist ships as ESM-only; the "legacy" build targets non-browser environments (no DOM/worker requirements).
async function loadPdfjs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

export class PdfRasterizeError extends Error {
  pageCount: number;
  constructor(message: string, pageCount: number) {
    super(message);
    this.name = "PdfRasterizeError";
    this.pageCount = pageCount;
  }
}

interface RasterizeOptions {
  dpi?: number;
}

const DEFAULT_DPI = 150;
const PDF_POINTS_PER_INCH = 72;

// Renders each page of a PDF to a PNG buffer at the given DPI. Downstream code (optimizeImage)
// handles final web-quality resizing/compression, so this only needs to rasterize at a
// print-legible resolution, not full scan quality.
export async function rasterizePdf(buffer: Buffer, opts: RasterizeOptions = {}): Promise<Buffer[]> {
  const dpi = opts.dpi ?? DEFAULT_DPI;
  const scale = dpi / PDF_POINTS_PER_INCH;

  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const pageBuffers: Buffer[] = [];

  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext("2d");

        await page.render({
          canvas: canvas as unknown as HTMLCanvasElement,
          canvasContext: context as unknown as CanvasRenderingContext2D,
          viewport,
        }).promise;

        pageBuffers.push(canvas.toBuffer("image/png"));
        page.cleanup();
      } catch (err: any) {
        throw new PdfRasterizeError(
          `Failed to rasterize page ${pageNum}: ${err?.message ?? "unknown error"}`,
          pageBuffers.length
        );
      }
    }
  } finally {
    await loadingTask.destroy();
  }

  return pageBuffers;
}
