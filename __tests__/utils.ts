import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// brew install poppler
const pdfToText = async (pdfFilePath: string): Promise<string> => {
  const { stdout } = await execFileAsync("pdftotext", [pdfFilePath, "-"]);
  return stdout;
};

export { pdfToText };
