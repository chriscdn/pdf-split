import { promisify } from "util";
import { exec as _exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import { FileCache, FileCacheOptions, FilePath } from "@chriscdn/file-cache";
import { Semaphore } from "@chriscdn/promise-semaphore";
import { pathExists } from "path-exists";

import { Memoize } from "@chriscdn/memoize";
import sha1 from "sha1";

const semaphore = new Semaphore();
const execPromise = promisify(_exec);

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
    source: string;
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

export type PDFSplitFileCacheOptions =
    & Omit<
        FileCacheOptions<PDFArgs>,
        "cb" | "ext"
    >
    & {
        pdfcpu?: FilePath;
    };

const randomDirectoryName = (l = 16) =>
    [...Array(l)].map(() => Math.random().toString(36)[2]).join("");

const quote = (text: string) => `"${text}"`;

class PDFSplitFileCache extends FileCache<PDFArgs> {
    private pdfcpu: FilePath;

    constructor(args: PDFSplitFileCacheOptions) {
        // Make a standalone function that can be recursively called.
        const cb = async (
            filePath: FilePath,
            { pdfFilePath, pageIndex, rotate }: PDFArgs,
        ) => {
            const rotateResolved = rotate ?? Rotate.DEG_0;

            if (rotateResolved === Rotate.DEG_0) {
                try {
                    // The semaphore prevents multiple consecutive calls (with
                    // different page numbers) from running the full extraction
                    // again.
                    await semaphore.acquire(pdfFilePath);

                    if (await pathExists(filePath)) {
                        // all done
                    } else {
                        // Create a _temp directory in the cache directory to
                        // hold the temp files. This guarantees the temp files
                        // are stored on the same volume, which removes problems
                        // moving the files later.
                        //
                        // Orphaned files and empty directories are cleaned up
                        // by FileCache.
                        const _thumbnailPath = path.resolve(
                            args.cachePath,
                            "_temp",
                            randomDirectoryName(),
                        );

                        await fs.mkdir(_thumbnailPath, { recursive: true });

                        const command = [
                            this.pdfcpu,
                            "split",
                            quote(pdfFilePath),
                            quote(_thumbnailPath),
                        ];

                        console.time("pdfcpu - split");
                        await execPromise(command.join(" "));
                        console.timeEnd("pdfcpu - split");

                        const pdfFiles = await fs.readdir(_thumbnailPath);

                        await Promise.all(pdfFiles.map(async (pdfFile) => {
                            const match = pdfFile.match(/_(\d+)\.pdf$/);

                            if (match?.[1]) {
                                // The -1 makes this 0-based
                                const _pageIndex = parseInt(match[1], 10) -
                                    1;

                                const sourceFilePath = path.join(
                                    _thumbnailPath,
                                    pdfFile,
                                );

                                const targetFilePath = await this
                                    .resolveFilePath({
                                        pdfFilePath,
                                        pageIndex: _pageIndex,
                                    });

                                await fs.mkdir(
                                    path.dirname(targetFilePath),
                                    {
                                        recursive: true,
                                    },
                                );

                                // these should always be on the same volume, making an fs.rename possible
                                await fs.rename(
                                    sourceFilePath,
                                    targetFilePath,
                                );
                            }
                        }));

                        // After all that, check if we have a file.
                        if (await pathExists(filePath)) {
                            // all good
                        } else {
                            throw new Error(
                                `Invalid range or PDF: ${filePath}`,
                            );
                        }
                    }
                } finally {
                    semaphore.release(pdfFilePath);
                }
            } else {
                const sourceFilePath = await this
                    .resolveFilePath({
                        pdfFilePath,
                        pageIndex,
                    });

                await cb(sourceFilePath, {
                    pdfFilePath,
                    pageIndex,
                    rotate: Rotate.DEG_0,
                });

                const command = [
                    this.pdfcpu,
                    "rotate",
                    quote(sourceFilePath),
                    rotateResolved,
                    filePath,
                ];

                console.time("pdfcpu - rotate");
                await execPromise(command.join(" "));
                console.timeEnd("pdfcpu - rotate");
            }
        };

        super({
            ...args,
            ext: () => ".pdf",
            resolveCacheKey: ({ pdfFilePath, pageIndex, rotate }) => {
                return sha1(
                    JSON.stringify({
                        pdfFilePath,
                        pageIndex,
                        rotate: rotate ?? Rotate.DEG_0,
                    }),
                );
            },
            cb,
        });

        this.pdfcpu = args.pdfcpu ?? "pdfcpu";
        this.pdfInfo = Memoize(this.pdfInfo.bind(this));
    }

    async pdfInfo(pdfFilePath: FilePath): Promise<PDFCpuPageInfo> {
        const command = [
            this.pdfcpu,
            "info -json",
            quote(pdfFilePath),
        ];
        const { stdout } = await execPromise(command.join(" "));
        const pdfCpuInfo = JSON.parse(stdout) as PDFCpuInfo;
        return pdfCpuInfo.infos[0]!;
    }

    async pageCount(
        pdfFilePath: FilePath,
    ): Promise<PDFCpuPageInfo["pageCount"]> {
        const pdfInfo = await this.pdfInfo(pdfFilePath);
        return pdfInfo.pageCount;
    }

    async pages(
        pdfFilePath: FilePath,
    ): Promise<FilePath[]> {
        const pageCount = await this.pageCount(pdfFilePath);

        return await Promise.all(
            Array.from(
                { length: pageCount },
                (_, i) => this.getFile({ pdfFilePath, pageIndex: i }),
            ),
        );
    }
}

export { PDFSplitFileCache, Rotate };
