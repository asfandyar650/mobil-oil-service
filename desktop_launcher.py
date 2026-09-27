#!/usr/bin/env python3
"""
Mobil Oil Service - Universal Desktop Launcher
Cross-platform desktop runner for macOS, Windows, and Linux.
Launches the local backend and opens an isolated, dedicated desktop application window.
"""

import os
import sys
import time
import socket
import subprocess
import webbrowser
import signal

PORT = 5055
HOST = "127.0.0.1"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
URL = f"http://{HOST}:{PORT}"

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex((HOST, port)) == 0

def start_backend():
    if is_port_open(PORT):
        print(f"[Mobil Oil Service] Local backend is already active on port {PORT}.")
        return None
    
    app_py = os.path.join(BASE_DIR, "app.py")
    if not os.path.exists(app_py):
        print(f"[Mobil Oil Service] Error: app.py not found at {app_py}")
        sys.exit(1)
    
    print("[Mobil Oil Service] Starting local SQLite backend server...")
    proc = subprocess.Popen(
        [sys.executable, app_py],
        cwd=BASE_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for server to come online
    for _ in range(30):
        if is_port_open(PORT):
            print(f"[Mobil Oil Service] Backend successfully connected on port {PORT}!")
            return proc
        time.sleep(0.15)
    
    print("[Mobil Oil Service] Warning: Server launch timed out. Attempting to connect anyway...")
    return proc

def launch_desktop_window():
    platform = sys.platform
    app_mode_flag = f"--app={URL}"
    win_size_flag = "--window-size=1320,860"
    
    # 1. macOS
    if platform == "darwin":
        # Check if compiled native app exists
        mac_app_path = os.path.join(BASE_DIR, "Mobil Oil Service.app")
        if os.path.exists(mac_app_path):
            try:
                subprocess.Popen(["open", mac_app_path])
                print("[Mobil Oil Service] Launched native macOS Desktop App window.")
                return
            except Exception:
                pass
        
        # Check for Chrome or Edge or Brave in app mode
        for browser in ["Google Chrome", "Microsoft Edge", "Brave Browser"]:
            browser_path = f"/Applications/{browser}.app"
            if os.path.exists(browser_path):
                cmd = ["open", "-na", browser, "--args", app_mode_flag, win_size_flag]
                try:
                    subprocess.Popen(cmd)
                    print(f"[Mobil Oil Service] Launched in {browser} Desktop App Mode.")
                    return
                except Exception:
                    pass
        
        # Default Safari / default browser
        webbrowser.open(URL)
        return

    # 2. Windows
    elif platform == "win32":
        candidates = [
            # Microsoft Edge (Standard on 100% of modern Windows 10 & 11)
            os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
            os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
            # Google Chrome
            os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
            # Brave
            os.path.expandvars(r"%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe")
        ]
        
        for exe in candidates:
            if os.path.exists(exe):
                try:
                    subprocess.Popen([exe, app_mode_flag, win_size_flag])
                    print(f"[Mobil Oil Service] Launched native desktop window using {os.path.basename(exe)}")
                    return
                except Exception:
                    pass
        
        webbrowser.open(URL)
        return

    # 3. Linux
    else:
        for exe in ["google-chrome", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"]:
            try:
                res = subprocess.run(["which", exe], capture_output=True, text=True)
                if res.returncode == 0:
                    subprocess.Popen([exe, app_mode_flag, win_size_flag])
                    print(f"[Mobil Oil Service] Launched native desktop window using {exe}")
                    return
            except Exception:
                pass
        
        webbrowser.open(URL)

def main():
    print("=" * 65)
    print("      MOBIL OIL CHANGE SERVICE - DESKTOP POS & MANAGEMENT")
    print("=" * 65)
    
    proc = start_backend()
    time.sleep(0.3)
    launch_desktop_window()
    
    print("\n[Mobil Oil Service] Desktop application is running locally.")
    print("[Mobil Oil Service] All data is saved automatically in SQLite (oil_service.db).")
    print("[Mobil Oil Service] Press Ctrl+C in this terminal if you ever wish to stop.\n")
    
    if proc:
        try:
            proc.wait()
        except KeyboardInterrupt:
            print("\n[Mobil Oil Service] Shutting down backend cleanly...")
            proc.terminate()
            try:
                proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                proc.kill()
            print("[Mobil Oil Service] Shutdown complete. Have a great day!")

if __name__ == "__main__":
    main()
