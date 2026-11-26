@echo off
title Ada Native Windows CUA (Zero WSL 2)
cd /d "%~dp0"

echo ==================================================
echo   Ada Windows CUA Launcher (No WSL 2 / No Docker)
echo ==================================================
echo.
echo Pick game profile:
echo   1) Command ^& Conquer: Tiberian Sun
echo   2) Final Fantasy VII (FF7)
echo   3) General Windows / Other Game
echo.
set /p choice="Enter 1, 2, or 3: "

set PROFILE=generic
if "%choice%"=="1" set PROFILE=tiberian_sun
if "%choice%"=="2" set PROFILE=ff7

set /p GOAL="What should Ada do? (Press Enter for default): "
if "%GOAL%"=="" set GOAL=Play smartly, manage resources/combat cleanly, and progress toward victory.

echo.
echo Installing/verifying Python packages...
python -m pip install -r requirements.txt --quiet

echo.
echo Choose AI connection:
echo   1) Local Doc & Ada server (http://localhost:3000/api/cua/step)
echo   2) Direct Gemini 4 Hydrogen API (uses GEMINI_API_KEY env var)
set /p mode="Enter 1 or 2: "

if "%mode%"=="2" (
  python ada_cua.py --game %PROFILE% --goal "%GOAL%" --direct
) else (
  python ada_cua.py --game %PROFILE% --goal "%GOAL%"
)
pause
