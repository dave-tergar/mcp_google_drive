# Plan: Read-Only Google Drive MCP Server

## Context

Dave needs to read Google Drive files (Docs, Sheets, shared project docs, meeting notes) from within Claude Code sessions. No trusted community MCP server exists for Google Drive, so we build a minimal one using only two well-known dependencies: `googleapis` (Google) and `@modelcontextprotocol/sdk` (Anthropic).

The server lives in its own standalone git repo at `mcp_google_drive/` (sibling to `tergar_claude_code/`). The `tergar_claude_code` project registers it via `.mcp.json` pointing to the compiled output by absolute path.

## Directory Structure

```
/Users/dave/Dropbox/Documents/Personal/Projects/code/
├── tergar_claude_code/           ← existing project
│   └── .mcp.json                 ← registers google-drive server
└── mcp_google_drive/             ← this repo
    ├── PLAN.md                   ← this file
    ├── .gitignore
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts              ← MCP server entry, tool dispatcher
        ├── auth.ts               ← OAuth2 singleton, token load/save
        ├── authorize.ts          ← One-time OAuth2 flow (run manually once)
        └── tools/
            ├── search-files.ts
            ├── read-doc.ts
            ├── read-sheet.ts
            └── list-folder.ts
```

`dist/` (compiled output) and `node_modules/` are gitignored.

## Authentication: OAuth2 Desktop App

OAuth2 is the right pattern for a single user accessing their own Drive. Service accounts require Workspace admin setup and act as a separate identity.

**One-time setup (before first use):**
1. Google Cloud Console → create/select project → enable Drive API
2. Create OAuth2 Client ID, type: Desktop application
3. Copy Client ID and Client Secret
4. Set env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
5. `npm install && npm run build`
6. `npm run authorize` → browser opens → paste code → tokens saved to `~/.config/tergar-gdrive-mcp/tokens.json`
7. Fill in real values for `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `tergar_claude_code/.mcp.json`
8. Restart Claude Code

**Token storage:** `~/.config/tergar-gdrive-mcp/tokens.json` — outside the repo, never committed.

**Scope:** `https://www.googleapis.com/auth/drive.readonly` — minimum needed, covers all four tools.

**Auto-refresh:** `auth.ts` registers `oauth2Client.on('tokens', ...)` to rewrite the token file on new access token issuance. No re-authorization needed after initial setup.

## MCP Tools

| Tool | Description | Key API Call |
|------|-------------|--------------|
| `search_files` | Search by name or content. Params: `query` (Drive query syntax), `page_size` (default 20), `mime_type` (optional) | `drive.files.list` with `q` |
| `read_doc` | Export a Google Doc as plain text. Params: `file_id` | `drive.files.export` → `text/plain` |
| `read_sheet` | Export a Google Sheet as CSV. Params: `file_id`, `sheet_name` (optional) | `drive.files.export` → `text/csv` |
| `list_folder` | List folder contents. Params: `folder_id` (use `'root'` for My Drive), `page_size` (default 30) | `drive.files.list` with parent filter |

All tools return structured MCP error responses on API failure (no uncaught exceptions).

## Dependencies (supply chain rationale)

- `googleapis` — published by Google, official Drive API client
- `@modelcontextprotocol/sdk` — published by Anthropic, official MCP server framework
- `typescript`, `@types/node` — dev only, no runtime code shipped

No third-party MCP wrappers or community packages.

## Verification

1. `npm run build` → confirm `dist/index.js` exists
2. `npm run authorize` → browser opens, paste code, confirm `~/.config/tergar-gdrive-mcp/tokens.json` created
3. Restart Claude Code → run `/mcp` → confirm `google-drive` appears as connected
4. Ask Claude to `search_files` for a known doc in Tergar Drive
5. Ask Claude to `read_doc` with a file ID from search results
6. Ask Claude to `read_sheet` on a known spreadsheet
