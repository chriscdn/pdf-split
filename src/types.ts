import { FilePath } from "@chriscdn/file-cache";

enum Rotate {
  DEG_0 = 0,
  DEG_90 = 90,
  DEG_180 = 180,
  DEG_270 = 270,
  DEG_MINUS_90 = -90,
  DEG_MINUS_180 = -180,
  DEG_MINUS_270 = -270,
}

type PDFSplitArgs = {
  pdfFilePath: FilePath;
  pageIndex: number; // 0-based
  rotate?: Rotate;
};

type PDFCpuPageItem = {
  source: FilePath;
  pageCount: number;
  version: string;
  title: string;
  producer: string;
  encrypted: boolean;
  pageSizes: Array<{ width: number; height: number }>;
  createor: string;
  creationDate: Date;
  modificationDate: Date;
  unit: Unit;
};

// type PDFCpuInfo = {
//   header: {
//     version: string;
//     creation: string;
//   };
//   infos: PDFCpuPageItem[];
// };

type PasswordOptions = {
  userPassword?: string;
  ownerPassword?: string;
};

type Unit = "po" | "in" | "cm" | "mm";

type InfoOptions = PasswordOptions & {
  unit?: Unit;
};

export { type InfoOptions, type PDFSplitArgs, type PDFCpuPageItem, Rotate };
