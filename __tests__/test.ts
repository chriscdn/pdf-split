import { PDFSplitFileCache } from "../src/index";

const pdfFilePath =
    "/Users/chris/Development/github/pdf-split/__tests__/pdfs/s 84adb0be23686312bb53ff241e87542f686d64e9.pdf";

const splitCache = new PDFSplitFileCache({
    cachePath: "/Users/chris/Development/github/pdf-split/__tests__/temp",
    ttl: 3.6e6,
    autoCreateCachePath: true,
});

console.time("getFile");

const pages = await splitCache.pdfInfo(pdfFilePath);
console.log(pages);
// const zz = await splitCache.getFile({
//     pdfFilePath,
//     pageIndex: 1,
// });

console.timeEnd("getFile");

// console.log(zz);

splitCache.destroy();
