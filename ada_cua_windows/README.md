# Ada Native Windows CUA (Zero WSL 2 / Zero PowerShell)

Designed for **Command & Conquer: Tiberian Sun**, **Final Fantasy VII (FF7)**, and any other real Windows game.

Why this exists:
- Open-source CUA starters ask for **WSL 2 + Docker + PowerShell** because they boot a Linux VM — which doesn't even have your Windows games installed.
- This folder runs **natively on Windows** with Python + **`pydirectinput`** (DirectInput hardware scan codes, so older DirectX/DirectDraw games like *Tiberian Sun* and *FF7* actually register clicks and keystrokes) powered by **`gemini-4-hydrogen`**.

## Quick Start (No WSL 2 Needed)
1. Install **Python 3.10+** for Windows (check *"Add Python to PATH"*).
2. Double-click **`run_ada_cua.bat`**.
3. Pick **Tiberian Sun**, **FF7**, or **General**, and choose either:
   - **Local Doc & Ada Server** (`npm run dev` on your PC -> `http://localhost:3000/api/cua/step`), or
   - **Direct Gemini 4 Hydrogen** (`set GEMINI_API_KEY=your_key` in Windows).
4. Click into your game window during the 4-second countdown.
5. Press **`F12`** anytime (or slam the mouse to top-left corner `0,0`) to stop Ada immediately.
