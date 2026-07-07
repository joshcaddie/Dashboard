# Connecting Gmail (read email history + send from your mailbox)

Schoolhub can sync each client's real Gmail conversation history and send outbound
email from your actual mailbox (so it lands in Sent + threads). It connects **per
workspace**:

- **School Websites** ↔ `joshua@websites.school.nz`
- **Caddie** ↔ `josh@caddiedigital.co.nz`

Because these are **Google Workspace** accounts, you can use an **Internal** OAuth app —
no Google security review / verification is required.

## A. One Google Cloud project per Workspace org

> If both domains live in the **same** Google Workspace organisation, you only need one
> project and one OAuth app — use the same client ID/secret for both workspaces (set the
> `*_SCHOOLWEB` and `*_CADDIE` vars to the same values, or just set the shared
> `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`). If they're **two separate** orgs, do this
> section once per org (signed in as an admin of that org).

1. Go to <https://console.cloud.google.com> → create a project (e.g. "Schoolhub CRM").
2. **APIs & Services → Library →** enable **Gmail API**.
3. **APIs & Services → OAuth consent screen:**
   - User type: **Internal** → Create.
   - App name: "Schoolhub CRM", support email: your address.
   - **Scopes →** add: `.../auth/gmail.readonly` and `.../auth/gmail.send`.
   - Save.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID:**
   - Application type: **Web application**.
   - **Authorised redirect URI:**
     `https://schoolhub-crm.onrender.com/api/gmail/callback`
   - Create → copy the **Client ID** and **Client secret**.

## B. Add the credentials in Render

In your Render service → **Environment**, add:

| Key | Value |
|---|---|
| `APP_URL` | `https://schoolhub-crm.onrender.com` |
| `GOOGLE_CLIENT_ID_SCHOOLWEB` | client ID for the School Websites org |
| `GOOGLE_CLIENT_SECRET_SCHOOLWEB` | client secret for that org |
| `GOOGLE_CLIENT_ID_CADDIE` | client ID for the Caddie org |
| `GOOGLE_CLIENT_SECRET_CADDIE` | client secret for that org |
| `GMAIL_TOKEN_KEY` | *(optional)* any long random string; encrypts stored refresh tokens |

> Same org for both domains? Set the SCHOOLWEB and CADDIE pairs to the same values,
> or set a single `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` pair instead.

Save → Render redeploys.

## C. Connect each mailbox

1. Sign in as the super admin → **Settings → Gmail connection**.
2. Click **Connect Gmail** on **School Websites** → sign in as `joshua@websites.school.nz`
   → allow. You'll bounce back with it connected.
3. Switch the workspace to **Caddie** (or just use the Caddie row) → **Connect Gmail** →
   sign in as `josh@caddiedigital.co.nz` → allow.

Done. Now:
- **Client emails** views show real Gmail history for that client's contact addresses.
- Sending an email from the app goes out through Gmail (appears in your Sent + threads).
  If a workspace isn't connected, it falls back to SMTP2GO.

## Notes
- Access is stored as an encrypted **refresh token** per workspace; disconnect anytime in
  Settings (or from your Google Account → Security → Third-party access).
- History is fetched live per client (nothing is copied into the database), matched on the
  client's contact email addresses.
