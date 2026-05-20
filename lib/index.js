// src/index.ts
import { promisify } from "util";
import { exec as _exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import { FileCache } from "@chriscdn/file-cache";
import { Semaphore } from "@chriscdn/promise-semaphore";
import { pathExists } from "path-exists";
import { Memoize } from "@chriscdn/memoize";
import sha1 from "sha1";
import { quote as shellQuote } from "shell-quote";

// src/exceptions.ts
var isExecException = (e) => e && typeof e === "object" && "stdout" in e && "stderr" in e;
var isPasswordRequiredException = (e) => isExecException(e) && e.stderr?.trim() === "pdfcpu: please provide the correct password";

// src/types.ts
var Rotate = /* @__PURE__ */ ((Rotate2) => {
  Rotate2[Rotate2["DEG_0"] = 0] = "DEG_0";
  Rotate2[Rotate2["DEG_90"] = 90] = "DEG_90";
  Rotate2[Rotate2["DEG_180"] = 180] = "DEG_180";
  Rotate2[Rotate2["DEG_270"] = 270] = "DEG_270";
  return Rotate2;
})(Rotate || {});

// src/index.ts
var semaphore = new Semaphore();
var execPromise = promisify(_exec);
var optionsToCLI = (options) => [
  ...options.userPassword ? ["-upw", quote(options.userPassword)] : [],
  ...options.ownerPassword ? ["-opw", quote(options.ownerPassword)] : []
];
var randomDirectoryName = (l = 16) => [...Array(l)].map(() => Math.random().toString(36)[2]).join("");
var quote = (text) => shellQuote([text]);
var PDFSplitFileCache = class extends FileCache {
  pdfcpu;
  constructor(args) {
    const cb = async (filePath, { pdfFilePath, pageIndex, rotate }) => {
      const rotateResolved = rotate ?? 0 /* DEG_0 */;
      if (rotateResolved === 0 /* DEG_0 */) {
        try {
          await semaphore.acquire(pdfFilePath);
          if (await pathExists(filePath)) {
          } else {
            const _thumbnailPath = path.resolve(
              args.cachePath,
              "_temp",
              randomDirectoryName()
            );
            await fs.mkdir(_thumbnailPath, { recursive: true });
            const command = [
              this.pdfcpu,
              "split",
              quote(pdfFilePath),
              quote(_thumbnailPath)
            ];
            await execPromise(command.join(" "));
            const pdfFiles = await fs.readdir(_thumbnailPath);
            await Promise.all(pdfFiles.map(async (pdfFile) => {
              const match = pdfFile.match(/_(\d+)\.pdf$/);
              if (match?.[1]) {
                const _pageIndex = parseInt(match[1], 10) - 1;
                const sourceFilePath = path.join(
                  _thumbnailPath,
                  pdfFile
                );
                const targetFilePath = await this.resolveFilePath({
                  pdfFilePath,
                  pageIndex: _pageIndex
                });
                await fs.mkdir(
                  path.dirname(targetFilePath),
                  {
                    recursive: true
                  }
                );
                await fs.rename(
                  sourceFilePath,
                  targetFilePath
                );
              }
            }));
            if (await pathExists(filePath)) {
            } else {
              throw new Error(
                `Invalid range or PDF: ${filePath}`
              );
            }
          }
        } finally {
          semaphore.release(pdfFilePath);
        }
      } else {
        const sourceFilePath = await this.resolveFilePath({
          pdfFilePath,
          pageIndex
        });
        await cb(sourceFilePath, {
          pdfFilePath,
          pageIndex,
          rotate: 0 /* DEG_0 */
        });
        const command = [
          this.pdfcpu,
          "rotate",
          quote(sourceFilePath),
          rotateResolved,
          quote(filePath)
        ];
        await execPromise(command.join(" "));
      }
    };
    super({
      ...args,
      ext: () => ".pdf",
      resolveCacheKey: ({ pdfFilePath, pageIndex, rotate }) => sha1(
        JSON.stringify({
          pdfFilePath,
          pageIndex,
          rotate: rotate ?? 0 /* DEG_0 */
        })
      ),
      cb
    });
    this.pdfcpu = args.pdfcpu ?? "pdfcpu";
    this.pdfInfo = Memoize(this.pdfInfo.bind(this));
  }
  async pdfInfo(pdfFilePath, options = {}) {
    const command = [
      this.pdfcpu,
      "info -json",
      ...optionsToCLI(options),
      quote(pdfFilePath)
    ];
    const { stdout } = await execPromise(command.join(" "));
    const pdfCpuInfo = JSON.parse(stdout);
    return pdfCpuInfo.infos[0];
  }
  async isPasswordProtected(pdfFilePath) {
    try {
      await this.pdfInfo(pdfFilePath);
      return false;
    } catch (e) {
      if (isPasswordRequiredException(e)) {
        return true;
      } else {
        throw e;
      }
    }
  }
  async pageCount(pdfFilePath) {
    const { pageCount } = await this.pdfInfo(pdfFilePath);
    return pageCount;
  }
  async pages(pdfFilePath) {
    const pageCount = await this.pageCount(pdfFilePath);
    return await Promise.all(
      Array.from(
        { length: pageCount },
        (_, i) => this.getFile({ pdfFilePath, pageIndex: i })
      )
    );
  }
};
export {
  PDFSplitFileCache,
  Rotate
};
//# sourceMappingURL=index.js.map