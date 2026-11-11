#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================"
echo "  Starting KharchaWise (Pakistani Family Finances)"
echo "========================================================"
echo ""
echo "Starting Fullstack Server on http://localhost:8000 ..."
python3 backend/server.py
