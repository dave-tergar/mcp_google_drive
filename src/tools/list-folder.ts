import { getDriveClient } from "../auth.js";
import { driveError } from "./search-files.js";

export interface ListFolderArgs {
  folder_id: string;
  page_size?: number;
}

export async function listFolder(args: ListFolderArgs) {
  const drive = getDriveClient();
  const { folder_id, page_size = 30 } = args;

  try {
    const res = await drive.files.list({
      q: `'${folder_id}' in parents and trashed = false`,
      pageSize: Math.min(page_size, 100),
      fields: "files(id, name, mimeType, modifiedTime, webViewLink)",
      orderBy: "modifiedTime desc",
    });

    const files = res.data.files ?? [];
    if (files.length === 0) {
      return {
        content: [{ type: "text" as const, text: "Folder is empty or does not exist." }],
      };
    }

    const formatted = files
      .map(
        (f) =>
          `- ${f.name} (${f.mimeType})\n  ID: ${f.id}\n  Modified: ${f.modifiedTime}`
      )
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `${files.length} item(s) in folder:\n\n${formatted}`,
        },
      ],
    };
  } catch (err: unknown) {
    return driveError("list_folder", err);
  }
}
