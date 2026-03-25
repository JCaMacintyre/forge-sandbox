/**
 * ============================================================
 * 5-Minute Lead Reply + Lead Log
 * Google Apps Script — forge-sandbox
 *
 * Setup:
 *  1. Paste this file into a new Google Apps Script project.
 *  2. Edit CONFIG below for your client.
 *  3. Follow README.md to create the Gmail label, Sheet, and trigger.
 * ============================================================
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────
var CONFIG = {
  // Business details (used in reply template)
  BUSINESS_NAME:   "Acme Services",
  BUSINESS_PHONE:  "(555) 123-4567",
  BUSINESS_HOURS:  "Mon–Fri 9am–5pm",
  BOOKING_LINK:    "https://calendly.com/your-link",   // leave "" to omit

  // Notification target
  OWNER_EMAIL:     "cameron.macintyre.automation@gmail.com",

  // Gmail / Sheet settings
  GMAIL_LABEL:     "Leads",
  REPLIED_LABEL:   "Replied",
  SHEET_NAME:      "Lead Log",
  REPLY_SUBJECT_PREFIX: "Re: ",    // prepended to original subject

  // Template selection: "general" | "booking" | "quote"
  DEFAULT_TEMPLATE: "general",

  /**
   * TEST_MODE = true → logs to sheet + console, but does NOT send
   * reply or alert emails. Safe to use during setup.
   */
  TEST_MODE: false,
};
// ────────────────────────────────────────────────────────────────────────────

// ─── ENTRY POINT ────────────────────────────────────────────────────────────
/**
 * Main function. Attach a time-driven trigger to this (every 5 minutes).
 */
function processLeads() {
  var repliedLabel = getOrCreateLabel_(CONFIG.REPLIED_LABEL);
  var leadsLabel   = getLeadsLabel_();
  if (!leadsLabel) {
    Logger.log("ERROR: Gmail label '" + CONFIG.GMAIL_LABEL + "' not found. Create it first.");
    return;
  }

  var sheet = getOrCreateSheet_();
  ensureSheetHeaders_(sheet);

  // Fetch unread threads with the Leads label that do NOT have Replied label
  var query = "label:" + CONFIG.GMAIL_LABEL + " is:unread -label:" + CONFIG.REPLIED_LABEL;
  var threads = GmailApp.search(query, 0, 50);

  Logger.log("Found " + threads.length + " unprocessed lead thread(s).");

  threads.forEach(function (thread) {
    try {
      processThread_(thread, sheet, repliedLabel);
    } catch (e) {
      Logger.log("ERROR processing thread " + thread.getId() + ": " + e);
    }
  });
}

// ─── CORE LOGIC ─────────────────────────────────────────────────────────────
function processThread_(thread, sheet, repliedLabel) {
  var messages    = thread.getMessages();
  var firstMsg    = messages[0];
  var lastMsg     = messages[messages.length - 1];

  var senderRaw   = firstMsg.getFrom();            // "Name <email>" or "email"
  var senderName  = extractName_(senderRaw)  || "there";
  var senderEmail = extractEmail_(senderRaw) || "";
  var subject     = firstMsg.getSubject()    || "(no subject)";
  var snippet     = firstMsg.getPlainBody().substring(0, 300).replace(/\n+/g, " ").trim();

  // ── Idempotency: skip if we already sent a reply in this thread ──────────
  if (alreadyReplied_(messages)) {
    Logger.log("Skipping thread (already replied): " + subject);
    thread.markRead();
    return;
  }

  // ── Build reply ──────────────────────────────────────────────────────────
  var templateKey = detectTemplate_(subject, snippet);
  var replyBody   = buildReplyBody_(templateKey, {
    senderName:    senderName,
    businessName:  CONFIG.BUSINESS_NAME,
    businessPhone: CONFIG.BUSINESS_PHONE,
    businessHours: CONFIG.BUSINESS_HOURS,
    bookingLink:   CONFIG.BOOKING_LINK,
  });
  var replySubject = CONFIG.REPLY_SUBJECT_PREFIX + subject;

  var replySent = false;
  var alertSent = false;

  if (CONFIG.TEST_MODE) {
    Logger.log("[TEST MODE] Would reply to: " + senderEmail);
    Logger.log("[TEST MODE] Reply subject: " + replySubject);
    Logger.log("[TEST MODE] Reply body:\n" + replyBody);
    replySent = false;
    alertSent = false;
  } else {
    // ── Send reply ────────────────────────────────────────────────────────
    if (senderEmail) {
      lastMsg.reply(replyBody, {
        subject: replySubject,
        noReply: false,
      });
      replySent = true;
      Logger.log("Replied to: " + senderEmail);
    } else {
      Logger.log("WARNING: Could not extract sender email from: " + senderRaw);
    }

    // ── Send owner alert ──────────────────────────────────────────────────
    if (CONFIG.OWNER_EMAIL) {
      var alertSubject = "🔔 New lead received: " + subject;
      var alertBody    =
        "A new lead was received and auto-replied.\n\n" +
        "From: " + senderRaw + "\n" +
        "Subject: " + subject + "\n" +
        "Snippet: " + snippet + "\n\n" +
        "Reply status: " + (replySent ? "Sent ✓" : "Not sent (no email found)") + "\n\n" +
        "-- " + CONFIG.BUSINESS_NAME + " Lead System";

      GmailApp.sendEmail(CONFIG.OWNER_EMAIL, alertSubject, alertBody);
      alertSent = true;
    }
  }

  // ── Log to sheet ──────────────────────────────────────────────────────────
  sheet.appendRow([
    new Date(),
    senderName,
    senderEmail,
    subject,
    snippet,
    replySent  ? "Yes" : (CONFIG.TEST_MODE ? "TEST MODE" : "No"),
    alertSent  ? "Yes" : (CONFIG.TEST_MODE ? "TEST MODE" : "No"),
  ]);

  // ── Mark thread as read + apply Replied label ─────────────────────────────
  thread.markRead();
  if (!CONFIG.TEST_MODE && repliedLabel) {
    thread.addLabel(repliedLabel);
  }
}

// ─── TEMPLATE DETECTION ─────────────────────────────────────────────────────
/**
 * Very simple heuristic: scan subject + snippet for keywords.
 * Returns "booking", "quote", or "general".
 */
function detectTemplate_(subject, snippet) {
  var text = (subject + " " + snippet).toLowerCase();
  if (/book|appoint|schedul|call|meet/.test(text)) return "booking";
  if (/quote|price|cost|rate|estimate|how much/.test(text)) return "quote";
  return CONFIG.DEFAULT_TEMPLATE;
}

// ─── REPLY BUILDER ──────────────────────────────────────────────────────────
function buildReplyBody_(templateKey, vars) {
  var t = TEMPLATES[templateKey] || TEMPLATES["general"];

  return t
    .replace(/{{senderName}}/g,    vars.senderName)
    .replace(/{{businessName}}/g,  vars.businessName)
    .replace(/{{businessPhone}}/g, vars.businessPhone)
    .replace(/{{businessHours}}/g, vars.businessHours)
    .replace(/{{bookingLink}}/g,   vars.bookingLink
      ? "You can also book directly here: " + vars.bookingLink
      : "");
}

// ─── TEMPLATES ──────────────────────────────────────────────────────────────
var TEMPLATES = {

  general: [
    "Hi {{senderName}},",
    "",
    "Thank you for reaching out to {{businessName}}! We received your message and someone from our team will be in touch shortly.",
    "",
    "In the meantime, feel free to reach us at:",
    "📞 {{businessPhone}}",
    "🕐 Hours: {{businessHours}}",
    "",
    "{{bookingLink}}",
    "",
    "Looking forward to connecting!",
    "",
    "Warm regards,",
    "The {{businessName}} Team",
  ].join("\n"),

  booking: [
    "Hi {{senderName}},",
    "",
    "Thanks for reaching out to {{businessName}}! We'd love to get you scheduled.",
    "",
    "{{bookingLink}}",
    "",
    "If you'd prefer to speak with someone directly, give us a call at {{businessPhone}} during {{businessHours}} and we'll get you on the calendar.",
    "",
    "Talk soon!",
    "",
    "Best,",
    "The {{businessName}} Team",
  ].join("\n"),

  quote: [
    "Hi {{senderName}},",
    "",
    "Thank you for your interest in {{businessName}}! We appreciate you asking about pricing.",
    "",
    "To make sure we give you the most accurate quote, we'd love to learn a bit more about your needs. Please give us a call at {{businessPhone}} during {{businessHours}} or reply to this email with a few more details.",
    "",
    "{{bookingLink}}",
    "",
    "We look forward to hearing from you!",
    "",
    "Best regards,",
    "The {{businessName}} Team",
  ].join("\n"),

};

// ─── HELPERS ────────────────────────────────────────────────────────────────

/** Returns true if any message in the thread was sent by us (reply detection). */
function alreadyReplied_(messages) {
  var myEmail = Session.getActiveUser().getEmail().toLowerCase();
  for (var i = 1; i < messages.length; i++) {  // skip first (original lead)
    var from = extractEmail_(messages[i].getFrom()).toLowerCase();
    if (from === myEmail) return true;
  }
  return false;
}

/** Extract "Name" from "Name <email>" or return "". */
function extractName_(raw) {
  var match = raw.match(/^([^<]+?)\s*<[^>]+>/);
  return match ? match[1].trim().replace(/^"|"$/g, "") : "";
}

/** Extract email address from "Name <email>" or plain "email". */
function extractEmail_(raw) {
  var match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return raw.trim();
}

/** Get or create Gmail label, returns GmailLabel or null. */
function getLeadsLabel_() {
  var labels = GmailApp.getUserLabels();
  for (var i = 0; i < labels.length; i++) {
    if (labels[i].getName() === CONFIG.GMAIL_LABEL) return labels[i];
  }
  return null;
}

function getOrCreateLabel_(name) {
  var labels = GmailApp.getUserLabels();
  for (var i = 0; i < labels.length; i++) {
    if (labels[i].getName() === name) return labels[i];
  }
  return GmailApp.createLabel(name);
}

/** Get or create the lead log spreadsheet tab. */
function getOrCreateSheet_() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }
  return sheet;
}

/** Add column headers if the sheet is empty. */
function ensureSheetHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp",
      "Sender Name",
      "Email",
      "Subject",
      "Snippet",
      "Reply Sent",
      "Alert Sent",
    ]);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
  }
}

// ─── SETUP HELPERS (run these once manually) ────────────────────────────────

/**
 * Run once to set up the time-driven trigger (every 5 minutes).
 * Delete existing triggers first to avoid duplicates.
 */
function setupTrigger() {
  // Remove old triggers for processLeads
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "processLeads") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("processLeads")
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log("Trigger created: processLeads every 5 minutes.");
}

/**
 * Quick sanity check — run this to verify config + permissions.
 * Does NOT send any emails; just logs what it finds.
 */
function testConfig() {
  Logger.log("=== Config Test ===");
  Logger.log("Business name : " + CONFIG.BUSINESS_NAME);
  Logger.log("Phone         : " + CONFIG.BUSINESS_PHONE);
  Logger.log("Hours         : " + CONFIG.BUSINESS_HOURS);
  Logger.log("Booking link  : " + (CONFIG.BOOKING_LINK || "(none)"));
  Logger.log("Owner email   : " + CONFIG.OWNER_EMAIL);
  Logger.log("Gmail label   : " + CONFIG.GMAIL_LABEL);
  Logger.log("Sheet name    : " + CONFIG.SHEET_NAME);
  Logger.log("Test mode     : " + CONFIG.TEST_MODE);
  Logger.log("Logged-in as  : " + Session.getActiveUser().getEmail());

  var leadsLabel = getLeadsLabel_();
  Logger.log("'Leads' label found: " + (leadsLabel ? "YES" : "NO — create it in Gmail first"));

  var sheet = getOrCreateSheet_();
  Logger.log("Sheet found/created: " + sheet.getName());

  var query = "label:" + CONFIG.GMAIL_LABEL + " is:unread -label:" + CONFIG.REPLIED_LABEL;
  var threads = GmailApp.search(query, 0, 10);
  Logger.log("Unread lead threads found: " + threads.length);

  Logger.log("=== Test complete ===");
}
