import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { searchFiles, SearchFilesArgs } from "./tools/search-files.js";
import { readDoc, ReadDocArgs } from "./tools/read-doc.js";
import { readSheet, ReadSheetArgs } from "./tools/read-sheet.js";
import { listFolder, ListFolderArgs } from "./tools/list-folder.js";

const server = new Server(
  { name: "google-drive", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_files",
      description:
        "Search Google Drive for files by name or content. Supports Drive query syntax (e.g. name contains 'meeting', fullText contains 'JOL').",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Drive search query. E.g. \"name contains 'agenda'\" or \"fullText contains 'sprint'\"",
          },
          page_size: {
            type: "number",
            description: "Max results to return (default 20, max 50)",
          },
          mime_type: {
            type: "string",
            description:
              "Optional MIME type filter. E.g. 'application/vnd.google-apps.document' for Docs, 'application/vnd.google-apps.spreadsheet' for Sheets",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "read_doc",
      description: "Read the text content of a Google Doc. Returns plain text.",
      inputSchema: {
        type: "object",
        properties: {
          file_id: {
            type: "string",
            description: "The Google Drive file ID (from search_files or list_folder results)",
          },
        },
        required: ["file_id"],
      },
    },
    {
      name: "read_sheet",
      description:
        "Read a Google Sheet as CSV data. Returns the first sheet by default.",
      inputSchema: {
        type: "object",
        properties: {
          file_id: {
            type: "string",
            description: "The Google Drive file ID",
          },
          sheet_name: {
            type: "string",
            description: "Name of the specific sheet tab (optional, defaults to first sheet)",
          },
        },
        required: ["file_id"],
      },
    },
    {
      name: "list_folder",
      description:
        "List files in a Google Drive folder. Use 'root' for My Drive root.",
      inputSchema: {
        type: "object",
        properties: {
          folder_id: {
            type: "string",
            description: "The folder's Drive ID. Use 'root' for the root of My Drive.",
          },
          page_size: {
            type: "number",
            description: "Max results to return (default 30, max 100)",
          },
        },
        required: ["folder_id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "search_files":
      return searchFiles(args as SearchFilesArgs);
    case "read_doc":
      return readDoc(args as ReadDocArgs);
    case "read_sheet":
      return readSheet(args as ReadSheetArgs);
    case "list_folder":
      return listFolder(args as ListFolderArgs);
    default:
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
      };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
