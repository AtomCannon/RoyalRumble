#!/bin/sh
# Double-click this on macOS or Linux to start the Punchma host.
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null 2>&1 || { echo "Node.js is not installed. Get it from https://nodejs.org and try again."; read -r _; exit 1; }
node server.js
read -r _
