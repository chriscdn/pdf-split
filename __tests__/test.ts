import { PDFSplitFileCache } from "../src/index";

const splitCache = new PDFSplitFileCache({
    cachePath: "/Users/chris/Development/github/pdf-split/__tests__/temp",
    ttl: 3.6e6,
    autoCreateCachePath: true,
});

console.time("getFile");
const zz = await splitCache.getFile({
    pdfFilePath:
        "/Users/chris/Development/github/pdf-split/__tests__/pdfs/84adb0be23686312bb53ff241e87542f686d64e9.pdf",
    // "/Users/chris/Development/github/pdf-split/__tests__/pdfs/1613361-1632467-content.pdf",
    // pdfFilePath:
    //     "/Users/chris/Development/github/pdf-split/__tests__/pdfs/lorem.pdf",
    pageIndex: 1,
});

console.timeEnd("getFile");

console.log(zz);

splitCache.destroy();
