#!/usr/bin/env bash
# Asks the running site to send "still waiting for a proofreader" reminders.
# Run by crontab every 15 minutes; the site itself decides whether anything is
# due (every 4 hours per unclaimed piece), so most runs send nothing.
#   */15 * * * * /bin/bash /var/www/buraaq-times/scripts/cron-proofread-reminders.sh
cd "$(dirname "$0")/.." || exit 1
SECRET=$(grep -h '^CRON_SECRET=' .env .env.local .env.production 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"'"'")
if [ -z "$SECRET" ]; then
  echo "$(date '+%F %T') CRON_SECRET is not set in .env" >&2
  exit 1
fi
PORT="${PORT:-9000}"
echo "$(date '+%F %T') $(curl -sS -m 90 -H "Authorization: Bearer $SECRET" "http://localhost:$PORT/api/cron/proofread-reminders")"
