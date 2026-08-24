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
 *
 * NOTIFICATIONS: each submission emails NOTIFY_EMAIL (set below) with the
 * message body, and sets Reply-To to the sender so you can reply directly
 * from your inbox. Google's daily MailApp quota on a consumer account is
 * 100 emails/day — far beyond what a contact form will use. If the send ever
 * fails, the submission is still written to the Sheet first, so nothing is
 * lost; the error is logged to the Apps Script execution log instead.
 *
 * The first re-deploy after adding email will re-prompt for authorization,
 * because sending mail is a new permission the earlier version didn't need.
 */

// Where submission notifications are sent. Change this to whichever address
// you actually watch. It's fine to leave in the repo — it's just an inbox
// address, not a secret, and the script itself is what holds the access.
var NOTIFY_EMAIL = "robert.rcampbell@gmail.com";

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

  // Notify by email. Wrapped so a mail failure (quota, transient error) can
  // never lose the submission — the row is already saved above either way.
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: "tetra6.com contact form — " + name,
      replyTo: email,
      body:
        "New contact form submission from tetra6.com\n\n" +
        "Name:    " + name + "\n" +
        "Email:   " + email + "\n" +
        "Time:    " + new Date() + "\n\n" +
        "Message:\n" + message + "\n\n" +
        "---\n" +
        "Reply directly to this email to respond to them.\n" +
        "Full log: " + SpreadsheetApp.getActiveSpreadsheet().getUrl() + "\n"
    });
  } catch (err) {
    // Log to the Apps Script execution log rather than failing the request.
    console.error("Notification email failed: " + err);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ ok: true })
  ).setMimeType(ContentService.MimeType.JSON);
}
