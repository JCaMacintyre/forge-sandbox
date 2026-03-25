# Sheet Template — Lead Log

This automation is designed to run as a **bound Apps Script project inside a Google Sheet**.

The script will create/validate the logging tab automatically using `createOrValidateSheet_()`.

## Tab name

Default tab name (configurable):

- `Lead Log`

(Controlled by `CONFIG.SHEET_NAME`)

## Required headers (Row 1)

The script expects the first row to contain these headers in this exact order:

1. `Timestamp`
2. `Sender Name`
3. `Email`
4. `Subject`
5. `Snippet`
6. `Reply Sent`
7. `Alert Sent`

If the sheet is empty, the script will create these headers for you.

## What if headers don’t match?

If the sheet already has data and the header row does not match the expected template:
- The script **will not overwrite** your data.
- It will log a warning to **View → Logs** so you can correct the tab manually.
