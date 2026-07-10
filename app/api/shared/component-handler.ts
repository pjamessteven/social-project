import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";
import { promisify } from "util";

const VALID_EXTENSIONS = [".tsx", ".jsx"];

export type Item = {
  type: string;
  filename: string;
  code: string;
};

function filterDuplicateFiles(files: string[]): string[] {
  const fileMap = new Map<string, string>();

  for (const file of files) {
    const type = path.basename(file, path.extname(file));

    if (fileMap.has(type)) {
      const existingFile = fileMap.get(type)!;
      // Prefer .tsx files
      if (file.endsWith(".tsx") && !existingFile.endsWith(".tsx")) {
        console.warn(`Preferring ${file} over ${existingFile}`);
        fileMap.set(type, file);
      }
    } else {
      fileMap.set(type, file);
    }
  }
  return Array.from(fileMap.values());
}

/**
 * Validates that the resolved directory path is within the expected base
 * directory. Prevents path traversal attacks (e.g., ../../etc/passwd).
 */
function validateDirectoryPath(directory: string): string | null {
  const resolved = path.resolve(directory);
  const baseResolved = path.resolve(
    process.env.DETRANS_COMPONENTS_DIR || "components/detrans",
  );

  // The resolved path must start with the base directory
  if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
    return null;
  }

  return resolved;
}

export async function handleComponentRoute(
  directory: string,
  itemTypes?: readonly string[],
): Promise<NextResponse> {
  try {
    // Validate path to prevent traversal
    const safePath = validateDirectoryPath(directory);
    if (!safePath) {
      return NextResponse.json(
        { error: "Invalid directory path" },
        { status: 403 },
      );
    }

    const exists = await promisify(fs.exists)(safePath);
    if (!exists) {
      return NextResponse.json(
        { error: `Directory not found at ${safePath}` },
        { status: 404 },
      );
    }

    const filesInDir = await promisify(fs.readdir)(safePath);
    const validFiles = filesInDir.filter((file) =>
      VALID_EXTENSIONS.includes(path.extname(file)),
    );
    let filesToProcess = filterDuplicateFiles(validFiles);

    if (itemTypes?.length) {
      // Specific item types provided (e.g., for layouts "header", "footer")
      filesToProcess = filesToProcess.filter((file) =>
        itemTypes.includes(path.basename(file, path.extname(file))),
      );
    }

    const items: Item[] = await Promise.all(
      filesToProcess.map(async (file) => {
        const filePath = path.join(safePath, file);
        const content = await promisify(fs.readFile)(filePath, "utf-8");
        return {
          type: path.basename(file, path.extname(file)),
          code: content,
          filename: file,
        };
      }),
    );

    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return NextResponse.json(
      { error: `Failed to read directory ${directory}` },
      { status: 500 },
    );
  }
}
