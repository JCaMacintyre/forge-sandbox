# Reply Templates

Three templates are built into `Code.gs`. The script picks the right one
automatically by scanning the lead's subject + snippet for keywords.

You can customize the text directly in the `TEMPLATES` object in `Code.gs`.

---

## Template 1 — General Inquiry (default)

**Triggered by:** any email that doesn't match booking or quote keywords.

```
Hi {{senderName}},

Thank you for reaching out to {{businessName}}! We received your message
and someone from our team will be in touch shortly.

In the meantime, feel free to reach us at:
📞 {{businessPhone}}
🕐 Hours: {{businessHours}}

{{bookingLink}}

Looking forward to connecting!

Warm regards,
The {{businessName}} Team
```

---

## Template 2 — Booking Request

**Triggered by:** subject or body contains `book`, `appoint`, `schedul`, `call`, `meet`.

```
Hi {{senderName}},

Thanks for reaching out to {{businessName}}! We'd love to get you scheduled.

{{bookingLink}}

If you'd prefer to speak with someone directly, give us a call at
{{businessPhone}} during {{businessHours}} and we'll get you on the calendar.

Talk soon!

Best,
The {{businessName}} Team
```

---

## Template 3 — Quote Request

**Triggered by:** subject or body contains `quote`, `price`, `cost`, `rate`, `estimate`, `how much`.

```
Hi {{senderName}},

Thank you for your interest in {{businessName}}! We appreciate you asking
about pricing.

To make sure we give you the most accurate quote, we'd love to learn a bit
more about your needs. Please give us a call at {{businessPhone}} during
{{businessHours}} or reply to this email with a few more details.

{{bookingLink}}

We look forward to hearing from you!

Best regards,
The {{businessName}} Team
```

---

## Dynamic fields

| Field | Replaced with |
|---|---|
| `{{senderName}}` | Extracted from the sender's "From" field (falls back to "there") |
| `{{businessName}}` | `CONFIG.BUSINESS_NAME` |
| `{{businessPhone}}` | `CONFIG.BUSINESS_PHONE` |
| `{{businessHours}}` | `CONFIG.BUSINESS_HOURS` |
| `{{bookingLink}}` | Replaced with "You can also book directly here: <link>" if set; removed if blank |

---

## Adding a custom template

1. Add a new key to the `TEMPLATES` object in `Code.gs`:

```js
myTemplate: [
  "Hi {{senderName}},",
  "",
  "Custom message here.",
  "",
  "Best,",
  "The {{businessName}} Team",
].join("\n"),
```

2. Update `detectTemplate_()` to return `"myTemplate"` when your keywords match.

3. Or set `CONFIG.DEFAULT_TEMPLATE = "myTemplate"` to always use it.
