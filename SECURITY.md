# Security notes

## Where secrets live (and never reach git)

| Secret | File | Committed? |
| --- | --- | --- |
| OCM_API_KEY (Open Charge Map) | `backend/.env` | ❌ git-ignored |
| API_KEY (optional POST guard) | `backend/.env` | ❌ git-ignored |
| GITHUB_TOKEN (push token) | `backend/.env` | ❌ git-ignored |
| Frontend API URL | `.env` at root *(if used)* | ❌ git-ignored |
| SQLite database | `backend/data/ev-gap.db` | ❌ git-ignored |

`.gitignore` covers `.env`, `*.db`, `node_modules/`, `dist/`. Run
`git check-ignore -v backend/.env` to verify before your first push.

## API hardening (built into backend/src/server.js)

* **helmet** security headers, `x-powered-by` disabled.
* **Rate limiting**: 300 requests / 15 min per IP on all `/api` routes.
* **Optional shared API key**: set `API_KEY` in `backend/.env` and every
  `POST /api/*` (CSV upload etc.) requires header `x-api-key: <key>`.
  Reads stay public so the map always works.
* **CORS allow-list**: default `http://localhost:5173` — set `CORS_ORIGINS`
  to your production frontend origin(s).
* Uploads capped at 25 MB, JSON body at 1 MB.

## Good hygiene

* Rotate any token that was ever pasted into chat, email, or screenshots.
* Use **fine-grained PATs** with the smallest scopes (e.g. Contents RW on one repo).
* Never send real keys to the AI assistant/editor in plain text — reference the
  `.env` file name instead; the app reads it at runtime.
