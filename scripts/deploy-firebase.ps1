# scripts/deploy-firebase.ps1 — one-shot deploy:
#   1. build the frontend
#   2. deploy backend container to Cloud Run  (service: ev-gap-backend)
#   3. deploy frontend + /api rewrite to Firebase Hosting
#
# Prereqs (one-time):
#   npm i -g firebase-tools
#   gcloud auth login && gcloud config set project <GCP_PROJECT>
#   firebase login
#
# Set these at the top or in env:
#   $env:GCP_PROJECT   = "your-gcp-project"
#   $env:GCP_REGION    = "asia-south1"
#   $env:OCM_API_KEY   = ""          # optional
#   $env:API_KEY       = ""          # optional upload guard; Cloud Scheduler sends x-api-key

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$project = $env:GCP_PROJECT
$region  = if ($env:GCP_REGION) { $env:GCP_REGION } else { 'asia-south1' }
if (-not $project) {
  $project = (Get-Content (Join-Path $root '.firebaserc') -Raw | ConvertFrom-Json).projects.default
  if ($project -like 'YOUR-*') { Write-Error "Set .firebaserc projects.default to your Firebase project id (or `$env:GCP_PROJECT)" }
}

# Make sure .firebaserc matches the active project.
( Get-Content (Join-Path $root '.firebaserc') -Raw ) -replace '"default":\s*"[^"]+"', ('"default": "' + $project + '"') |
  Set-Content (Join-Path $root '.firebaserc') -NoNewline

Write-Host "== 1/3 building frontend =="
Push-Location (Join-Path $root 'frontend'); npm run build; Pop-Location

Write-Host "== 2/3 deploying backend to Cloud Run ($region) =="
# SQLite file lives in the container FS (ephemeral). Cold start re-seeds demo data;
# for persistent infra data attach Cloud SQL (see docs/METHODOLOGY.md scaling notes).
gcloud run deploy ev-gap-backend `
  --project $project --region $region `
  --source $root `
  --allow-unauthenticated `
  --port 4000 `
  --set-env-vars "NODE_ENV=production,PORT=4000,REFRESH_CRON=,AUTO_REFRESH_ON_START=false,DATABASE_FILE=/tmp/ev-gap.db,CORS_ORIGINS=https://$project.web.app,https://$project.firebaseapp.com,SEED=auto"

Write-Host "== 3/3 deploying Firebase Hosting (frontend + /api rewrite) =="
firebase use $project
firebase deploy --only hosting

Write-Host ""
Write-Host "Live URLs:  https://$project.web.app   and  https://$project.firebaseapp.com"
Write-Host "API health: https://$project.web.app/api/health"
