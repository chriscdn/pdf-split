import { describe, test, expect } from "vitest";
import { PdfCpu, PDFSplitFileCache, Rotate } from "../src";
import path from "path";
import fs from "fs/promises";
import { pdfToText } from "./utils";

const pdfPassword = path.resolve(
  __dirname,
  "./pdfs/10 lorem big - password.pdf",
);
const pdf = path.resolve(__dirname, "./pdfs/lorem.pdf");

// const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const pdfCpuPaths = [
  "pdfcpu",
  path.resolve(__dirname, "./bin/pdfcpu0111"),
  path.resolve(__dirname, "./bin/pdfcpu0121"),
];

const cachePath = path.resolve(__dirname, "temp");

describe("PdfCpu class", () => {
  test("version", async () => {
    const pdfCpuLatest = new PdfCpu(pdfCpuPaths[0]);
    const pdfCpu11 = new PdfCpu(pdfCpuPaths[1]);
    const pdfCpu12 = new PdfCpu(pdfCpuPaths[2]);

    await expect(pdfCpuLatest.versionMinor()).resolves.toBe(15);
    await expect(pdfCpu11.versionMinor()).resolves.toBe(11);
    await expect(pdfCpu12.versionMinor()).resolves.toBe(12);
  });

  for (const pdfCpuPath of pdfCpuPaths) {
    const pdfCpu = new PdfCpu(pdfCpuPath);

    test("pdfInfo", async () => {
      await expect(pdfCpu.pdfInfo(pdf)).resolves.toMatchObject({
        source: pdf,
        pageCount: 4,
      });

      await expect(
        pdfCpu.pdfInfo(pdfPassword, { userPassword: "password" }),
      ).resolves.toMatchObject({
        source: pdfPassword,
        pageCount: 10,
      });
    });

    test("page count", async () => {
      await expect(pdfCpu.pageCount(pdf)).resolves.toBe(4);
      await expect(
        pdfCpu.pageCount(pdfPassword, { userPassword: "password" }),
      ).resolves.toBe(10);
    });

    test("password protection", async () => {
      await expect(pdfCpu.isPasswordProtected(pdfPassword)).resolves.toBe(true);
      await expect(pdfCpu.isPasswordProtected(pdf)).resolves.toBe(false);
    });
  }
});

describe("PDFSplitFileCache", async () => {
  test("splitPage", async () => {
    for (const pdfcpu of pdfCpuPaths) {
      await fs.mkdir(cachePath, { recursive: true });
      await fs.rm(cachePath, { recursive: true });

      const splitCache = new PDFSplitFileCache({
        pdfcpu,
        cachePath,
        ttl: 10_000,
        cleanupInterval: 5_000,
        autoCreateCachePath: true,
      });

      const filePath1 = await splitCache.getFile({
        pdfFilePath: pdf,
        pageIndex: 1,
      });

      const filePath2 = await splitCache.getFile({
        pdfFilePath: pdf,
        pageIndex: 2,
      });

      const filePathRotate = await splitCache.getFile({
        pdfFilePath: pdf,
        pageIndex: 2,
        rotate: Rotate.DEG_90,
      });

      await expect(pdfToText(filePath1)).resolves.toContain("Page 2");
      await expect(pdfToText(filePath2)).resolves.toContain("Page 3");

      await expect(splitCache.pdfCpu.pdfInfo(filePath2)).resolves.toMatchObject(
        {
          pageSizes: [{ height: 279.4, width: 215.56 }],
        },
      );

      await expect(
        splitCache.pdfCpu.pdfInfo(filePathRotate),
      ).resolves.toMatchObject({
        pageSizes: [{ width: 279.4, height: 215.56 }],
      });
    }
  });
});
