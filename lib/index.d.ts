import { FileCache, FileCacheOptions, FilePath } from "@chriscdn/file-cache";
import { PDFCpuInfo } from "./types";
type PDFArgs = {
    pdfFilePath: FilePath;
    pageIndex: number;
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
export { PDFSplitFileCache };
