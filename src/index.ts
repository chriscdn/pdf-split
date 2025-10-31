import { promisify } from "util";
import { exec as _exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import { FileCache, FileCacheOptions, FilePath } from "@chriscdn/file-cache";
import { Semaphore } from "@chriscdn/promise-semaphore";
import { pathExists } from "path-exists";
import { PDFCpuInfo } from "./types";
import { Memoize } from "@chriscdn/memoize";

const semaphore = new Semaphore();
const execPromise = promisify(_exec);

type PDFArgs = {
    pdfFilePath: FilePath;
    pageIndex: number; // 0-based
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
        super({
            ...args,
            ext: () => ".pdf",
            cb: async (filePath, { pdfFilePath, pageIndex }) => {
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

                            if (match) {
                                // The -1 makes this 0-based
                                const _pageIndex = parseInt(match[1], 10) - 1;

                                const sourceFilePath = path.join(
                                    _thumbnailPath,
                                    pdfFile,
                                );

                                const targetFilePath = await this
                                    .resolveFilePath({
                                        pdfFilePath,
                                        pageIndex: _pageIndex,
                                    });

                                await fs.mkdir(path.dirname(targetFilePath), {
                                    recursive: true,
                                });

                                // these should always be on the same volume, making an fs.rename possible
                                await fs.rename(sourceFilePath, targetFilePath);
                            }
                        }));

                        // After all that, check if we have a file.
                        if (await pathExists(filePath)) {
                            // all good
                        } else {
                            throw new Error(
                                `Invalid range or PDF: ${pageIndex}`,
                            );
                        }
                    }
                } finally {
                    semaphore.release(pdfFilePath);
                }
            },
        });

        this.pdfcpu = args.pdfcpu ?? "pdfcpu";
        this.pdfInfo = Memoize(this.pdfInfo.bind(this));
    }

    async pdfInfo(pdfFilePath: FilePath): Promise<PDFCpuInfo> {
        const command = [
            this.pdfcpu,
            "info -json",
            quote(pdfFilePath),
        ];
        const { stdout } = await execPromise(command.join(" "));
        return JSON.parse(stdout) as PDFCpuInfo;
    }

    async pageCount(
        pdfFilePath: FilePath,
    ): Promise<PDFCpuInfo["infos"][number]["pageCount"]> {
        const pdfInfo = await this.pdfInfo(pdfFilePath);
        return pdfInfo.infos[0].pageCount;
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

export { PDFSplitFileCache };
