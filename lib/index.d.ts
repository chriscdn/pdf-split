import { FileCache, FileCacheOptions, FilePath } from "@chriscdn/file-cache";
import { PDFCpuInfo } from "./types";
declare enum Rotate {
    DEG_0 = 0,
    DEG_90 = 90,
    DEG_180 = 180,
    DEG_270 = 270
}
type PDFArgs = {
    pdfFilePath: FilePath;
    pageIndex: number;
    rotate?: Rotate;
};
export type PDFSplitFileCacheOptions = Omit<FileCacheOptions<PDFArgs>, "cb" | "ext"> & {
    pdfcpu?: FilePath;
};
declare class PDFSplitFileCache extends FileCache<PDFArgs> {
    private pdfcpu;
    constructor(args: PDFSplitFileCacheOptions);
    pdfInfo(pdfFilePath: FilePath): Promise<PDFCpuInfo>;
    pageCount(pdfFilePath: FilePath): Promise<PDFCpuInfo["infos"][number]["pageCount"]>;
    pages(pdfFilePath: FilePath): Promise<FilePath[]>;
}
export { PDFSplitFileCache, Rotate };
