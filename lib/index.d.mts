import { DirectoryPath, FileCache, FileCacheOptions, FilePath } from "@chriscdn/file-cache";
import { Semaphore } from "@chriscdn/promise-semaphore";
//#region src/types.d.ts
declare enum Rotate {
  DEG_0 = 0,
  DEG_90 = 90,
  DEG_180 = 180,
  DEG_270 = 270,
  DEG_MINUS_90 = -90,
  DEG_MINUS_180 = -180,
  DEG_MINUS_270 = -270
}
type PDFSplitArgs = {
  pdfFilePath: FilePath;
  pageIndex: number;
  rotate?: Rotate;
};
type PDFCpuPageItem = {
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
  createor: string;
  creationDate: Date;
  modificationDate: Date;
  unit: Unit;
};
type PasswordOptions = {
  userPassword?: string;
  ownerPassword?: string;
};
type Unit = "po" | "in" | "cm" | "mm";
type InfoOptions = PasswordOptions & {
  unit?: Unit;
};
//#endregion
//#region src/pdf-cpu.d.ts
declare class PdfCpu {
  private pdfcpu;
  constructor(pdfcpu?: string);
  execute: (args: string[]) => Promise<string>;
  version: {
    (): Promise<{
      major: number;
      minor: number;
      patch: number;
      channel: string | null;
    }>;
    cache: {
      get: (key: string) => {
        major: number;
        minor: number;
        patch: number;
        channel: string | null;
      } | undefined;
      has: (key: string) => boolean;
      peek: (key: string) => {
        major: number;
        minor: number;
        patch: number;
        channel: string | null;
      } | undefined;
      delete: (key: string) => boolean;
      clear: () => void;
      expiresIn: (key: string) => number | undefined;
      resize: (maxSize: number) => void;
      readonly size: number;
      readonly maxSize: number;
      readonly maxAge: number;
      evict: (count?: number) => void;
    };
    clear: () => void;
    delete: () => boolean;
    expiresIn: () => number | undefined;
    has: () => boolean;
    set: (args: [], value: {
      major: number;
      minor: number;
      patch: number;
      channel: string | null;
    }, options?: {
      maxAge: number;
    }) => void;
  };
  versionMajor: () => Promise<number>;
  versionMinor: () => Promise<number>;
  flags: () => Promise<{
    confDisable: string[];
  }>;
  _assertFileExists: (filePath: FilePath) => Promise<string>;
  _assertDirectoryExists: (directoryPath: DirectoryPath) => Promise<string>;
  /**
   *
   * https://pdfcpu.io/core/optimize/
   */
  optimize: ({ inFile, outFile }: {
    inFile: FilePath;
    outFile: FilePath;
  }) => Promise<string>;
  /**
   *
   * https://pdfcpu.io/core/split/
   *
   * @param param0
   */
  split: ({ inFile, outDir }: {
    inFile: FilePath;
    outDir: DirectoryPath;
  }) => Promise<void>;
  /**
   *
   * https://pdfcpu.io/core/merge/
   *
   * @param param0
   * @returns
   */
  merge: ({ inFiles, outFile, optimize }: {
    outFile: FilePath;
    inFiles: FilePath[];
    optimize?: boolean;
  }) => Promise<string>;
  /**
   * https://pdfcpu.io/info/
   */
  pdfInfo: {
    (pdfFilePath: string, options?: InfoOptions | undefined): Promise<PDFCpuPageItem>;
    cache: {
      get: (key: string) => PDFCpuPageItem | undefined;
      has: (key: string) => boolean;
      peek: (key: string) => PDFCpuPageItem | undefined;
      delete: (key: string) => boolean;
      clear: () => void;
      expiresIn: (key: string) => number | undefined;
      resize: (maxSize: number) => void;
      readonly size: number;
      readonly maxSize: number;
      readonly maxAge: number;
      evict: (count?: number) => void;
    };
    clear: () => void;
    delete: (pdfFilePath: string, options?: InfoOptions | undefined) => boolean;
    expiresIn: (pdfFilePath: string, options?: InfoOptions | undefined) => number | undefined;
    has: (pdfFilePath: string, options?: InfoOptions | undefined) => boolean;
    set: (args: [pdfFilePath: string, options?: InfoOptions | undefined], value: PDFCpuPageItem, options?: {
      maxAge: number;
    }) => void;
  };
  /**
   *
   *
   *
   * @param pdfFilePath
   * @param options
   * @returns
   */
  pageCount: (pdfFilePath: FilePath, options?: InfoOptions) => Promise<number>;
  /**
   *
   */
  isPasswordProtected: (pdfFilePath: FilePath) => Promise<boolean>;
  /**
   *
   * https://pdfcpu.io/core/rotate/
   *
   * @param param0
   * @returns
   */
  rotate: ({ source, target, rotate }: {
    source: FilePath;
    target: FilePath;
    rotate: Rotate;
  }) => Promise<string>;
}
//#endregion
//#region src/pdf-split-file-cache.d.ts
type PDFSplitFileCacheOptions = Omit<FileCacheOptions<PDFSplitArgs>, "cb" | "ext"> & {
  pdfcpu?: FilePath;
};
declare class PDFSplitFileCache extends FileCache<PDFSplitArgs> {
  pdfCpu: PdfCpu;
  semaphore: Semaphore;
  constructor(args: PDFSplitFileCacheOptions);
}
//#endregion
export { PDFSplitFileCache, type PDFSplitFileCacheOptions, PdfCpu, Rotate };
//# sourceMappingURL=index.d.mts.map