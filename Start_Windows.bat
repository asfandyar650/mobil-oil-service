@echo off
title Mobil Oil Service - Desktop POS ^& Management
cls

echo ========================================================================
echo         Mobil Oil Change Service - Desktop Station Management           
echo ========================================================================
echo.

:: Detect Python
set PYTHON_CMD=
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python
) else (
    py --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set PYTHON_CMD=py
    )
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python 3 was not detected on this system.
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add python.exe to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo [*] Starting local SQLite database engine...
start "" /B %PYTHON_CMD% app.py

:: Short delay for server initialization
timeout /t 2 /nobreak >nul

echo [*] Launching desktop application window...
:: Check Edge (Default on Windows 10/11)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5055 --window-size=1300,850
    goto RUNNING
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5055 --window-size=1300,850
    goto RUNNING
)

:: Check Google Chrome
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5055 --window-size=1300,850
    goto RUNNING
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5055 --window-size=1300,850
    goto RUNNING
)

:: Fallback standard browser
start http://localhost:5055

:RUNNING
echo.
echo ========================================================================
echo   [SUCCESS] Mobil Oil Service desktop application is running!
echo   - Local Database: oil_service.db
echo   - Port: 5055
echo   Keep this window open while using the application.
echo   To stop the system, close this window or press Ctrl+C.
echo ========================================================================
echo.
pause
