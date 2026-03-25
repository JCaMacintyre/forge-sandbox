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
- You can manually apply the **Leads** label to new emails
- Or (recommended) set up Gmail filters so leads are labeled automatically — see **Auto-labeling leads (Gmail filters)** below.

---

### Auto-labeling leads (Gmail filters)

If you want the system to be truly hands-off, create Gmail filters that auto-apply the **Leads** label.

**Click path (Gmail web):**
1. Gmail → click the ⚙️ gear → **See all settings**
2. **Filters and Blocked Addresses** tab
3. **Create a new filter**
4. Fill in a rule (examples below) → click **Create filter**
5. Check **Apply the label** → choose **Leads**
6. (Optional) Check **Never send it to Spam**
7. Click **Create filter**

#### Filter recipes (common patterns)
Pick 1–2 that match the client's lead sources.

1) **Website contact form**
- *From contains:* `no-reply@` OR your site domain (e.g. `@clientdomain.com`)
- *Subject contains:* `Contact Form` / `New inquiry` / `New message`

2) **Facebook/Meta lead notifications**
- *From contains:* `@facebookmail.com`
- *Subject contains:* `New Lead`

3) **Calendly booking confirmations (treat as leads)**
- *From contains:* `@calendly.com`
- *Subject contains:* `Scheduled`

4) **Quote requests**
- *Subject contains:* `quote` OR `estimate` OR `pricing`

5) **High-intent inbox alias**
- *To:* `sales@clientdomain.com` (or `info@...` if that’s used for leads)

6) **Exclude existing customers** (optional)
Create a filter for repeat customers and do **NOT** apply the Leads label (or apply a different label).

> Tip: Keep filters simple and test with 1–2 real lead emails. Over-filtering causes missed leads.

---

### Step 2 — Create a Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a **new spreadsheet**
3. Name it anything (e.g. "Lead Log — Acme Services")
4. Leave the default "Sheet1" tab — the script will create a `Lead Log` tab automatically

(Template details: see **`SHEET-TEMPLATE.md`**.)

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

### Step 6 — Happy-path onboarding flow (recommended)

This sequence avoids accidental emails during setup.

1) In `Code.gs`, set:
```js
TEST_MODE: true,
```

2) Run **`testConfig()`**
- Confirms labels + sheet are accessible

3) Run **`setupTrigger()`**
- Installs the 5-minute trigger (and deletes any old duplicates)

4) Run **`runOnce()`**
- Executes a single pass immediately (so you don’t have to wait 5 minutes)

5) Set:
```js
TEST_MODE: false,
```

---

### Step 7 — Send a test lead

1. Send an email to the Gmail account (or apply the "Leads" label to an existing email)
2. Wait up to 5 minutes (or run `runOnce()` again)
3. Confirm:
   - ✅ Auto-reply sent to the sender
   - ✅ Alert email received by the owner
   - ✅ Row added to the Google Sheet
   - ✅ Email marked read + "Replied" label applied

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

## Quotas & limits (reliability notes)

- **Trigger cadence:** time-driven triggers run approximately every 5 minutes, but can drift slightly.
- **Gmail send quota:** Google accounts have daily email sending limits. If you hit quota, replies/alerts will fail until the quota resets.
- **Batch size:** the script processes up to **50 threads per run** (can be increased carefully if needed).
- **Errors:** per-thread errors are caught and logged. The script will continue processing other threads.

If you expect high volume, consider lowering reply/alert verbosity, limiting per-run processing, and monitoring the Sheet for errors.

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
