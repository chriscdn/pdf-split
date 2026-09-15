import { promisify } from "util";
import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import { FileCache } from "@chriscdn/file-cache";
import { Semaphore } from "@chriscdn/promise-semaphore";
import { pathExists } from "path-exists";
import { MemoizeAsync } from "@chriscdn/memoize";
import sha1 from "sha1";
import { quote } from "shell-quote";
import { randomId } from "@chriscdn/random";
import { toNumberOrThrow } from "@chriscdn/to-number";
//#region src/exceptions.ts
const isExecException = (e) => e && typeof e === "object" && "stdout" in e && "stderr" in e;
const isPasswordRequiredException = (e) => isExecException(e) && e.stderr?.trim() === "pdfcpu: please provide the correct password";
//#endregion
//#region src/types.ts
var Rotate = /* @__PURE__ */ function(Rotate) {
	Rotate[Rotate["DEG_0"] = 0] = "DEG_0";
	Rotate[Rotate["DEG_90"] = 90] = "DEG_90";
	Rotate[Rotate["DEG_180"] = 180] = "DEG_180";
	Rotate[Rotate["DEG_270"] = 270] = "DEG_270";
	return Rotate;
}(Rotate || {});
//#endregion
//#region src/index.ts
const semaphore = new Semaphore();
const execPromise = promisify(exec);
const optionsToCLI = (options) => [...options.userPassword ? ["--upw", quote$1(options.userPassword)] : [], ...options.ownerPassword ? ["--opw", quote$1(options.ownerPassword)] : []];
const quote$1 = (text) => quote([text]);
var PDFSplitFileCache = class extends FileCache {
	pdfcpu;
	constructor(args) {
		const cb = async (filePath, { pdfFilePath, pageIndex, rotate }) => {
			const rotateResolved = rotate ?? 0;
			if (rotateResolved === 0) try {
				await semaphore.acquire(pdfFilePath);
				if (await pathExists(filePath)) {} else {
					const _thumbnailPath = path.resolve(args.cachePath, "_temp", randomId());
					await fs.mkdir(_thumbnailPath, { recursive: true });
					const command = [
						this.pdfcpu,
						"split",
						quote$1(pdfFilePath),
						quote$1(_thumbnailPath)
					];
					await execPromise(command.join(" "));
					const pdfFiles = await fs.readdir(_thumbnailPath);
					await Promise.all(pdfFiles.map(async (pdfFile) => {
						const match = pdfFile.match(/_(\d+)\.pdf$/);
						if (match?.[1]) {
							const _pageIndex = toNumberOrThrow(match[1]) - 1;
							const sourceFilePath = path.join(_thumbnailPath, pdfFile);
							const targetFilePath = await this.resolveFilePath({
								pdfFilePath,
								pageIndex: _pageIndex
							});
							await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
							await fs.rename(sourceFilePath, targetFilePath);
						}
					}));
					if (await pathExists(filePath)) {} else throw new Error(`Invalid range or PDF: ${filePath}`);
				}
			} finally {
				semaphore.release(pdfFilePath);
			}
			else {
				const sourceFilePath = await this.resolveFilePath({
					pdfFilePath,
					pageIndex
				});
				await cb(sourceFilePath, {
					pdfFilePath,
					pageIndex,
					rotate: 0
				});
				const command = [
					this.pdfcpu,
					"rotate",
					quote$1(sourceFilePath),
					rotateResolved,
					quote$1(filePath)
				];
				await execPromise(command.join(" "));
			}
		};
		super({
			...args,
			ext: () => ".pdf",
			resolveCacheKey: ({ pdfFilePath, pageIndex, rotate }) => sha1(JSON.stringify({
				pdfFilePath,
				pageIndex,
				rotate: rotate ?? 0
			})),
			cb
		});
		this.pdfcpu = args.pdfcpu ?? "pdfcpu";
		this.pdfInfo = MemoizeAsync(this.pdfInfo.bind(this));
	}
	async pdfInfo(pdfFilePath, options = {}) {
		const command = [
			this.pdfcpu,
			"info --json",
			...optionsToCLI(options),
			quote$1(pdfFilePath)
		];
		const { stdout } = await execPromise(command.join(" "));
		return JSON.parse(stdout).infos[0];
	}
	async isPasswordProtected(pdfFilePath) {
		try {
			await this.pdfInfo(pdfFilePath);
			return false;
		} catch (e) {
			if (isPasswordRequiredException(e)) return true;
			else throw e;
		}
	}
	async pageCount(pdfFilePath) {
		const { pageCount } = await this.pdfInfo(pdfFilePath);
		return pageCount;
	}
	async pages(pdfFilePath) {
		const pageCount = await this.pageCount(pdfFilePath);
		return await Promise.all(Array.from({ length: pageCount }, (_, i) => this.getFile({
			pdfFilePath,
			pageIndex: i
		})));
	}
};
//#endregion
export { PDFSplitFileCache, Rotate };

//# sourceMappingURL=index.mjs.map