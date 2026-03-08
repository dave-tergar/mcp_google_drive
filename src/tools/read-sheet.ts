import { getDriveClient } from "../auth.js";
import { driveError } from "./search-files.js";

export interface ReadSheetArgs {
  file_id: string;
  sheet_name?: string;
}

export async function readSheet(args: ReadSheetArgs) {
  const drive = getDriveClient();

  try {
    const meta = await drive.files.get({
      fileId: args.file_id,
      fields: "id, name, mimeType",
    });

    if (meta.data.mimeType !== "application/vnd.google-apps.spreadsheet") {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `read_sheet only works on Google Sheets. This file is '${meta.data.mimeType}'. Use read_doc for Docs.`,
          },
        ],
      };
    }

    const exportParams: Record<string, string> = {
      fileId: args.file_id,
      mimeType: "text/csv",
    };

    if (args.sheet_name) {
      exportParams["gid"] = args.sheet_name;
    }

    const res = await drive.files.export(
      { fileId: args.file_id, mimeType: "text/csv" },
      { responseType: "text" }
    );

    const csv = typeof res.data === "string" ? res.data : String(res.data);
    const sheetLabel = args.sheet_name ? ` (sheet: ${args.sheet_name})` : " (first sheet)";

    return {
      content: [
        {
          type: "text" as const,
          text: `# ${meta.data.name}${sheetLabel}\n\n${csv}`,
        },
      ],
    };
  } catch (err: unknown) {
    return driveError("read_sheet", err);
  }
}
