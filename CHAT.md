# Chat: Planning & Building mcp_google_drive

**Date:** 2026-03-08
**Participants:** Dave DuBois, Claude (Sonnet 4.6)
**Outcome:** Planned and built a read-only Google Drive MCP server for Claude Code

---

## How to connect Google Drive to Claude Code

**Dave:** I need to connect Claude Code to Google Drive (my Tergar International account). How to do this in Claude Code? (It's connected in my claude.ai customization settings.)

**Claude:** The key insight: Claude Code does not automatically inherit MCP connections from claude.ai. They are separate systems.

Options:
- **Community MCP server** — Several exist (e.g. `@modelcontextprotocol/server-gdrive`) but none are guaranteed safe
- **Claude.ai integration** — Only available in the browser at claude.ai, doesn't transfer to Claude Code

Follow-up question: What do you want to pull from Google Drive? The answer might change the approach.

---

## Are there guaranteed, known safe community Google Drive MCP servers?

**Dave:** Are there guaranteed, known safe community Google Drive MCP Servers?

**Claude:** Honest answer: No.

- The official `modelcontextprotocol/servers` repo includes a Google Drive server, but its current state can't be verified without live web access
- There is no official Google-published MCP server for Google Drive
- "Community" MCP servers carry inherent supply-chain risk — they run locally with whatever permissions you grant
- Given this is a work Google account, the risk calculus is higher than a personal account

---

## Does writing your own MCP server reduce supply-chain risk?

**Dave:** Does writing my own MCP server reduce or even eliminate the supply-chain risk? Or does that come inherently with any package dependencies?

**Claude:** Writing your own server significantly reduces supply-chain risk, but doesn't eliminate it — the residual risk lives in your dependencies.

**You control:**
- The code that runs against your Google account
- What OAuth scopes you request (read-only vs. full access)
- What data gets passed to Claude vs. dropped
- No unknown third-party code between your Drive and Claude

**You still depend on:**
- `googleapis` npm package — published by Google, low risk
- `@modelcontextprotocol/sdk` — published by Anthropic, low risk
- Their transitive dependencies — smaller, more auditable surface than a random community server

**Comparison:**

| | Community server | Your own server |
|---|---|---|
| Unknown author code | Yes | No |
| Auditable? | Theoretically, but large | Yes — you wrote it |
| Dependency surface | Large, unknown | Small, well-known publishers |
| OAuth scope control | Whatever they chose | You choose |
| Maintenance | Depends on stranger | You own it |

For a work Google account with sensitive project data, writing your own is the right call if you're comfortable with a bit of Node.js.

---

## Planning the server

**Dave:** Yes, please plan that out.

**Claude:** *(Explored the tergar_claude_code project structure, then ran a Plan agent to design the architecture.)*

Key decisions made during planning:

**Authentication: OAuth2 Desktop App** (not Service Account)
- Service accounts require Workspace admin setup and act as a separate identity
- OAuth2 Desktop App is correct for a single user accessing their own Drive
- One-time browser authorization flow; tokens stored at `~/.config/tergar-gdrive-mcp/tokens.json` (outside the repo)
- Scope: `drive.readonly` only

**Four MCP tools:**
- `search_files` — Drive query syntax, optional MIME type filter
- `read_doc` — Exports Google Doc as plain text
- `read_sheet` — Exports Google Sheet as CSV
- `list_folder` — Lists folder contents by ID

**Dependencies only:**
- `googleapis` (Google) — official Drive API client
- `@modelcontextprotocol/sdk` (Anthropic) — official MCP server framework
- `typescript`, `@types/node` — dev only, no runtime exposure

**Dave:** I'd like to create a new directory (sibling level with current directory, named mcp_google_drive), save this plan in the new directory along with this chat, add that directory to GitHub, and proceed from there.

*(Plan updated to reflect standalone repo at `mcp_google_drive/`.)*

---

## Building the server

Claude created the following files:

```
mcp_google_drive/
├── PLAN.md
├── CHAT.md                     ← this file
├── .gitignore
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                ← MCP server entry, tool dispatcher
    ├── auth.ts                 ← OAuth2 singleton, token load/save/auto-refresh
    ├── authorize.ts            ← One-time browser auth flow
    └── tools/
        ├── search-files.ts
        ├── read-doc.ts
        ├── read-sheet.ts
        └── list-folder.ts
```

Also created in `tergar_claude_code/`:
- `.mcp.json` — registers the server for use in that project
- `.gitignore` — excludes `.DS_Store`

Repo pushed to: https://github.com/dave-tergar/mcp_google_drive

---

## Does enabling the Drive API require Google Workspace admin access?

**Dave:** Does Step 1 (enabling Drive API in Google Cloud Console) mean I would need Admin access?

**Claude:** No — and it's worth being precise:

**Creating a Google Cloud project and enabling an API requires no Workspace admin access.** Any Google account holder can:
- Create a Google Cloud project
- Enable APIs on that project
- Create OAuth2 credentials for it

You can do this with a personal Gmail account and use it to access your Tergar Drive.

**The one case where Workspace admin matters:** If Tergar International has OAuth app restrictions configured (a policy that blocks users from authorizing third-party apps), you might hit an "access blocked" screen during `npm run authorize`.

**Recommended path:** Create the Cloud project under your personal Google account (dave.dubois@gmail.com). You can still authorize it to access your Tergar Drive during the OAuth flow. This sidesteps any Workspace restrictions entirely.

You'll know immediately when you run `npm run authorize` — either it works, or Google explicitly tells you admin approval is needed.

---

## Next steps to activate the server

1. **Google Cloud Console** (use personal Google account):
   - Create a project (or use an existing one)
   - Enable the Google Drive API
   - Create an OAuth2 Client ID, type: **Desktop application**
   - Copy the Client ID and Client Secret

2. **Fill in `.mcp.json`** in `tergar_claude_code/` — replace `YOUR_CLIENT_ID_HERE` and `YOUR_CLIENT_SECRET_HERE` with real values

3. In `mcp_google_drive/`:
   ```bash
   npm install && npm run build
   ```

4. Run the one-time authorization:
   ```bash
   npm run authorize
   ```
   Browser opens → sign in with Tergar account → paste code back → tokens saved to `~/.config/tergar-gdrive-mcp/tokens.json`

5. **Restart Claude Code** → run `/mcp` → confirm `google-drive` appears as connected

6. Test:
   - Ask Claude to `search_files` for a known doc name
   - Ask Claude to `read_doc` with a file ID from the results
   - Ask Claude to `read_sheet` on a known spreadsheet
