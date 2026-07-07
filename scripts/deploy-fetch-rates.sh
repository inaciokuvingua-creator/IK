#!/usr/bin/env bash
# Deploy Supabase functions for exchange rates
# Requires: supabase CLI installed and logged in
# Usage: SUPABASE_PROJECT_REF=your-ref ./scripts/deploy-fetch-rates.sh

set -euo pipefail

if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "Please set SUPABASE_PROJECT_REF environment variable. Example: SUPABASE_PROJECT_REF=your-project-ref"
  exit 1
fi

echo "Deploying functions: fetch-exchange-rates, check-rate-alerts"

supabase functions deploy fetch-exchange-rates --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy check-rate-alerts --project-ref "$SUPABASE_PROJECT_REF"

echo "Deployed. Configure the following GitHub secrets: SUPABASE_FUNCTION_BASE (e.g. https://<ref>.functions.supabase.co), SUPABASE_SERVICE_ROLE"
