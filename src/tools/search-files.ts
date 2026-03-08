import { getDriveClient } from "../auth.js";

export interface SearchFilesArgs {
  query: string;
  page_size?: number;
  mime_type?: string;
}

export async function searchFiles(args: SearchFilesArgs) {
  const drive = getDriveClient();
  const { query, page_size = 20, mime_type } = args;

  let q = query;
  if (mime_type) {
    q = `(${query}) and mimeType = '${mime_type}'`;
  }

  try {
    const res = await drive.files.list({
      q,
      pageSize: Math.min(page_size, 50),
      fields:
        "files(id, name, mimeType, modifiedTime, webViewLink, parents)",
      orderBy: "modifiedTime desc",
    });

    const files = res.data.files ?? [];
    if (files.length === 0) {
      return { content: [{ type: "text" as const, text: "No files found matching the query." }] };
    }

    const formatted = files
      .map(
        (f) =>
          `- ${f.name} (${f.mimeType})\n  ID: ${f.id}\n  Modified: ${f.modifiedTime}\n  URL: ${f.webViewLink ?? "—"}`
      )
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${files.length} file(s):\n\n${formatted}`,
        },
      ],
    };
  } catch (err: unknown) {
    return driveError("search_files", err);
  }
}

export function driveError(tool: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: "text" as const, text: `${tool} error: ${message}` }],
  };
}
