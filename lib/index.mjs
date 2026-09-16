import path from "path";
import fs from "fs/promises";
import { FileCache } from "@chriscdn/file-cache";
import { Semaphore } from "@chriscdn/promise-semaphore";
import sha1 from "sha1";
import { randomId } from "@chriscdn/random";
import { toNumberOrThrow } from "@chriscdn/to-number";
import { MemoizeAsync } from "@chriscdn/memoize";
import { promisify } from "util";
import { isDefined, isStringWithValue } from "@chriscdn/type-guards";
import { execFile } from "child_process";
import { toDate } from "@chriscdn/to-date";
//#region src/types.ts
var Rotate = /* @__PURE__ */ function(Rotate) {
	Rotate[Rotate["DEG_0"] = 0] = "DEG_0";
	Rotate[Rotate["DEG_90"] = 90] = "DEG_90";
	Rotate[Rotate["DEG_180"] = 180] = "DEG_180";
	Rotate[Rotate["DEG_270"] = 270] = "DEG_270";
	Rotate[Rotate["DEG_MINUS_90"] = -90] = "DEG_MINUS_90";
	Rotate[Rotate["DEG_MINUS_180"] = -180] = "DEG_MINUS_180";
	Rotate[Rotate["DEG_MINUS_270"] = -270] = "DEG_MINUS_270";
	return Rotate;
}(Rotate || {});
//#endregion
//#region src/exceptions.ts
const isExecException = (error) => {
	return typeof error === "object" && error !== null && "code" in error && ("cmd" in error || "killed" in error || "signal" in error);
};
var PasswordError = class extends Error {};
/**
*
*
* @param e
* @returns
*/
const isPasswordRequiredException = (e) => {
	if (isExecException(e)) return String(e.stderr).trim().includes("please provide the correct password");
	else return false;
};
//#endregion
//#region src/utils.ts
const parsePdfDate = (pdfDateStr) => {
	const matches = pdfDateStr.match(/^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([Z+\-])?(\d{2})?'?(\d{2})?'?/);
	if (!matches) throw new Error("Invalid PDF date format");
	const [_, year, month, day, hour, minute, second, tzSign, tzHour, tzMin] = matches;
	let isoTz = "Z";
	if (tzSign && tzSign !== "Z" && tzHour) isoTz = `${tzSign}${tzHour}:${tzMin || "00"}`;
	const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}${isoTz}`;
	return toDate(isoString) ?? null;
};
const fileExists = async (filePath) => {
	try {
		return (await fs.stat(filePath)).isFile();
	} catch (error) {
		if (error instanceof Error && error.code === "ENOENT") return false;
		else throw error;
	}
};
const directoryExists = async (dirPath) => {
	try {
		return (await fs.stat(dirPath)).isDirectory();
	} catch (error) {
		if (error instanceof Error && error.code === "ENOENT") return false;
		else throw error;
	}
};
//#endregion
//#region src/pdf-cpu.ts
const execFilePromise = promisify(execFile);
var PdfCpu = class {
	pdfcpu;
	constructor(pdfcpu = "pdfcpu") {
		this.pdfcpu = pdfcpu;
	}
	execute = async (args) => {
		try {
			const { stdout } = await execFilePromise(this.pdfcpu, args);
			return stdout;
		} catch (e) {
			if (isPasswordRequiredException(e)) throw new PasswordError("This PDF is password protected.");
			else throw e;
		}
	};
	version = MemoizeAsync(async () => {
		const match = (await this.execute(["version"])).match(/^(?:version:|pdfcpu:)\s+v?(\d+)\.(\d+)\.(\d+)(?:\s+(\S+))?/m);
		if (isDefined(match)) return {
			major: toNumberOrThrow(match[1]),
			minor: toNumberOrThrow(match[2]),
			patch: toNumberOrThrow(match[3]),
			channel: isStringWithValue(match[4]) ? match[4].trim() : null
		};
		else throw new Error("Could not determine pdfcpu version");
	});
	versionMajor = async () => {
		return (await this.version())["major"];
	};
	versionMinor = async () => {
		return (await this.version())["minor"];
	};
	flags = async () => {
		return { confDisable: await this.versionMinor() >= 12 ? ["--conf", "disable"] : [] };
	};
	_assertFileExists = async (filePath) => {
		if (await fileExists(filePath)) return filePath;
		else throw new Error(`File path does not exist: ${filePath}`);
	};
	_assertDirectoryExists = async (directoryPath) => {
		if (await directoryExists(directoryPath)) return directoryPath;
		else throw new Error(`Directory path does not exist: ${directoryPath}`);
	};
	/**
	*
	* https://pdfcpu.io/core/optimize/
	*/
	optimize = async ({ inFile, outFile }) => {
		const flags = await this.flags();
		await this.execute([
			...flags["confDisable"],
			"optimize",
			inFile,
			outFile
		]);
		return await this._assertFileExists(outFile);
	};
	/**
	*
	* https://pdfcpu.io/core/split/
	*
	* @param param0
	*/
	split = async ({ inFile, outDir }) => {
		const flags = await this.flags();
		await this._assertDirectoryExists(outDir);
		await this.execute([
			...flags["confDisable"],
			"split",
			inFile,
			outDir
		]);
	};
	/**
	*
	* https://pdfcpu.io/core/merge/
	*
	* @param param0
	* @returns
	*/
	merge = async ({ inFiles, outFile, optimize }) => {
		const flags = await this.flags();
		await this.execute([
			...flags["confDisable"],
			"merge",
			outFile,
			...inFiles
		]);
		if (optimize) await this.optimize({
			inFile: outFile,
			outFile
		});
		return await this._assertFileExists(outFile);
	};
	/**
	* https://pdfcpu.io/info/
	*/
	pdfInfo = MemoizeAsync(async (pdfFilePath, options = {}) => {
		const flags = await this.flags();
		const infoArgs = [
			...options.userPassword ? ["--upw", options.userPassword] : [],
			...options.ownerPassword ? ["--opw", options.ownerPassword] : [],
			...["--unit", options.unit ?? "mm"]
		];
		const response = await this.execute([
			...flags["confDisable"],
			"info",
			"-j",
			...infoArgs,
			pdfFilePath
		]);
		const start = response.indexOf("{");
		if (start >= 0) {
			const pdfCpuInfo = JSON.parse(response.slice(start));
			if (isDefined(pdfCpuInfo.infos[0])) {
				const info = pdfCpuInfo.infos[0];
				return {
					...info,
					creationDate: parsePdfDate(info.creationDate),
					modificationDate: parsePdfDate(info.modificationDate)
				};
			} else throw new Error("Count not fetch pdf info.");
		} else throw new Error("Could not find JSON in pdfcpu output.");
	}, {});
	/**
	*
	*
	*
	* @param pdfFilePath
	* @param options
	* @returns
	*/
	pageCount = async (pdfFilePath, options = {}) => {
		return (await this.pdfInfo(pdfFilePath, options)).pageCount;
	};
	/**
	*
	*/
	isPasswordProtected = async (pdfFilePath) => {
		try {
			await this.pdfInfo(pdfFilePath);
			return false;
		} catch (e) {
			if (e instanceof PasswordError) return true;
			else throw e;
		}
	};
	/**
	*
	* https://pdfcpu.io/core/rotate/
	*
	* @param param0
	* @returns
	*/
	rotate = async ({ source, target, rotate }) => {
		const flags = await this.flags();
		await this.execute([
			...flags["confDisable"],
			"rotate",
			source,
			rotate.toString(),
			target
		]);
		return await this._assertFileExists(target);
	};
};
//#endregion
//#region src/pdf-split-file-cache.ts
var PDFSplitFileCache = class extends FileCache {
	pdfCpu;
	semaphore = new Semaphore();
	constructor(args) {
		const cb = async (filePath, { pdfFilePath, pageIndex, rotate }) => {
			const rotateResolved = rotate ?? 0;
			if (rotateResolved === 0) try {
				await this.semaphore.acquire(pdfFilePath);
				if (await fileExists(filePath)) {} else {
					const _thumbnailPath = path.resolve(args.cachePath, "_temp", randomId());
					await fs.mkdir(_thumbnailPath, { recursive: true });
					await this.pdfCpu.split({
						inFile: pdfFilePath,
						outDir: _thumbnailPath
					});
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
					if (await fileExists(filePath)) {} else throw new Error(`Invalid range or PDF: ${filePath}`);
				}
			} finally {
				this.semaphore.release(pdfFilePath);
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
				await this.pdfCpu.rotate({
					source: sourceFilePath,
					target: filePath,
					rotate: rotateResolved
				});
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
		this.pdfCpu = new PdfCpu(args.pdfcpu ?? "pdfcpu");
	}
};
//#endregion
export { PDFSplitFileCache, PdfCpu, Rotate };

//# sourceMappingURL=index.mjs.map