import { FileCache, FileCacheOptions, FilePath } from "@chriscdn/file-cache";
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
type PDFCpuPageInfo = {
    source: string;
    pageCount: number;
    version: string;
    title: string;
    producer: string;
    encrypted: boolean;
    pageSizes: Array<{
        width: number;
        height: number;
    }>;
};
export type PDFSplitFileCacheOptions = Omit<FileCacheOptions<PDFArgs>, "cb" | "ext"> & {
    pdfcpu?: FilePath;
};
declare class PDFSplitFileCache extends FileCache<PDFArgs> {
    private pdfcpu;
    constructor(args: PDFSplitFileCacheOptions);
    pdfInfo(pdfFilePath: FilePath): Promise<PDFCpuPageInfo>;
    pageCount(pdfFilePath: FilePath): Promise<PDFCpuPageInfo["pageCount"]>;
    pages(pdfFilePath: FilePath): Promise<FilePath[]>;
}
export { PDFSplitFileCache, Rotate };
