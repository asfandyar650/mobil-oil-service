#!/bin/bash
# Mobil Oil Service - 1-Click Mac Launcher
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "    Mobil Oil Change Service - Desktop Station Manager    "
echo "=========================================================="

if [ -d "Mobil Oil Service.app" ]; then
    echo "Starting native macOS Desktop Application..."
    open "Mobil Oil Service.app"
else
    python3 desktop_launcher.py
fi
