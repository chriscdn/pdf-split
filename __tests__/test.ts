import { fileURLToPath } from "url";
import { PDFSplitFileCache, Rotate } from "../src";
import path from "path";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename);

const cachePath = path.resolve(__dirname, "temp");
const inFile = path.resolve(__dirname, "./pdfs/lorem.pdf");

// const bin1 = "pdfcpu";
// const bin2 =
//   "/Users/chris/Development/github/pdf-split/__tests__/bin/pdfcpu0111";
// const bin3 =
//   "/Users/chris/Development/github/pdf-split/__tests__/bin/pdfcpu0121";

const splitCache = new PDFSplitFileCache({
  // pdfcpu: bin3,
  cachePath,
  ttl: 10_000,
  autoCreateCachePath: true,
  cleanupInterval: 5_000,
});

const zz = await splitCache.getFile({
  pdfFilePath: inFile,
  pageIndex: 1,
  rotate: Rotate.DEG_90,
});

// console.timeEnd("getFile");

// console.log(zz);

// splitCache.destroy();

// const pdfCpu = new PdfCpu();

// const outDir = path.resolve(__dirname, "./temp/_temp/zzz");

// await fs.mkdir(outDir, { recursive: true });

// pdfCpu.split({
//   inFile,
//   outDir,
// });
