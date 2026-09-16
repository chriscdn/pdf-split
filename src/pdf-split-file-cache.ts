import path from "path";
import fs from "fs/promises";
import { FileCache, FileCacheOptions, FilePath } from "@chriscdn/file-cache";
import { Semaphore } from "@chriscdn/promise-semaphore";

import sha1 from "sha1";
import { type PDFSplitArgs, Rotate } from "./types";
import { randomId } from "@chriscdn/random";
import { toNumberOrThrow } from "@chriscdn/to-number";
import { PdfCpu } from "./pdf-cpu";
import { fileExists } from "./utils";

type PDFSplitFileCacheOptions = Omit<
  FileCacheOptions<PDFSplitArgs>,
  "cb" | "ext"
> & {
  pdfcpu?: FilePath;
};

class PDFSplitFileCache extends FileCache<PDFSplitArgs> {
  public pdfCpu: PdfCpu;
  semaphore = new Semaphore();

  constructor(args: PDFSplitFileCacheOptions) {
    // Make a standalone function that can be recursively called.
    const cb = async (
      filePath: FilePath,
      { pdfFilePath, pageIndex, rotate }: PDFSplitArgs,
    ) => {
      const rotateResolved = rotate ?? Rotate.DEG_0;

      if (rotateResolved === Rotate.DEG_0) {
        try {
          // The semaphore prevents multiple consecutive calls (with
          // different page numbers) from running the full extraction
          // again.
          await this.semaphore.acquire(pdfFilePath);

          if (await fileExists(filePath)) {
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
              randomId(),
            );

            await fs.mkdir(_thumbnailPath, { recursive: true });

            await this.pdfCpu.split({
              inFile: pdfFilePath,
              outDir: _thumbnailPath,
            });

            const pdfFiles = await fs.readdir(_thumbnailPath);

            await Promise.all(
              pdfFiles.map(async (pdfFile) => {
                const match = pdfFile.match(/_(\d+)\.pdf$/);

                if (match?.[1]) {
                  // The -1 makes this 0-based
                  const _pageIndex = toNumberOrThrow(match[1]) - 1;

                  const sourceFilePath = path.join(_thumbnailPath, pdfFile);

                  const targetFilePath = await this.resolveFilePath({
                    pdfFilePath,
                    pageIndex: _pageIndex,
                  });

                  await fs.mkdir(path.dirname(targetFilePath), {
                    recursive: true,
                  });

                  // same volume, making an fs.rename possible
                  await fs.rename(sourceFilePath, targetFilePath);
                }
              }),
            );

            // After all that, check if we have a file.
            if (await fileExists(filePath)) {
              // all good
            } else {
              throw new Error(`Invalid range or PDF: ${filePath}`);
            }
          }
        } finally {
          this.semaphore.release(pdfFilePath);
        }
      } else {
        const sourceFilePath = await this.resolveFilePath({
          pdfFilePath,
          pageIndex,
        });

        await cb(sourceFilePath, {
          pdfFilePath,
          pageIndex,
          rotate: Rotate.DEG_0,
        });

        await this.pdfCpu.rotate({
          source: sourceFilePath,
          target: filePath,
          rotate: rotateResolved,
          // force: true,
        });
      }
    };

    super({
      ...args,
      ext: () => ".pdf",
      resolveCacheKey: ({ pdfFilePath, pageIndex, rotate }) =>
        sha1(
          JSON.stringify({
            pdfFilePath,
            pageIndex,
            rotate: rotate ?? Rotate.DEG_0,
          }),
        ),
      cb,
    });

    // this.pdfcpu = args.pdfcpu ?? "pdfcpu";
    this.pdfCpu = new PdfCpu(args.pdfcpu ?? "pdfcpu");
  }
}

export { PDFSplitFileCache, Rotate, type PDFSplitFileCacheOptions };
