@echo off
title Ada Desktop Companion (Zero WSL 2)
cd /d "%~dp0"

echo ==================================================
echo   Ada Desktop Companion Launcher (Windows)
echo ==================================================
echo.

set "PY_CMD="
python --version >nul 2>nul
if not errorlevel 1 (
  set "PY_CMD=python"
)

if "%PY_CMD%"=="" (
  py -3 --version >nul 2>nul
  if not errorlevel 1 (
    set "PY_CMD=py -3"
  )
)

if "%PY_CMD%"=="" (
  echo [!] Python 3 was not found on this PC ^(or only the Windows Store stub exists^).
  echo.
  echo Quickest way to install Python 3.12:
  echo   1. Open Command Prompt and run:  winget install Python.Python.3.12
  echo   OR
  echo   2. Download from: https://www.python.org/downloads/
  echo      ^(Check "Add Python to PATH" on the first screen!^)
  echo.
  pause
  exit /b 1
)

echo Using %PY_CMD%:
%PY_CMD% --version
echo.
echo Installing / checking required packages...
%PY_CMD% -m pip install --upgrade -r requirements.txt
if errorlevel 1 (
  echo.
  echo [!] Package install hit a snag. Check internet connection and try again.
  pause
  exit /b 1
)

%PY_CMD% -m pip install pyttsx3 --quiet >nul 2>nul

echo.
echo Starting Ada Desktop Companion...
%PY_CMD% ada_desktop.py
if errorlevel 1 (
  echo.
  echo [!] Ada Desktop closed with an error. Check the message above.
  pause
)
