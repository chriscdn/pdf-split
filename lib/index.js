import { promisify } from "util";
import { exec as _exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import { FileCache } from "@chriscdn/file-cache";
import temp from "temp";
import { Semaphore } from "@chriscdn/promise-semaphore";
import { pathExists } from "path-exists";
const semaphore = new Semaphore();
const execPromise = promisify(_exec);
class PDFSplitFileCache extends FileCache {
    constructor(args) {
        super({
            ...args,
            ext: () => ".pdf",
            cb: async (filePath, { pdfFilePath, pageIndex }) => {
                try {
                    await semaphore.acquire(pdfFilePath);
                    if (await pathExists(filePath)) {
                        // all done
                    }
                    else {
                        const _thumbnailPath = await temp.mkdir("pdf-thumbnails");
                        const command = [
                            args.pdfcpu ?? "pdfcpu",
                            "split",
                            pdfFilePath,
                            _thumbnailPath,
                        ];
                        await execPromise(command.join(" "));
                        const pdfFiles = await fs.readdir(_thumbnailPath);
                        await Promise.all(pdfFiles.map(async (pdfFile) => {
                            const match = pdfFile.match(/_(\d+)\.pdf$/);
                            if (match) {
                                const _pageIndex = parseInt(match[1], 10) - 1;
                                const sourceFilePath = path.join(_thumbnailPath, pdfFile);
                                const targetFilePath = await this
                                    .resolveFilePath({
                                    pdfFilePath,
                                    pageIndex: _pageIndex,
                                });
                                await fs.mkdir(path.dirname(targetFilePath), {
                                    recursive: true,
                                });
                                // This assumes the same volume. TBD.
                                await fs.rename(sourceFilePath, targetFilePath);
                            }
                        }));
                        // After all that, check if we have a file.
                        if (await pathExists(filePath)) {
                            // all good
                        }
                        else {
                            throw new Error(`Invalid range or PDF: ${pageIndex}`);
                        }
                    }
                }
                finally {
                    semaphore.release(pdfFilePath);
                }
            },
        });
    }
}
export { PDFSplitFileCache };
//# sourceMappingURL=index.js.map