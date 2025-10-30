import { PDFSplitFileCache } from "../src/index";

console.log(PDFSplitFileCache);

const splitCache = new PDFSplitFileCache({
    cachePath: "/Users/chris/Development/github/pdf-split/__tests__/temp",
    ttl: 3.6e6,
    autoCreateCachePath: true,
});

const zz = await splitCache.getFile({
    pdfFilePath:
        "/Users/chris/Development/github/pdf-split/__tests__/pdfs/1613361-1632467-content.pdf",
    // pdfFilePath:
    //     "/Users/chris/Development/github/pdf-split/__tests__/pdfs/lorem.pdf",
    pageIndex: 1,
});

console.log(zz);

splitCache.destroy();
