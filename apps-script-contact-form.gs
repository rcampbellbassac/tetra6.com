/**
 * Tetra6 contact form backend — Google Apps Script Web App.
 *
 * Receives POSTs from tetra6.com's contact form and appends each submission
 * as a row to whichever Google Sheet this script is bound to. No credentials
 * are ever exposed client-side — this script runs server-side under your
 * Google account, and the deployed Web App URL only exposes the one action
 * coded below (append a row), not general Sheets API access.
 *
 * SETUP (one-time, in the Google Sheets/Apps Script UI — not scriptable):
 *   1. Create a new Google Sheet (e.g. "Tetra6 Contact Submissions").
 *      Add a header row: Timestamp | Name | Email | Message
 *   2. Extensions → Apps Script. Delete the default code, paste this file in.
 *   3. Deploy → New deployment → type: Web app.
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      (This does NOT expose your Sheet or account — only lets anyone POST
 *      to this one endpoint, which only appends a row. Standard pattern.)
 *   4. Authorize when prompted (first deploy only).
 *   5. Copy the Web app URL (ends in /exec) and give it to Claude to set as
 *      FORM_ENDPOINT in tetra6.com/index.html.
 *
 * Re-deploying after editing this file: Deploy → Manage deployments → edit
 * (pencil) → New version → Deploy. The URL stays the same across versions.
 */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = e.parameter;

  // Honeypot: the page's hidden "website" field should always be empty for
  // a real visitor. If it's filled, a bot filled it — don't record it.
  if (params.website) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var name = (params.name || "").toString().trim();
  var email = (params.email || "").toString().trim();
  var message = (params.message || "").toString().trim();

  if (!name || !email || !message) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "missing required field" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  sheet.appendRow([new Date(), name, email, message]);

  return ContentService.createTextOutput(
    JSON.stringify({ ok: true })
  ).setMimeType(ContentService.MimeType.JSON);
}
