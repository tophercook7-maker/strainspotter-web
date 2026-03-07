# v1.1 Release Checklist (Stability, Clarity, Trust)

Use this checklist before shipping v1.1. Keep scope tight; no partners or external dependencies are required.

## 1) Functional Checks (Required)
- Scan flow: “Document plant” CTA works; scan saves; post-scan confirmation renders; no language encouraging re-scan.
- Grow Logbook: timeline renders for a grow; add entry saves and appears instantly; empty state explains purpose.
- Measurements: measurement can be added; list updates immediately; baseline hints render when historical data exists.
- Grow Doctor: diagnoses render; confidence + severity language follows rules; no urgency language appears.
- Personal Chat: messages save and load; AI responds only when explicitly asked; context (grow / scan / diagnosis) attaches correctly.

## 2) No Dead Buttons Guarantee
- Audit every visible button: routes work; unavailable features are hidden; no “coming soon”; no placeholder clicks.

## 3) Scanner Philosophy Enforcement
- No notifications asking users to scan; no badges on scan button.
- No copy suggesting validation or urgency.
- Post-scan reassurance is always present.

## 4) AI Cost Safety Check
- No background AI calls; no AI on page load; no AI on idle.
- Chat AI only fires via “Ask the Garden”.
- Scan summaries are cached when possible.

## 5) Copy & Tone Pass
- Remove forbidden language: “should”, “must”, “urgent”, “immediately”, “verify”.
- Confirm calm, observational tone throughout.

## 6) Empty States & First Use
- No blank screens.
- Every empty state explains purpose and offers a valid next step.

## 7) Performance & Stability
- No infinite spinners; no blocking loaders.
- Pages render with partial data.
- Errors fail quietly and safely.

## Final Step
- Complete this checklist before shipping v1.1 to ensure a confident, low-stress release with no scope reopen.

