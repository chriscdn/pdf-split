import { FileCache, FileCacheOptions, FilePath } from "@chriscdn/file-cache";
import { type Options, type PDFArgs, type PDFCpuPageInfo, Rotate } from "./types";
export type PDFSplitFileCacheOptions = Omit<FileCacheOptions<PDFArgs>, "cb" | "ext"> & {
    pdfcpu?: FilePath;
};
declare class PDFSplitFileCache extends FileCache<PDFArgs> {
    private pdfcpu;
    constructor(args: PDFSplitFileCacheOptions);
    pdfInfo(pdfFilePath: FilePath, options?: Options): Promise<PDFCpuPageInfo>;
    isPasswordProtected(pdfFilePath: FilePath): Promise<boolean>;
    pageCount(pdfFilePath: FilePath): Promise<PDFCpuPageInfo["pageCount"]>;
    pages(pdfFilePath: FilePath): Promise<FilePath[]>;
}
export { PDFSplitFileCache, Rotate };
