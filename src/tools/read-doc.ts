import { getDriveClient } from "../auth.js";
import { driveError } from "./search-files.js";

export interface ReadDocArgs {
  file_id: string;
}

export async function readDoc(args: ReadDocArgs) {
  const drive = getDriveClient();

  try {
    const meta = await drive.files.get({
      fileId: args.file_id,
      fields: "id, name, mimeType",
    });

    if (meta.data.mimeType !== "application/vnd.google-apps.document") {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `read_doc only works on Google Docs. This file is '${meta.data.mimeType}'. Use read_sheet for Sheets or search_files to find the right file.`,
          },
        ],
      };
    }

    const res = await drive.files.export(
      { fileId: args.file_id, mimeType: "text/plain" },
      { responseType: "text" }
    );

    const text = typeof res.data === "string" ? res.data : String(res.data);

    return {
      content: [
        {
          type: "text" as const,
          text: `# ${meta.data.name}\n\n${text}`,
        },
      ],
    };
  } catch (err: unknown) {
    return driveError("read_doc", err);
  }
}
