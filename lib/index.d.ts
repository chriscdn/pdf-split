import { FilePath, FileCache, FileCacheOptions } from '@chriscdn/file-cache';

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
    source: FilePath;
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
type Options = {
    userPassword?: string;
    ownerPassword?: string;
};

type PDFSplitFileCacheOptions = Omit<FileCacheOptions<PDFArgs>, "cb" | "ext"> & {
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

export { PDFSplitFileCache, type PDFSplitFileCacheOptions, Rotate };
