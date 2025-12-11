import { PDFSplitFileCache } from "../src/index";

const pdfFilePath =
    "/Users/chris/Development/github/pdf-split/__tests__/pdfs/10 lorem big - password.pdf";

// const pdfFilePath =
//     "/Users/chris/Development/github/pdf-split/__tests__/pdfs/lorem.pdf";

const splitCache = new PDFSplitFileCache({
    cachePath: "/Users/chris/Development/github/pdf-split/__tests__/temp",
    ttl: 3.6e6,
    autoCreateCachePath: true,
});

console.time("getFile");

const pages = await splitCache.isPasswordProtected(pdfFilePath);

console.log(JSON.stringify(pages));

// const zz = await splitCache.getFile({
//     pdfFilePath,
//     pageIndex: 1,
//     rotate: Rotate.DEG_90,
// });

// console.timeEnd("getFile");

// console.log(zz);

splitCache.destroy();
