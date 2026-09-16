import { MemoizeAsync } from "@chriscdn/memoize";
import { promisify } from "util";
import { toNumberOrThrow } from "@chriscdn/to-number";
import { isDefined, isStringWithValue } from "@chriscdn/type-guards";
import { DirectoryPath, FilePath } from "@chriscdn/file-cache";
import type { InfoOptions, PDFCpuPageItem, Rotate } from "./types";
import { isPasswordRequiredException, PasswordError } from "./exceptions";
import { execFile as _execFile } from "child_process";
import { directoryExists, fileExists, parsePdfDate } from "./utils";

const execFilePromise = promisify(_execFile);

class PdfCpu {
  constructor(private pdfcpu: string = "pdfcpu") {}

  execute = async (args: string[]) => {
    try {
      const { stdout } = await execFilePromise(this.pdfcpu, args);

      // console.log("---------------------------");
      // console.log("Executing pdfcpu command");
      // console.log("---------------------------");

      return stdout;
    } catch (e) {
      if (isPasswordRequiredException(e)) {
        throw new PasswordError("This PDF is password protected.");
      } else {
        throw e;
      }
    }
  };

  version = MemoizeAsync(async () => {
    // cannot use `flags['confDisable']` here
    const versionData = await this.execute(["version"]);

    const match = versionData.match(
      /^(?:version:|pdfcpu:)\s+v?(\d+)\.(\d+)\.(\d+)(?:\s+(\S+))?/m,
    );

    if (isDefined(match)) {
      return {
        major: toNumberOrThrow(match[1]),
        minor: toNumberOrThrow(match[2]),
        patch: toNumberOrThrow(match[3]),
        channel: isStringWithValue(match[4]) ? match[4].trim() : null,
      };
    } else {
      throw new Error("Could not determine pdfcpu version");
    }
  });

  versionMajor = async () => {
    const _version = await this.version();
    return _version["major"];
  };

  versionMinor = async () => {
    const _version = await this.version();
    return _version["minor"];
  };

  flags = async () => {
    const minor = await this.versionMinor();
    // const is13 = minor >= 13;
    const is12 = minor >= 12;

    return {
      // force: is13 ? "--force" : "",
      // only on v0.12+
      confDisable: is12 ? ["--conf", "disable"] : [],
    };
  };

  _assertFileExists = async (filePath: FilePath) => {
    if (await fileExists(filePath)) {
      return filePath;
    } else {
      throw new Error(`File path does not exist: ${filePath}`);
    }
  };

  _assertDirectoryExists = async (directoryPath: DirectoryPath) => {
    if (await directoryExists(directoryPath)) {
      return directoryPath;
    } else {
      throw new Error(`Directory path does not exist: ${directoryPath}`);
    }
  };

  /**
   *
   * https://pdfcpu.io/core/optimize/
   */
  optimize = async ({
    inFile,
    outFile,
  }: {
    inFile: FilePath;
    outFile: FilePath;
  }) => {
    const flags = await this.flags();

    await this.execute([...flags["confDisable"], "optimize", inFile, outFile]);

    return await this._assertFileExists(outFile);
  };

  /**
   *
   * https://pdfcpu.io/core/split/
   *
   * @param param0
   */
  split = async ({
    inFile,
    outDir,
  }: {
    inFile: FilePath;
    outDir: DirectoryPath;
  }) => {
    const flags = await this.flags();

    await this._assertDirectoryExists(outDir);
    await this.execute([...flags["confDisable"], "split", inFile, outDir]);

    // return await this._assertFileExists(outDir);
  };

  /**
   *
   * https://pdfcpu.io/core/merge/
   *
   * @param param0
   * @returns
   */
  merge = async ({
    inFiles,
    outFile,
    optimize,
  }: {
    outFile: FilePath;
    inFiles: FilePath[];
    optimize?: boolean;
  }) => {
    const flags = await this.flags();

    await this.execute([...flags["confDisable"], "merge", outFile, ...inFiles]);

    if (optimize) {
      await this.optimize({ inFile: outFile, outFile });
    }

    return await this._assertFileExists(outFile);
  };

  /**
   * https://pdfcpu.io/info/
   */
  pdfInfo = MemoizeAsync(
    async (
      pdfFilePath: FilePath,
      options: InfoOptions = {},
    ): Promise<PDFCpuPageItem> => {
      const flags = await this.flags();

      const infoArgs = [
        ...(options.userPassword ? ["--upw", options.userPassword] : []),
        ...(options.ownerPassword ? ["--opw", options.ownerPassword] : []),
        ...["--unit", options.unit ?? "mm"],
      ];

      const response = await this.execute([
        ...flags["confDisable"],
        "info",
        "-j", // json
        ...infoArgs,
        pdfFilePath,
      ]);

      // Drop the warning text, which may appear if using pdfcpu v0.11 and the
      // "--disable conf" flag is not understood.
      const start = response.indexOf("{");

      if (start >= 0) {
        const pdfCpuInfo = JSON.parse(response.slice(start));

        if (isDefined(pdfCpuInfo.infos[0])) {
          const info = pdfCpuInfo.infos[0];

          // should we use zod here?
          return {
            ...info,
            creationDate: parsePdfDate(info.creationDate),
            modificationDate: parsePdfDate(info.modificationDate),
          } as PDFCpuPageItem;
        } else {
          throw new Error("Count not fetch pdf info.");
        }
      } else {
        throw new Error("Could not find JSON in pdfcpu output.");
      }
    },
    {},
  );

  /**
   *
   *
   *
   * @param pdfFilePath
   * @param options
   * @returns
   */
  pageCount = async (
    pdfFilePath: FilePath,
    options: InfoOptions = {},
  ): Promise<number> => {
    const _info = await this.pdfInfo(pdfFilePath, options);
    return _info.pageCount;
  };

  /**
   *
   */
  isPasswordProtected = async (pdfFilePath: FilePath) => {
    try {
      await this.pdfInfo(pdfFilePath);
      return false;
    } catch (e) {
      if (e instanceof PasswordError) {
        return true;
      } else {
        throw e;
      }
    }
  };

  /**
   *
   * https://pdfcpu.io/core/rotate/
   *
   * @param param0
   * @returns
   */
  rotate = async ({
    source,
    target,
    rotate,
    // force,
  }: {
    source: FilePath;
    target: FilePath;
    rotate: Rotate;
    // force?: boolean;
  }) => {
    const flags = await this.flags();

    await this.execute([
      ...flags["confDisable"],
      "rotate",
      source,
      rotate.toString(),
      target,
    ]);

    return await this._assertFileExists(target);
  };
}

export { PdfCpu };
