import { FilePath } from "@chriscdn/file-cache";

enum Rotate {
    DEG_0 = 0,
    DEG_90 = 90,
    DEG_180 = 180,
    DEG_270 = 270,
}

type PDFArgs = {
    pdfFilePath: FilePath;
    pageIndex: number; // 0-based
    rotate?: Rotate;
};

type PDFCpuPageInfo = {
    source: FilePath;
    pageCount: number;
    version: string;
    title: string;
    producer: string;
    encrypted: boolean;
    pageSizes: Array<{ width: number; height: number }>;
};

type PDFCpuInfo = {
    header: {
        version: string;
        creation: string;
    };
    infos: PDFCpuPageInfo[];
};

type Options = {
    userPassword?: string;
    ownerPassword?: string;
};

export {
    type Options,
    type PDFArgs,
    type PDFCpuInfo,
    type PDFCpuPageInfo,
    Rotate,
};
