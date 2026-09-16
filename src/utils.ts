import { toDate } from "@chriscdn/to-date";
import fs from "fs/promises";

const parsePdfDate = (pdfDateStr: string) => {
  // Regex captures: Year(4), Month(2), Day(2), Hour(2), Minute(2), Second(2), and the Timezone Offset
  const regex =
    /^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([Z+\-])?(\d{2})?'?(\d{2})?'?/;
  const matches = pdfDateStr.match(regex);

  if (!matches) {
    throw new Error("Invalid PDF date format");
  }

  // Extract matched parts
  const [_, year, month, day, hour, minute, second, tzSign, tzHour, tzMin] =
    matches;

  // Format the timezone offset so Javascript can read it (e.g., +00'00' becomes +00:00 or Z)
  let isoTz = "Z"; // Default to UTC
  if (tzSign && tzSign !== "Z" && tzHour) {
    isoTz = `${tzSign}${tzHour}:${tzMin || "00"}`;
  }

  // Construct standard ISO 8601 string: YYYY-MM-DDTHH:mm:ss.sssZ
  const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}${isoTz}`;

  return toDate(isoString) ?? null;
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (error) {
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return false;
    } else {
      throw error;
    }
  }
};

const directoryExists = async (dirPath: string): Promise<boolean> => {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return false;
    } else {
      throw error;
    }
  }
};

export { parsePdfDate, fileExists, directoryExists };
