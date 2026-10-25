#!/usr/bin/env bash
# Every-15-minutes jobs for the site (run by crontab):
#  1. "still waiting for a proofreader" reminders — the site decides whether
#     anything is due (every 4 hours per unclaimed piece), so most runs send nothing.
#  2. IndexNow — tells Bing / ChatGPT search about stories published or edited
#     in the last 30 minutes.
#   */15 * * * * /bin/bash /var/www/buraaq-times/scripts/cron-proofread-reminders.sh
cd "$(dirname "$0")/.." || exit 1
SECRET=$(grep -h '^CRON_SECRET=' .env .env.local .env.production 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"'"'")
if [ -z "$SECRET" ]; then
  echo "$(date '+%F %T') CRON_SECRET is not set in .env" >&2
  exit 1
fi
PORT="${PORT:-9000}"
echo "$(date '+%F %T') reminders $(curl -sS -m 90 -H "Authorization: Bearer $SECRET" "http://localhost:$PORT/api/cron/proofread-reminders")"
echo "$(date '+%F %T') indexnow $(curl -sS -m 90 -H "Authorization: Bearer $SECRET" "http://localhost:$PORT/api/cron/indexnow${1:+?$1}")"
