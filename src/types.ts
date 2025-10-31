// this type is not official and is a subset of all fields
export type PDFCpuInfo = {
    header: {
        version: string;
        creation: string;
    };
    infos: Array<{
        source: string;
        pageCount: number;
        version: string;
        title: string;
        producer: string;
        encrypted: boolean;
    }>;
};
