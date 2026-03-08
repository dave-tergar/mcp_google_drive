import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs";
import path from "path";

const TOKEN_PATH =
  process.env["GOOGLE_TOKEN_PATH"] ??
  path.join(
    process.env["HOME"] ?? "~",
    ".config/tergar-gdrive-mcp/tokens.json"
  );

const CLIENT_ID = process.env["GOOGLE_CLIENT_ID"];
const CLIENT_SECRET = process.env["GOOGLE_CLIENT_SECRET"];

export const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

let _client: OAuth2Client | null = null;

export function getOAuth2Client(): OAuth2Client {
  if (_client) return _client;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error(
      "Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables must be set."
    );
    process.exit(1);
  }

  const client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);

  if (!fs.existsSync(TOKEN_PATH)) {
    console.error(
      `Error: Token file not found at ${TOKEN_PATH}.\nRun 'npm run authorize' to complete the OAuth2 flow.`
    );
    process.exit(1);
  }

  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
  client.setCredentials(tokens);

  client.on("tokens", (newTokens) => {
    const existing = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    const merged = { ...existing, ...newTokens };
    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
  });

  _client = client;
  return client;
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth: getOAuth2Client() });
}
