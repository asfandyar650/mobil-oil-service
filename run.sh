#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "============================================================"
echo " Starting Mobil Oil Change Service Management System..."
echo "============================================================"

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required. Opening index.html directly..."
    open index.html
    exit 0
fi

python3 app.py
