#!/bin/sh
set -e

# Fix ownership of bind-mounted data directory
# (host may have created it as root or with different UID)
chown -R nextjs:nodejs /app/data 2>/dev/null || true

# Drop privileges and exec the main command
exec su-exec nextjs "$@"
