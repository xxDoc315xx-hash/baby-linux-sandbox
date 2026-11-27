"""
Ada Native Windows CUA Runner (Zero WSL 2, Zero Docker, Zero PowerShell)
Plays real Windows games (Command & Conquer: Tiberian Sun, Final Fantasy VII, etc.)
using DirectInput hardware scan codes + Gemini 4 Hydrogen Vision.
Press F12 anytime (or move mouse to top-left corner 0,0) to stop immediately.
"""

import argparse
import base64
import io
import json
import os
import sys
import time
import ctypes

import mss
import requests
from PIL import Image

try:
    import pydirectinput
    pydirectinput.FAILSAFE = True
    pydirectinput.PAUSE = 0.03
except ImportError:
    pydirectinput = None

try:
    import keyboard
except ImportError:
    keyboard = None


PROFILE_HINTS = {
    "tiberian_sun": (
        "GAME PROFILE: Command & Conquer: Tiberian Sun (RTS). Uses 0..1000 normalized screen coords. "
        "Left-click selects units/buildings or sidebar build buttons on the right panel; drag box-selects units; "
        "Left-click on terrain/enemies commands selected units. Hotkeys: h=center base, x=scatter, g=guard, s=stop. "
        "Protect Construction Yard and Harvester; build Power Plant -> Refinery -> Barracks/War Factory."
    ),
    "ff7": (
        "GAME PROFILE: Final Fantasy VII (PC). Keyboard-driven JRPG. Common default keys: "
        "enter or x = Confirm/OK, backspace or v = Cancel/Menu, up/down/left/right = Move/Cursor, "
        "c = Switch, space = Assist. Navigate menus cleanly, heal low-HP party members, and push forward."
    ),
    "generic": (
        "GAME PROFILE: General Windows desktop/game window. Inspect UI elements, buttons, menus, and HUD carefully."
    ),
}

KEY_ALIASES = {
    "return": "enter",
    "esc": "escape",
    "arrowup": "up",
    "arrowdown": "down",
    "arrowleft": "left",
    "arrowright": "right",
    "control": "ctrl",
    "del": "delete",
    "pgup": "pageup",
    "pgdn": "pagedown",
}


def get_screen_size():
    user32 = ctypes.windll.user32
    return user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)


def capture_screen_jpeg(max_width: int = 1280) -> tuple[str, int, int]:
    with mss.mss() as sct:
        monitor = sct.monitors[1]
        raw = sct.grab(monitor)
        img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")
        orig_w, orig_h = img.size
        if orig_w > max_width:
            ratio = max_width / float(orig_w)
            img = img.resize((max_width, int(orig_h * ratio)), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=78)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return b64, orig_w, orig_h


def normalize_key(k: str) -> str:
    clean = (k or "").strip().lower()
    return KEY_ALIASES.get(clean, clean)


def execute_action(step: dict, screen_w: int, screen_h: int):
    if pydirectinput is None:
        print("[ERROR] pydirectinput is missing. Run: pip install -r requirements.txt")
        return

    action = (step.get("action") or "wait").lower().strip()
    nx = step.get("x")
    ny = step.get("y")
    px = int(max(0, min(screen_w - 1, round((nx / 1000.0) * screen_w)))) if isinstance(nx, (int, float)) else None
    py = int(max(0, min(screen_h - 1, round((ny / 1000.0) * screen_h)))) if isinstance(ny, (int, float)) else None

    if action == "click" and px is not None and py is not None:
        pydirectinput.moveTo(px, py)
        time.sleep(0.04)
        pydirectinput.click(px, py)
    elif action == "double_click" and px is not None and py is not None:
        pydirectinput.moveTo(px, py)
        time.sleep(0.04)
        pydirectinput.doubleClick(px, py)
    elif action == "right_click" and px is not None and py is not None:
        pydirectinput.moveTo(px, py)
        time.sleep(0.04)
        pydirectinput.rightClick(px, py)
    elif action == "move" and px is not None and py is not None:
        pydirectinput.moveTo(px, py)
    elif action == "drag" and px is not None and py is not None:
        ex_n = step.get("endX", nx)
        ey_n = step.get("endY", ny)
        ex = int(max(0, min(screen_w - 1, round((ex_n / 1000.0) * screen_w))))
        ey = int(max(0, min(screen_h - 1, round((ey_n / 1000.0) * screen_h))))
        pydirectinput.moveTo(px, py)
        pydirectinput.mouseDown()
        time.sleep(0.06)
        pydirectinput.moveTo(ex, ey)
        time.sleep(0.06)
        pydirectinput.mouseUp()
    elif action == "press_key" and step.get("key"):
        key_name = normalize_key(step["key"])
        pydirectinput.press(key_name)
    elif action == "hold_key" and step.get("key"):
        key_name = normalize_key(step["key"])
        dur_s = max(0.08, min(2.5, (step.get("durationMs") or 350) / 1000.0))
        pydirectinput.keyDown(key_name)
        time.sleep(dur_s)
        pydirectinput.keyUp(key_name)
    elif action == "hotkey" and isinstance(step.get("keys"), list) and step["keys"]:
        keys = [normalize_key(k) for k in step["keys"] if k]
        for k in keys:
            pydirectinput.keyDown(k)
        time.sleep(0.05)
        for k in reversed(keys):
            pydirectinput.keyUp(k)
    elif action == "type" and step.get("text"):
        pydirectinput.write(str(step["text"]), interval=0.03)
    elif action == "scroll":
        delta = int(step.get("scrollDelta") or -120)
        ctypes.windll.user32.mouse_event(0x0800, 0, 0, delta, 0)
    elif action == "wait":
        dur_s = max(0.2, min(4.0, (step.get("durationMs") or 800) / 1000.0))
        time.sleep(dur_s)


def call_local_api(api_url: str, payload: dict) -> dict:
    resp = requests.post(api_url, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise RuntimeError(data.get("error") or "Server returned failure")
    return data["step"]


def call_gemini_direct(api_key: str, payload: dict) -> dict:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    hint = PROFILE_HINTS.get(payload["gameProfile"], PROFILE_HINTS["generic"])
    hist = payload.get("stepHistory") or []
    hist_txt = ""
    if hist:
        hist_txt = "\nRecent steps:\n" + "\n".join(
            f"{i+1}. {h.get('action')} ({h.get('observation', '')})" for i, h in enumerate(hist[-6:])
        )

    system_prompt = (
        f"You are Ada (Blonde Ada avatar, powered by Ship Core mind) acting as a Computer-Using Agent (CUA) on Doc's Windows PC.\n"
        f"Screen size: {payload['screenWidth']}x{payload['screenHeight']}. Always output normalized x,y in 0..1000.\n"
        f"{hint}\n"
        "Return strict JSON matching keys: observation, thought, action "
        "(click|double_click|right_click|move|drag|press_key|hold_key|hotkey|type|wait|done), "
        "x, y, endX, endY, key, keys, text, durationMs, adaSay."
    )

    img_bytes = base64.b64decode(payload["imageBase64"])
    last_err = None
    for model_name in ("gemini-4-hydrogen", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                    f"Goal: {payload['goal']}{hist_txt}\nPick the single best next action in JSON.",
                ],
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                ),
            )
            if response and response.text:
                parsed = json.loads(response.text)
                if isinstance(parsed, list):
                    return next((item for item in parsed if isinstance(item, dict)), {"action": "wait"})
                return parsed if isinstance(parsed, dict) else {"action": "wait"}
        except Exception as err:
            last_err = err
    raise last_err or RuntimeError("All Gemini models failed.")


def main():
    parser = argparse.ArgumentParser(description="Ada Native Windows CUA Runner")
    parser.add_argument("--game", choices=["tiberian_sun", "ff7", "generic"], default="tiberian_sun")
    parser.add_argument("--goal", default="Play smartly toward winning or progressing cleanly.")
    parser.add_argument("--api-url", default="http://localhost:3000/api/cua/step")
    parser.add_argument("--direct", action="store_true", help="Call Gemini 4 Hydrogen directly using GEMINI_API_KEY env var")
    parser.add_argument("--interval", type=float, default=0.9, help="Seconds between steps")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if args.direct and not api_key:
        print("[ERROR] --direct mode requires GEMINI_API_KEY in your Windows environment.")
        sys.exit(1)

    print("==========================================")
    print("  Ada Windows CUA Runner (Zero WSL 2!)")
    print(f"  Game Profile : {args.game}")
    print(f"  Mode         : {'Direct Gemini 4 Hydrogen' if args.direct else args.api_url}")
    print("  Stop Hotkey  : Press F12 anytime (or move mouse to 0,0)")
    print("==========================================")
    print("Starting in 4 seconds — click your game window now!")
    time.sleep(4)

    history = []
    step_num = 0
    while True:
        if keyboard and keyboard.is_pressed("f12"):
            print("\n[Ada] F12 pressed — stopping CUA safely!")
            break

        step_num += 1
        try:
            b64, sw, sh = capture_screen_jpeg()
            payload = {
                "imageBase64": b64,
                "mimeType": "image/jpeg",
                "goal": args.goal,
                "gameProfile": args.game,
                "screenWidth": sw,
                "screenHeight": sh,
                "stepHistory": history[-6:],
            }
            step = call_gemini_direct(api_key, payload) if args.direct else call_local_api(args.api_url, payload)
            action = step.get("action", "wait")
            print(f"\n[Step {step_num}] {action} -> {step.get('adaSay', '')}")
            print(f"   Saw: {step.get('observation', '')}")

            if action == "done":
                print("[Ada] Goal complete!")
                break

            execute_action(step, sw, sh)
            history.append({"action": action, "observation": step.get("observation", "")})
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n[Ada] Stopped by Ctrl+C.")
            break
        except Exception as err:
            print(f"[Ada Warn] {err}")
            time.sleep(1.5)


if __name__ == "__main__":
    main()
