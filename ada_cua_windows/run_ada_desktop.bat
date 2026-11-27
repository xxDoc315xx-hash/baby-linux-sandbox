@echo off
title Ada Desktop Companion (Zero WSL 2)
cd /d "%~dp0"

echo ==================================================
echo   Ada Desktop Companion Launcher (Windows)
echo ==================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  where py >nul 2>nul
  if errorlevel 1 (
    echo Python 3 is not installed yet!
    echo Quick install option 1: run   winget install Python.Python.3.12
    echo Quick install option 2: download from https://www.python.org/downloads/
    echo ^(Make sure to check "Add Python to PATH" when installing.^)
    pause
    exit /b 1
  )
  set PY_CMD=py -3
) else (
  set PY_CMD=python
)

echo Checking/installing Ada Desktop packages...
%PY_CMD% -m pip install -r requirements.txt --quiet
%PY_CMD% -m pip install pyttsx3 --quiet >nul 2>nul

echo Launching Ada Desktop...
%PY_CMD% ada_desktop.py
if errorlevel 1 (
  echo.
  echo Ada Desktop exited with an error. Press any key to close.
  pause
)
