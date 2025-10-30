import { FileCache, FileCacheOptions, FilePath } from "@chriscdn/file-cache";
type PDFArgs = {
    pdfFilePath: FilePath;
    pageIndex: number;
};
export type PDFSplitFileCacheOptions = Omit<FileCacheOptions<PDFArgs>, "cb" | "ext"> & {
    pdfcpu?: FilePath;
};
declare class PDFSplitFileCache extends FileCache<PDFArgs> {
    constructor(args: PDFSplitFileCacheOptions);
}
export { PDFSplitFileCache };
