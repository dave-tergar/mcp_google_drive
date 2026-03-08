/**
 * One-time OAuth2 authorization script.
 * Run with: npm run authorize
 * Saves tokens to ~/.config/tergar-gdrive-mcp/tokens.json
 */

import { google } from "googleapis";
import fs from "fs";
import path from "path";
import readline from "readline";

const TOKEN_PATH =
  process.env["GOOGLE_TOKEN_PATH"] ??
  path.join(
    process.env["HOME"] ?? "~",
    ".config/tergar-gdrive-mcp/tokens.json"
  );

const CLIENT_ID = process.env["GOOGLE_CLIENT_ID"];
const CLIENT_SECRET = process.env["GOOGLE_CLIENT_SECRET"];
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables must be set."
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

console.log("\nOpen this URL in your browser to authorize access:\n");
console.log(authUrl);
console.log();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Paste the authorization code here: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log(`\nTokens saved to: ${TOKEN_PATH}`);
    console.log("Authorization complete. You can now start the MCP server.");
  } catch (err) {
    console.error("Error retrieving tokens:", err);
    process.exit(1);
  }
});
