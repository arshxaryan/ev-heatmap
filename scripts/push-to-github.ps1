# scripts/push-to-github.ps1 — push this repo to GitHub using the token stored
# in backend/.env (GITHUB_TOKEN). Never hardcode tokens in this script.
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/push-to-github.ps1
#
# First time only: open backend/.env and set:
#   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx   (github.com/settings/tokens)
#   GITHUB_USERNAME=your-username
#   GITHUB_REPO=ev-gap-india

$ErrorActionPreference = 'Stop'
$root   = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root 'backend\.env'

# Read KEYS from .env (never log values)
$cfg = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*)\s*$') { $cfg[$Matches[1]] = $Matches[2].Trim() }
}
$token = $cfg['GITHUB_TOKEN']; $user = $cfg['GITHUB_USERNAME']; $repo = $cfg['GITHUB_REPO']

if (-not $token) { Write-Error "GITHUB_TOKEN missing in backend/.env — see file comments"; }
if (-not $user -or -not $repo) { Write-Error "GITHUB_USERNAME / GITHUB_REPO missing in backend/.env" }

# Sanity: token shape only (never print it)
if ($token -notmatch '^(ghp_|github_pat_|gho_)') {
  Write-Warning "Token does not look like a GitHub PAT (ghp_/github_pat_/gho_). It will still be tried."
}

# 1) Ensure the repo exists (public unless GITHUB_REPO_VISIBILITY=private)
$visibility = ($cfg['GITHUB_REPO_VISIBILITY'] -eq 'private') ? 'private' : 'public'
$create = Invoke-RestMethod -Uri 'https://api.github.com/user/repos' -Method Post `
  -Headers @{ Authorization = "Bearer $token"; Accept = 'application/vnd.github+json' } `
  -Body (@{ name = $repo; private = ($visibility -eq 'private'); description = 'EV Gap India — EV adoption vs charging availability heat map' } | ConvertTo-Json) `
  -ErrorAction SilentlyContinue
Write-Host "Repo ready: $user/$repo ($visibility)"

# 2) Set remote (token embedded only in the push URL, not stored in .git/config)
git -C $root remote remove origin 2>$null
git -C $root remote add origin "https://github.com/$user/$repo.git"

# 3) Commit pending changes (if any), then push
git -C $root add -A
$pending = git -C $root status --porcelain
if ($pending) {
  $msgFile = Join-Path $env:TEMP 'evgap-push-msg.txt'
  Set-Content $msgFile "Update EV Gap India"
  git -C $root commit -F $msgFile | Out-Null
}
git -C $root push "https://x-access-token:$token@github.com/$user/$repo.git" main --force 2>&1 |
  ForEach-Object { $_ -replace "x-access-token:[^@]+", "x-access-token:***" }   # mask token in output
git -C $root branch --set-upstream-to=origin/main main 2>$null

Write-Host ""
Write-Host "Done. Your repo: https://github.com/$user/$repo"
Write-Host "Remember: keep GITHUB_TOKEN in backend/.env only (git-ignored)."
