# Hello Money v2.5 — Shared Operations Setup

**Status:** Backend-ready prototype. The SQL migration and optional authenticated client are committed. **No Supabase project, real user database, email provider, or cross-device service has been provisioned as part of this release.** Nothing in the old v2.1–2.4 browser-local demo is automatically synced.

## Two separate experiences

- **Public Hello Money:** https://sajankjose.github.io/hello-money/ — continues to work without sign-in.
- **Hello Money Hub (demo):** \`?hub=1\` — existing fictional roles and local data.
- **Shared Workspace (real backend path):** \`?shared=1&release=25\` — independently accessible, but explicitly says **Not connected** until an authorised project is configured.

## To enable a development environment

1. Provision a **dedicated development Supabase project** in the organisation's approved infrastructure and register this site's URLs in Supabase Auth redirect allowlist. Prefer a staging branch/domain, not public production.
2. Review and apply \`supabase/migrations/20261111_hello_money_shared_operations.sql\` with an authorised DBA. The migration creates profiles, role grants, Expert topic scopes, IAPs and audit records, row-level security, and database-checked event transitions.
3. Populate role grants **only through an approved administrator or provisioning service**, never directly from a client. New sign-ups receive **no approved roles**. Insert a profile and grant after verifying the corresponding \`auth.users\` UUID. Approve Expert scopes separately.
4. Update \`backend-config.js\` with the project's HTTPS URL and its **public publishable key**. Do **not** commit a Supabase secret or service_role key, raw personal data, access tokens or organisation credentials.
5. Configure Supabase email authentication and permitted redirect URLs. Test on an internal staging URL before exposing the shared workspace for actual users.
6. Complete a security and privacy review before first genuine event, and then test with at least 4 independent authorised accounts: Money Friend, Expert, Marketing and Programme Admin.

## What the backend implements

- One Supabase Auth identity per account.
- Separately approved role grants and topic/area/language-specific Expert scopes.
- Server-checked IAP creation, speaker selection, response, self-speaker independent confirmation, Marketing submission and decision.
- Row-level access to private events for organiser, speaker, Marketing and Programme Admin; all writes are mediated by RPCs.
- Versioned events and a per-transition audit trail.
- No anonymous viewing of private operational events and no client-side ability to grant roles.
- **No real registration or attendance migration yet**; those remain in the distinct local demo and are explicitly labelled.
- **No real messaging, public invite distribution, automatic rewards or payments.**

## Required security acceptance checks (must run against test users and a development DB)

**Test case** | **Expected**
:--|:--
Anonymous client queries IAPs or roles | Denied
Signed-in Learner creates IAP | Denied
Unapproved Money Friend creates IAP | Denied
Approved Money Friend creates a future IAP | Allowed; organiser is auth.uid()
Money Friend updates \`hm_iap_events\` directly | Denied (no UPDATE grant)
Money Friend selects an Expert with unmatched topic/area/language | Denied by RPC
Expert accepts another Expert's invitation | Denied
Expert self-accepts an event they organised | Denied
Marketing independently confirms same-person organiser+speaker | Allowed
Organiser approves their own event | Denied
Programme Admin approves Marketing event via the Marketing RPC | Denied unless separately granted Marketing permission (and not organiser/speaker)
Marketing approves an event without confirmed speaker | Denied
User without event membership reads a private event | Denied
Suspended or expired Money Friend makes a new proposal | Denied
Two actors race the same event transition | Serialized by \`FOR UPDATE\`; second sees new status and is rejected
Every accepted transition | A version increment and a correctly attributed audit row

**Important:** These are specified test cases, not claims of executed DB integration tests. Supabase's current RLS guidance recommends both allow and deny tests for every exposed table and operation. Run tests using the Supabase CLI / \`supabase test db\` and resolve findings before public use.

## Planned v2.6 boundaries

Registrations, verified attendance, consent-based communications, cancellation after approval and reward settlement will need new controlled tables/functions and transactional checks. Do not copy the localStorage registry into a production database as though it were verified attendance.

## Architecture note

The browser loads supabase-js **only when a backend is configured** and the shared workspace is opened. It uses the supplied public key plus a user auth session; the database function checks the authenticated UUID against role records. The Supabase \`service_role\` or secret key must only run in trusted server-side infrastructure.

The deployed static app remains a prototype until backend provisioning, independent security testing, event policy approval and privacy review are completed.
