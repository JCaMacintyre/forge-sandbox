# 5-Minute Lead Reply + Lead Log

Auto-replies to incoming leads within 5 minutes and logs every lead to a Google Sheet.

**Setup time:** ~20–30 minutes  
**Requires:** A Google account (Gmail + Google Sheets + Google Apps Script)

---

## What it does

1. Watches for unread emails with the Gmail label **"Leads"**
2. Sends a professional auto-reply within 5 minutes
3. Logs every lead to a Google Sheet (Timestamp, Name, Email, Subject, Snippet, Reply Sent, Alert Sent)
4. Sends a quick alert to the business owner: "New lead received + auto-replied"
5. Marks the email as read and adds a **"Replied"** label so it never gets replied to twice

---

## Setup (do this once per client)

### Step 1 — Create Gmail labels

In Gmail:
1. Open Gmail → on the left sidebar, scroll down → click **"Create new label"**
2. Create label: **`Leads`**
3. Create label: **`Replied`**

Then set up lead routing:
- You can manually drag emails to "Leads"
- Or create a Gmail Filter: Settings → Filters → apply label "Leads" to emails matching your criteria

---

### Step 2 — Create a Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a **new spreadsheet**
3. Name it anything (e.g. "Lead Log — Acme Services")
4. Leave the default "Sheet1" tab — the script will rename it to `Lead Log` automatically

---

### Step 3 — Open Google Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete all existing code in the editor
3. **Paste the contents of `Code.gs`** into the editor
4. Click the **Save** button (💾) or press `Ctrl+S`

---

### Step 4 — Configure for your client

Edit the `CONFIG` block at the top of `Code.gs`:

```js
var CONFIG = {
  BUSINESS_NAME:   "Acme Services",          // ← change this
  BUSINESS_PHONE:  "(555) 123-4567",         // ← change this
  BUSINESS_HOURS:  "Mon–Fri 9am–5pm",        // ← change this
  BOOKING_LINK:    "https://calendly.com/...",  // ← optional, leave "" to omit

  OWNER_EMAIL:     "owner@example.com",      // ← change this (gets alert emails)

  GMAIL_LABEL:     "Leads",                  // match the label you created
  REPLIED_LABEL:   "Replied",                // match the label you created
  SHEET_NAME:      "Lead Log",               // tab name in your spreadsheet

  DEFAULT_TEMPLATE: "general",               // general | booking | quote
  TEST_MODE:        false,                   // true = log only, no emails sent
};
```

---

### Step 5 — Test the setup

1. In Apps Script, select the function **`testConfig`** from the dropdown
2. Click **Run**
3. Click **View → Logs** to see the output
4. Confirm:
   - Logged-in email is correct
   - `'Leads' label found: YES`
   - No errors

---

### Step 6 — Enable TEST MODE first (recommended)

In `Code.gs`, set:
```js
TEST_MODE: true,
```

Then label one email in Gmail as "Leads" and run `processLeads` manually.
Check the Sheet and Logs — you should see the lead logged with "TEST MODE" in the Reply/Alert columns.

Once you're happy, set `TEST_MODE: false`.

---

### Step 7 — Set up the automatic trigger

1. In Apps Script, select the function **`setupTrigger`** from the dropdown
2. Click **Run**
3. Grant permissions when prompted (Gmail + Sheets + email access)
4. Go to **Triggers** (clock icon ⏰ on the left sidebar)
5. Confirm you see: `processLeads → Time-driven → Every 5 minutes`

---

### Step 8 — Send a test lead

1. Send an email to the Gmail account (or move an existing email to the "Leads" label)
2. Wait up to 5 minutes
3. Check:
   - ✅ Auto-reply sent to the sender
   - ✅ Alert email in the owner inbox
   - ✅ Row added to the Google Sheet
   - ✅ Email marked as read + "Replied" label applied

---

## Customizing reply templates

See **`TEMPLATE.md`** for the three templates (general inquiry, booking request, quote request) and instructions for adding custom ones.

---

## Config reference

See **`.env.example`** for a full list of all CONFIG fields.

---

## Edge cases handled

| Scenario | Behavior |
|---|---|
| No sender name | Falls back to "there" in the greeting |
| Empty subject | Uses "(no subject)" |
| Already replied | Detected by checking if account sent a reply in the thread; skips |
| No email extracted | Logs the row, marks read, but skips sending reply + alert |
| Script runs twice | `alreadyReplied_()` + "Replied" label = idempotent, no double replies |
| `TEST_MODE = true` | Logs everything, sends nothing |

---

## Troubleshooting

**"'Leads' label not found"**  
→ Create the label in Gmail before running the script.

**Trigger fires but nothing happens**  
→ Run `testConfig` and check Logs for errors.

**Emails are being re-processed**  
→ The `Replied` label may not be applied. Check Permissions — the script needs Gmail write access.

**Permissions prompt keeps appearing**  
→ Run `setupTrigger` once to trigger the OAuth flow; grant all requested permissions.

---

## File structure

```
lead-reply/
├── Code.gs         ← All logic (paste into Apps Script)
├── README.md       ← This file
├── TEMPLATE.md     ← Reply template docs + customization guide
└── .env.example    ← Config fields reference
```
