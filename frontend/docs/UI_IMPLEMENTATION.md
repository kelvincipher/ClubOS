# Workspace UI update

All implementation changes are inside `frontend`. Existing Manrope font files, Vantra symbols and theme tokens are reused.

## Navigation

- Daily operations: Overview, Recruitment, Members, Events, Calendar, Tasks.
- Continuity: Knowledge, Handover, Reports.
- Workspace: Settings, Plans & billing.
- Account menu: Account & security, Updates & deadlines; administrators also see Billing operations.

The current view, club and workspace section are represented in query parameters. Reload and browser history restore these locations. Delivery project selection remains internal to the Delivery component.

## Uses existing live records

Calendar combines events and task deadlines. Reports calculate current member/task/attendance totals and export existing CSV records. Updates lists relevant open deadlines. Member details shows role, committee and assigned-task counts. Existing recruitment, events, tasks and handover actions continue using the same API routes.

## Explicitly local drafts

Club profile changes, invitations, reminder preferences, interview planning, proposed event/document changes and membership transitions can be prepared and saved in this browser. They do not publish, send invitations, schedule interviews, cancel events or change permissions. Keys include the user and club/record ID. No passwords or payment credentials are stored. These drafts are not shared across devices or users and may be lost if browser storage is cleared. UI labels explain this boundary.

The handover checklist is session-only and separate from the existing actual leadership transfer.

## Billing preview

Free/Pro comparison, monthly/six-month selection, proposed total, billing overview, transaction placeholder and administrator billing placeholders are available. The proposed Pro price is VND 79,000 per month, or VND 474,000 for six months without a discount. Saving a selection is local only. No payment endpoint, order, paid subscription or entitlement restriction is created. Payment activation is disabled. No merchant QR code or payment details are invented.

## Account controls

Profile and security information can be read. Password recovery/editing controls explain availability; they do not collect a new password or pretend to perform account changes.

## Frontend fixes

- Upcoming event blocks filter out past events before taking the first entries.
- Logout no longer invokes a post-logout directory refresh from Delivery.
- Stale directory requests cannot clear a newer session after refresh invalidation.
- HTTP 409 form failures refresh records and ask the user to reopen with current data.
- Successful modal saves attempt to restore focus to the opening control.
- Delivery errors are visible as a focused fixed alert instead of remaining above the viewport.
- Committee details are retained in the mobile member list.

## Verification

Browser checks covered desktop and 390/320px layouts, light/dark themes, calendar data, reports, plan period/total, local plan selection, invitation drafts, unavailable-payment state, and reload into the selected workspace section. No console errors were observed during those checks. Tests used a disposable in-memory API process; backend files and production data were not changed.

Preview: [Plans and billing](./ui/plans-preview.jpg).
