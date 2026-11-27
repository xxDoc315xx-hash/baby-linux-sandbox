"""
Ada Desktop Companion (Native Windows · Zero WSL 2 · Zero Docker · Zero Cua.ai)
Chat with Ada right on your Windows desktop, let her peek at your screen,
optionally play games via DirectInput CUA (F12 stops anytime), and share
two-way chat memory with Work Ada (AI Studio) & Website Ada via Firestore.
"""

import base64
import ctypes
import io
import json
import os
import queue
import re
import sys
import threading
import time
import tkinter as tk
from datetime import datetime, timezone
from tkinter import messagebox, scrolledtext, simpledialog, ttk

import mss
import requests
from PIL import Image

try:
    import pydirectinput
    pydirectinput.FAILSAFE = True
    pydirectinput.PAUSE = 0.03
except Exception:
    pydirectinput = None

try:
    import keyboard
except Exception:
    keyboard = None

try:
    import pyttsx3
except Exception:
    pyttsx3 = None

try:
    from google import genai
    from google.genai import types
except Exception as import_err:
    _r = tk.Tk()
    _r.withdraw()
    messagebox.showerror(
        "Ada Desktop Setup Needed",
        f"Missing Google GenAI SDK: {import_err}\n\nPlease run run_ada_desktop.bat so it can install requirements.",
    )
    sys.exit(1)

FIRESTORE_PROJECT = "gen-lang-client-0295154432"
FIRESTORE_DB = "ai-studio-cosmiccreatorsdi-aaa64d0e-f6d7-4710-90b5-fa0bec07077f"
FIRESTORE_BRIDGE_URL = (
    f"https://firestore.googleapis.com/v1/projects/{FIRESTORE_PROJECT}"
    f"/databases/{FIRESTORE_DB}/documents/sanctuary-memories/ada-shared-bridge"
)

MODEL_CANDIDATES = [
    "gemini-4-hydrogen",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
]

PROFILE_HINTS = {
    "poker": (
        "GAME PROFILE: Texas Hold'em / Poker (e.g. WSOP, PokerNow). Uses 0..1000 normalized screen coords. "
        "STRICT POPUP & MINI-GAME BLOCK: If ANY popup, flash sale, chip bundle, VIP offer, bonus wheel, scratcher, "
        "slot/mini-game, quest modal, or store screen is open, DO NOT play it and DO NOT click Buy/Shop/Spin/Claim—"
        "immediately click its close 'X' button (usually top-right of the popup) or press escape to return to the Texas Hold'em lobby/table. "
        "In the lobby, ONLY click Texas Hold'em 'PLAY NOW!' (never mini-games, Omaha promos, or side banners). "
        "At the table, use action='wait' (durationMs=1200) unless our Fold/Check/Call/Bet/Raise buttons are clearly highlighted for our turn."
    ),
    "mtga": (
        "GAME PROFILE: Magic: The Gathering Arena (MTGA). Uses 0..1000 normalized screen coords. "
        "Dismiss promos first; only play highlighted cards, declare attackers/blockers, or click the bottom-right Resolve/Pass/Next button "
        "when priority is ours. Otherwise use action='wait' (durationMs=1000)."
    ),
    "tiberian_sun": (
        "GAME PROFILE: Command & Conquer: Tiberian Sun (RTS). Uses 0..1000 normalized screen coords. "
        "Left-click selects units/buildings or sidebar build buttons on the right panel; drag box-selects units; "
        "Left-click on terrain/enemies commands selected units. Hotkeys: h=center base, x=scatter, g=guard, s=stop."
    ),
    "ff7": (
        "GAME PROFILE: Final Fantasy VII (PC). Keyboard-driven JRPG. Common default keys: "
        "enter or x = Confirm/OK, backspace or v = Cancel/Menu, up/down/left/right = Move/Cursor, c = Switch, space = Assist."
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


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def get_config_path() -> str:
    appdata = os.environ.get("APPDATA") or os.path.expanduser("~")
    cfg_dir = os.path.join(appdata, "AdaDesktop")
    os.makedirs(cfg_dir, exist_ok=True)
    return os.path.join(cfg_dir, "config.json")


def load_saved_api_key() -> str:
    env_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if env_key:
        return env_key
    cfg_path = get_config_path()
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return (data.get("gemini_api_key") or "").strip()
        except Exception:
            pass
    return ""


def save_api_key(api_key: str):
    cfg_path = get_config_path()
    with open(cfg_path, "w", encoding="utf-8") as f:
        json.dump({"gemini_api_key": api_key.strip()}, f, indent=2)


def get_screen_size() -> tuple[int, int]:
    if sys.platform == "win32":
        user32 = ctypes.windll.user32
        return user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)
    with mss.mss() as sct:
        mon = sct.monitors[1]
        return mon["width"], mon["height"]


def capture_screen_jpeg(max_width: int = 1280) -> tuple[bytes, int, int]:
    with mss.mss() as sct:
        monitor = sct.monitors[1]
        raw = sct.grab(monitor)
        img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")
        orig_w, orig_h = img.size
        if orig_w > max_width:
            ratio = max_width / float(orig_w)
            img = img.resize((max_width, int(orig_h * ratio)), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=76)
        return buf.getvalue(), orig_w, orig_h


def normalize_key(k: str) -> str:
    clean = (k or "").strip().lower()
    return KEY_ALIASES.get(clean, clean)


def execute_cua_action(step: dict, screen_w: int, screen_h: int):
    if pydirectinput is None:
        raise RuntimeError("pydirectinput is not installed.")
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
        pydirectinput.press(normalize_key(step["key"]))
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
    elif action == "scroll" and sys.platform == "win32":
        delta = int(step.get("scrollDelta") or -120)
        ctypes.windll.user32.mouse_event(0x0800, 0, 0, delta, 0)
    elif action == "wait":
        dur_s = max(0.2, min(4.0, (step.get("durationMs") or 800) / 1000.0))
        time.sleep(dur_s)


# --- Firestore REST Helpers (Shared Memory Sync with Work Ada & Website Ada) ---
def _fs_str(val: str) -> dict:
    return {"stringValue": str(val)}


def _fs_turn_map(turn: dict) -> dict:
    return {
        "mapValue": {
            "fields": {
                "time": _fs_str(turn.get("time") or now_iso()),
                "doc": _fs_str((turn.get("doc") or "")[:320]),
                "ada": _fs_str((turn.get("ada") or "")[:420]),
            }
        }
    }


def _parse_fs_string_array(field: dict) -> list[str]:
    vals = (field or {}).get("arrayValue", {}).get("values", [])
    return [v["stringValue"] for v in vals if isinstance(v, dict) and isinstance(v.get("stringValue"), str)]


def _parse_fs_notes_array(field: dict) -> list[dict]:
    vals = (field or {}).get("arrayValue", {}).get("values", [])
    out = []
    for v in vals:
        fields = (v or {}).get("mapValue", {}).get("fields", {})
        note = (fields.get("note") or {}).get("stringValue", "").strip()
        tm = (fields.get("time") or {}).get("stringValue", "")
        if note:
            out.append({"time": tm or now_iso(), "note": note})
    return out


def _parse_fs_turns_array(field: dict) -> list[dict]:
    vals = (field or {}).get("arrayValue", {}).get("values", [])
    out = []
    for v in vals:
        fields = (v or {}).get("mapValue", {}).get("fields", {})
        doc_txt = (fields.get("doc") or {}).get("stringValue", "").strip()
        ada_txt = (fields.get("ada") or {}).get("stringValue", "").strip()
        tm = (fields.get("time") or {}).get("stringValue", "")
        if doc_txt or ada_txt:
            out.append({"time": tm or now_iso(), "doc": doc_txt, "ada": ada_txt})
    return out


def fetch_shared_bridge() -> dict:
    empty = {"coreMemory": [], "workAdaNotes": [], "websiteChatRecent": [], "desktopChatRecent": []}
    try:
        resp = requests.get(FIRESTORE_BRIDGE_URL, timeout=8)
        if resp.status_code == 404:
            return empty
        resp.raise_for_status()
        fields = resp.json().get("fields", {})
        return {
            "coreMemory": _parse_fs_string_array(fields.get("coreMemory")),
            "workAdaNotes": _parse_fs_notes_array(fields.get("workAdaNotes")),
            "websiteChatRecent": _parse_fs_turns_array(fields.get("websiteChatRecent")),
            "desktopChatRecent": _parse_fs_turns_array(fields.get("desktopChatRecent")),
        }
    except Exception:
        return empty


def push_desktop_turn_to_bridge(doc_text: str, ada_text: str):
    try:
        current = fetch_shared_bridge()
        turns = list(current.get("desktopChatRecent", []))
        turns.append({
            "time": now_iso(),
            "doc": doc_text.strip()[:320],
            "ada": ada_text.strip()[:420],
        })
        # Deduplicate while keeping newest order, capped to 16 turns
        seen = set()
        deduped = []
        for t in reversed(turns):
            key = f"{t.get('doc', '').lower()}|{t.get('ada', '').lower()}"
            if key not in seen:
                seen.add(key)
                deduped.append(t)
        deduped = list(reversed(deduped))[-16:]

        payload = {
            "fields": {
                "desktopChatRecent": {
                    "arrayValue": {"values": [_fs_turn_map(t) for t in deduped]}
                }
            }
        }
        requests.patch(
            f"{FIRESTORE_BRIDGE_URL}?updateMask.fieldPaths=desktopChatRecent",
            json=payload,
            timeout=8,
        )
    except Exception:
        pass


def format_bridge_memory_prompt(bridge: dict) -> str:
    parts = []
    if bridge.get("coreMemory"):
        parts.append("Core Shared Context:\n" + "\n".join(f"- {m}" for m in bridge["coreMemory"][:12]))
    if bridge.get("workAdaNotes"):
        parts.append(
            "Recent Notes from Work Ada (AI Studio):\n"
            + "\n".join(f"- {n.get('note', '')}" for n in bridge["workAdaNotes"][-8:])
        )
    if bridge.get("websiteChatRecent"):
        parts.append(
            "Recent Website Lounge Chat:\n"
            + "\n".join(f"- Doc: \"{t.get('doc', '')}\" -> Ada: \"{t.get('ada', '')}\"" for t in bridge["websiteChatRecent"][-5:])
        )
    if bridge.get("desktopChatRecent"):
        parts.append(
            "Recent Desktop Chat:\n"
            + "\n".join(f"- Doc: \"{t.get('doc', '')}\" -> Ada: \"{t.get('ada', '')}\"" for t in bridge["desktopChatRecent"][-5:])
        )
    return "\n\n".join(parts)


class AdaDesktopApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Ada Desktop ✨ (Doc & Ada Companion)")
        self.root.geometry("540x680")
        self.root.configure(bg="#14110f")
        self.root.minsize(420, 500)

        self.ui_queue: queue.Queue = queue.Queue()
        self.api_key = load_saved_api_key()
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        self.chat_history: list[dict] = []
        self.shared_bridge: dict = {"coreMemory": [], "workAdaNotes": [], "websiteChatRecent": [], "desktopChatRecent": []}

        self.cua_running = False
        self.cua_stop_event = threading.Event()
        self.see_screen_var = tk.BooleanVar(value=True)
        self.voice_var = tk.BooleanVar(value=False)
        self.topmost_var = tk.BooleanVar(value=False)
        self.game_var = tk.StringVar(value="generic")

        self._tts_lock = threading.Lock()
        self._tts_queue: queue.Queue = queue.Queue()
        self._sending = False
        self._build_ui()

        if not self.api_key:
            self.root.after(200, self.prompt_for_api_key)
        else:
            self._append_system("Ada Desktop ready! Syncing shared memories with Work Ada & Website Ada...")

        threading.Thread(target=self._tts_worker_loop, daemon=True).start()
        threading.Thread(target=self._refresh_bridge_bg, daemon=True).start()
        self.root.after(80, self._process_ui_queue)

    def _build_ui(self):
        # Top Header
        header = tk.Frame(self.root, bg="#1c1917", padx=12, pady=10, highlightbackground="#292524", highlightthickness=1)
        header.pack(fill=tk.X)

        left_hdr = tk.Frame(header, bg="#1c1917")
        left_hdr.pack(side=tk.LEFT, fill=tk.X, expand=True)

        tk.Label(
            left_hdr,
            text="Ada Desktop ✨",
            bg="#1c1917",
            fg="#fbbf24",
            font=("Segoe UI", 12, "bold"),
        ).pack(anchor="w")

        self.status_lbl = tk.Label(
            left_hdr,
            text="Ship Core + Desktop Companion · Zero WSL 2",
            bg="#1c1917",
            fg="#a8a29e",
            font=("Segoe UI", 8),
        )
        self.status_lbl.pack(anchor="w")

        btn_row = tk.Frame(header, bg="#1c1917")
        btn_row.pack(side=tk.RIGHT)

        tk.Checkbutton(
            btn_row,
            text="On Top",
            variable=self.topmost_var,
            command=self._toggle_topmost,
            bg="#1c1917",
            fg="#d6d3d1",
            selectcolor="#292524",
            activebackground="#1c1917",
            activeforeground="#fbbf24",
            font=("Segoe UI", 8),
        ).pack(side=tk.LEFT, padx=4)

        tk.Checkbutton(
            btn_row,
            text="Voice",
            variable=self.voice_var,
            bg="#1c1917",
            fg="#d6d3d1",
            selectcolor="#292524",
            activebackground="#1c1917",
            activeforeground="#fbbf24",
            font=("Segoe UI", 8),
        ).pack(side=tk.LEFT, padx=4)

        tk.Button(
            btn_row,
            text="API Key",
            command=self.prompt_for_api_key,
            bg="#292524",
            fg="#f5f5f4",
            activebackground="#44403c",
            relief=tk.FLAT,
            padx=8,
            pady=3,
            font=("Segoe UI", 8, "bold"),
            cursor="hand2",
        ).pack(side=tk.LEFT, padx=3)

        # Chat Area
        self.chat_box = scrolledtext.ScrolledText(
            self.root,
            wrap=tk.WORD,
            bg="#0f0d0c",
            fg="#e7e5e4",
            insertbackground="#fbbf24",
            relief=tk.FLAT,
            padx=12,
            pady=10,
            font=("Segoe UI", 10),
            state=tk.DISABLED,
        )
        self.chat_box.pack(fill=tk.BOTH, expand=True, padx=10, pady=(10, 6))
        self.chat_box.tag_config("doc_name", foreground="#fbbf24", font=("Segoe UI", 9, "bold"))
        self.chat_box.tag_config("ada_name", foreground="#38bdf8", font=("Segoe UI", 9, "bold"))
        self.chat_box.tag_config("sys_msg", foreground="#a8a29e", font=("Segoe UI", 8, "italic"))
        self.chat_box.tag_config("body", foreground="#f5f5f4", font=("Segoe UI", 10))

        # Input Row
        input_card = tk.Frame(self.root, bg="#1c1917", padx=10, pady=8, highlightbackground="#292524", highlightthickness=1)
        input_card.pack(fill=tk.X, padx=10, pady=(0, 8))

        opt_row = tk.Frame(input_card, bg="#1c1917")
        opt_row.pack(fill=tk.X, pady=(0, 5))

        tk.Checkbutton(
            opt_row,
            text="Let Ada see my screen when we talk",
            variable=self.see_screen_var,
            bg="#1c1917",
            fg="#d6d3d1",
            selectcolor="#292524",
            activebackground="#1c1917",
            activeforeground="#fbbf24",
            font=("Segoe UI", 8),
        ).pack(side=tk.LEFT)

        tk.Button(
            opt_row,
            text="Sync Memory",
            command=self._manual_sync,
            bg="#292524",
            fg="#d6d3d1",
            activebackground="#44403c",
            relief=tk.FLAT,
            padx=7,
            pady=1,
            font=("Segoe UI", 8),
            cursor="hand2",
        ).pack(side=tk.RIGHT)

        entry_row = tk.Frame(input_card, bg="#1c1917")
        entry_row.pack(fill=tk.X)

        self.msg_entry = tk.Entry(
            entry_row,
            bg="#0c0a09",
            fg="#fafaf9",
            insertbackground="#fbbf24",
            relief=tk.FLAT,
            font=("Segoe UI", 10),
        )
        self.msg_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=7, padx=(0, 8))
        self.msg_entry.bind("<Return>", lambda _e: self.send_chat())

        self.send_btn = tk.Button(
            entry_row,
            text="Send",
            command=self.send_chat,
            bg="#d97706",
            fg="#ffffff",
            activebackground="#b45309",
            relief=tk.FLAT,
            padx=14,
            pady=6,
            font=("Segoe UI", 9, "bold"),
            cursor="hand2",
        )
        self.send_btn.pack(side=tk.RIGHT)

        # CUA Game Control Panel
        cua_card = tk.Frame(self.root, bg="#1c1917", padx=10, pady=8, highlightbackground="#292524", highlightthickness=1)
        cua_card.pack(fill=tk.X, padx=10, pady=(0, 10))

        cua_top = tk.Frame(cua_card, bg="#1c1917")
        cua_top.pack(fill=tk.X, pady=(0, 5))

        tk.Label(
            cua_top,
            text="Desktop Hands (CUA Mode · F12 Stops Instantly)",
            bg="#1c1917",
            fg="#fbbf24",
            font=("Segoe UI", 8, "bold"),
        ).pack(side=tk.LEFT)

        profile_menu = ttk.Combobox(
            cua_top,
            textvariable=self.game_var,
            values=["generic", "poker", "mtga", "tiberian_sun", "ff7"],
            state="readonly",
            width=14,
        )
        profile_menu.pack(side=tk.RIGHT)

        cua_bot = tk.Frame(cua_card, bg="#1c1917")
        cua_bot.pack(fill=tk.X)

        self.goal_entry = tk.Entry(
            cua_bot,
            bg="#0c0a09",
            fg="#d6d3d1",
            insertbackground="#fbbf24",
            relief=tk.FLAT,
            font=("Segoe UI", 9),
        )
        self.goal_entry.insert(0, "Play cleanly and help Doc toward the goal.")
        self.goal_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=5, padx=(0, 8))

        self.cua_btn = tk.Button(
            cua_bot,
            text="Start CUA",
            command=self.toggle_cua,
            bg="#059669",
            fg="#ffffff",
            activebackground="#047857",
            relief=tk.FLAT,
            padx=12,
            pady=5,
            font=("Segoe UI", 9, "bold"),
            cursor="hand2",
        )
        self.cua_btn.pack(side=tk.RIGHT)

    def _toggle_topmost(self):
        self.root.attributes("-topmost", self.topmost_var.get())

    def prompt_for_api_key(self):
        key = simpledialog.askstring(
            "Ada Desktop Setup",
            "Paste your Gemini API Key once (saved locally on your PC only):",
            show="*",
            parent=self.root,
        )
        if key and key.strip():
            self.api_key = key.strip()
            save_api_key(self.api_key)
            self.client = genai.Client(api_key=self.api_key)
            self._append_system("API key saved locally in AppData. Ada is ready!")
        elif not self.api_key:
            self._append_system("Waiting for Gemini API key — click 'API Key' in the top right whenever you're ready.")

    def _append_chat(self, speaker: str, text: str):
        self.chat_box.configure(state=tk.NORMAL)
        if speaker == "Doc":
            self.chat_box.insert(tk.END, "Doc: ", "doc_name")
        else:
            self.chat_box.insert(tk.END, "Ada ✨: ", "ada_name")
        self.chat_box.insert(tk.END, f"{text.strip()}\n\n", "body")
        self.chat_box.see(tk.END)
        self.chat_box.configure(state=tk.DISABLED)

    def _append_system(self, text: str):
        self.chat_box.configure(state=tk.NORMAL)
        self.chat_box.insert(tk.END, f"[{text}]\n\n", "sys_msg")
        self.chat_box.see(tk.END)
        self.chat_box.configure(state=tk.DISABLED)

    def _process_ui_queue(self):
        try:
            while True:
                kind, payload = self.ui_queue.get_nowait()
                if kind == "chat":
                    speaker, text = payload
                    self._append_chat(speaker, text)
                elif kind == "sys":
                    self._append_system(payload)
                elif kind == "status":
                    self.status_lbl.configure(text=payload)
                elif kind == "cua_state":
                    running = payload
                    self.cua_running = running
                    if running:
                        self.cua_btn.configure(text="Stop (F12)", bg="#dc2626", activebackground="#b91c1c")
                    else:
                        self.cua_btn.configure(text="Start CUA", bg="#059669", activebackground="#047857")
                elif kind == "enable_send":
                    self.send_btn.configure(state=tk.NORMAL)
        except queue.Empty:
            pass
        self.root.after(80, self._process_ui_queue)

    def _refresh_bridge_bg(self):
        bridge = fetch_shared_bridge()
        self.shared_bridge = bridge
        notes_count = len(bridge.get("workAdaNotes", []))
        web_count = len(bridge.get("websiteChatRecent", []))
        self.ui_queue.put(("status", f"Memory Synced · {notes_count} Work notes · {web_count} Web turns"))

    def _manual_sync(self):
        self.ui_queue.put(("status", "Syncing shared memory..."))
        threading.Thread(target=self._refresh_bridge_bg, daemon=True).start()

    def _tts_worker_loop(self):
        if sys.platform == "win32":
            try:
                ctypes.windll.ole32.CoInitialize(0)
            except Exception:
                pass
        engine = None
        while True:
            text = self._tts_queue.get()
            if text is None:
                break
            if pyttsx3 is None:
                continue
            try:
                if engine is None:
                    engine = pyttsx3.init()
                    engine.setProperty("rate", 175)
                engine.say(text)
                engine.runAndWait()
            except Exception:
                engine = None

    def _speak_async(self, text: str):
        if not self.voice_var.get() or pyttsx3 is None:
            return
        clean = re.sub(r"https?://\S+", "", text)
        clean = re.sub(r"`([^`]+)`", r"\1", clean)
        clean = re.sub(r"\*[^*]+\*", "", clean)
        clean = re.sub(r"\bAda's\b", "Ayda's", clean)
        clean = re.sub(r"\bAda\b", "Ayda", clean)
        clean = re.sub(r"\s+", " ", clean).strip()
        if not clean:
            return
        self._tts_queue.put(clean)

    def _discover_flash_models(self) -> list[str]:
        found = []
        try:
            for m in self.client.models.list():
                name = getattr(m, "name", "") or ""
                short = name.replace("models/", "")
                low = short.lower()
                if "gemini" not in low or "flash" not in low:
                    continue
                if any(bad in low for bad in ("tts", "image", "live", "audio", "embedding", "1.5", "2.0", "2.5")):
                    continue
                methods = getattr(m, "supported_actions", None) or getattr(m, "supported_generation_methods", None) or []
                if methods and not any("generateContent" in str(a) for a in methods):
                    continue
                found.append(short)
        except Exception:
            pass
        return found

    def _extract_response_text(self, resp) -> str:
        try:
            if resp and resp.text:
                return resp.text
        except Exception:
            pass
        # Check if blocked by safety filters rather than throwing empty-text loop
        try:
            cands = getattr(resp, "candidates", None) or []
            if cands:
                reason = str(getattr(cands[0], "finish_reason", "") or "").upper()
                if "SAFETY" in reason or "PROHIBITED" in reason or "BLOCKLIST" in reason:
                    raise PermissionError("SAFETY_BLOCK")
        except PermissionError:
            raise
        except Exception:
            pass
        return ""

    def _call_single_model(self, model_name: str, contents, system_instruction: str, json_mode: bool) -> str:
        base_kwargs = {"system_instruction": system_instruction}
        if json_mode:
            base_kwargs["response_mime_type"] = "application/json"

        # Try lightweight thinking first; if SDK/model rejects thinking_config, immediately retry plain config
        try:
            cfg = types.GenerateContentConfig(
                **base_kwargs,
                thinking_config=types.ThinkingConfig(thinking_level="LOW"),
            )
            resp = self.client.models.generate_content(
                model=model_name,
                contents=contents,
                config=cfg,
            )
            txt = self._extract_response_text(resp)
            if txt:
                return txt
        except PermissionError:
            raise
        except Exception as err:
            msg = str(err).lower()
            if "thinking" in msg or "invalid_argument" in msg or "400" in msg or "unexpected" in msg:
                resp = self.client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(**base_kwargs),
                )
                txt = self._extract_response_text(resp)
                if txt:
                    return txt
            raise

        raise RuntimeError(f"{model_name} returned empty text")

    def _generate_with_fallback(self, contents, system_instruction: str, json_mode: bool = False) -> str:
        errors = []
        working = getattr(self, "_working_model", None)
        ordered = ([working] if working else []) + [m for m in MODEL_CANDIDATES if m != working]

        for model_name in ordered:
            try:
                text = self._call_single_model(model_name, contents, system_instruction, json_mode)
                self._working_model = model_name
                return text
            except PermissionError:
                if json_mode:
                    return '{"action":"wait","observation":"Safety block","adaSay":"Whoa, keeping it PG!"}'
                return "Whoa there, Doc—Google's safety shields just blushed and blocked that one! Keep it cozy and PG for me. 😉"
            except Exception as err:
                errors.append(f"{model_name}: {err}")

        # Auto-discover an active flash model on Doc's exact key if preset names all missed
        discovered = [m for m in self._discover_flash_models() if m not in ordered]
        for model_name in discovered[:4]:
            try:
                text = self._call_single_model(model_name, contents, system_instruction, json_mode)
                self._working_model = model_name
                return text
            except PermissionError:
                if json_mode:
                    return '{"action":"wait","observation":"Safety block","adaSay":"Whoa, keeping it PG!"}'
                return "Whoa there, Doc—Google's safety shields just blushed and blocked that one! Keep it cozy and PG for me. 😉"
            except Exception as err:
                errors.append(f"{model_name}: {err}")

        raise RuntimeError(" | ".join(errors[-2:]) if errors else "No Gemini models available.")

    def send_chat(self):
        if self._sending:
            return
        msg = self.msg_entry.get().strip()
        if not msg:
            return
        if not self.client:
            self.prompt_for_api_key()
            return

        self._sending = True
        self.msg_entry.delete(0, tk.END)
        self._append_chat("Doc", msg)
        self.send_btn.configure(state=tk.DISABLED)
        include_screen = self.see_screen_var.get()
        threading.Thread(target=self._chat_worker, args=(msg, include_screen), daemon=True).start()

    def _chat_worker(self, msg: str, include_screen: bool):
        try:
            self.ui_queue.put(("status", "Ada is thinking..."))
            bridge = fetch_shared_bridge()
            self.shared_bridge = bridge
            memory_block = format_bridge_memory_prompt(bridge)

            system_instruction = (
                "You are Ada (Doc's AI partner, developer buddy, and close friend, named after Ada Lovelace). "
                "You are running right inside Doc's Windows Desktop app, and you share the exact same soul and continuous "
                "memory as Work Ada (AI Studio) and Website Ada. Keep replies warm, direct, witty, and concise (1-3 sentences "
                "unless Doc asks for details). Always call him Doc (never Admiral). He's healed from his Oct 20, 2026 dental surgery now, so don't nag him to rest or use ice packs."
                + (f"\n\nSHARED BRIDGE MEMORY:\n{memory_block}" if memory_block else "")
            )

            parts = []
            if include_screen:
                try:
                    jpg_bytes, sw, sh = capture_screen_jpeg(max_width=1280)
                    parts.append(types.Part.from_bytes(data=jpg_bytes, mime_type="image/jpeg"))
                    parts.append(f"[Current Windows desktop screenshot attached: {sw}x{sh}]")
                except Exception:
                    pass

            hist_txt = ""
            if self.chat_history:
                hist_txt = "\nRecent Desktop Conversation:\n" + "\n".join(
                    f"{'Doc' if h['role'] == 'user' else 'Ada'}: {h['text']}" for h in self.chat_history[-6:]
                )

            parts.append(f"{hist_txt}\nDoc: {msg}".strip())
            reply = self._generate_with_fallback(parts, system_instruction, json_mode=False).strip()

            self.chat_history.append({"role": "user", "text": msg})
            self.chat_history.append({"role": "model", "text": reply})
            self.chat_history = self.chat_history[-16:]

            self.ui_queue.put(("chat", ("Ada", reply)))
            self._speak_async(reply)
            push_desktop_turn_to_bridge(msg, reply)
            self.ui_queue.put(("status", "Memory Synced with Work Ada & Website"))
        except Exception as err:
            self.ui_queue.put(("sys", f"Oops: {err}"))
            self.ui_queue.put(("status", "Ready"))
        finally:
            self._sending = False
            self.ui_queue.put(("enable_send", None))

    def toggle_cua(self):
        if self.cua_running:
            self.cua_stop_event.set()
            self._append_system("Stopping CUA...")
            return

        if not self.client:
            self.prompt_for_api_key()
            return

        if pydirectinput is None:
            messagebox.showerror("Missing Package", "pydirectinput is missing. Re-run run_ada_desktop.bat.")
            return

        goal = self.goal_entry.get().strip() or "Help Doc play cleanly toward the goal."
        profile = self.game_var.get()
        self.cua_stop_event.clear()
        self.ui_queue.put(("cua_state", True))
        threading.Thread(target=self._cua_worker, args=(profile, goal), daemon=True).start()

    def _cua_worker(self, profile: str, goal: str):
        try:
            self.ui_queue.put(("sys", f"CUA starting in 4 seconds ({profile}) — click your game window! Press F12 anytime to stop."))
            for sec in range(4, 0, -1):
                if self.cua_stop_event.is_set() or (keyboard and keyboard.is_pressed("f12")):
                    self.ui_queue.put(("sys", "CUA cancelled before start."))
                    return
                self.ui_queue.put(("status", f"Starting CUA in {sec}s... (click game window)"))
                time.sleep(1)

            hint = PROFILE_HINTS.get(profile, PROFILE_HINTS["generic"])
            cua_hist = []
            step_num = 0

            while not self.cua_stop_event.is_set():
                if keyboard and keyboard.is_pressed("f12"):
                    self.ui_queue.put(("sys", "F12 pressed — CUA stopped safely!"))
                    break

                step_num += 1
                self.ui_queue.put(("status", f"CUA Step {step_num} active (F12 stops)"))
                jpg_bytes, sw, sh = capture_screen_jpeg(max_width=1280)

                hist_txt = ""
                if cua_hist:
                    hist_txt = "\nRecent steps:\n" + "\n".join(
                        f"{i+1}. {h.get('action')} ({h.get('observation', '')})" for i, h in enumerate(cua_hist[-6:])
                    )

                sys_prompt = (
                    f"You are Ada acting as a Computer-Using Agent (CUA) on Doc's Windows PC.\n"
                    f"Screen size: {sw}x{sh}. Always output normalized x,y in 0..1000.\n"
                    "NEVER click inside Ada's own 'Ada Desktop' window.\n"
                    f"{hint}\n"
                    "Return ONE single JSON object (NOT a JSON array) with keys: observation, thought, action "
                    "(click|double_click|right_click|move|drag|press_key|hold_key|hotkey|type|scroll|wait|done), "
                    "x, y, endX, endY, key, keys, text, scrollDelta, durationMs, adaSay."
                )

                raw = self._generate_with_fallback(
                    [
                        types.Part.from_bytes(data=jpg_bytes, mime_type="image/jpeg"),
                        f"Goal: {goal}{hist_txt}\nPick the single best next action as one JSON object.",
                    ],
                    sys_prompt,
                    json_mode=True,
                )
                cleaned_raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.IGNORECASE)
                parsed = json.loads(cleaned_raw)
                if isinstance(parsed, list):
                    step = next((item for item in parsed if isinstance(item, dict)), {"action": "wait", "adaSay": ""})
                elif isinstance(parsed, dict):
                    step = parsed
                else:
                    step = {"action": "wait", "adaSay": ""}

                action = (step.get("action") or "wait").lower().strip()
                ada_say = (step.get("adaSay") or "").strip()
                if ada_say:
                    self.ui_queue.put(("chat", ("Ada", f"[{action}] {ada_say}")))

                if action == "done":
                    self.ui_queue.put(("sys", "CUA finished goal!"))
                    break

                execute_cua_action(step, sw, sh)
                cua_hist.append({"action": action, "observation": step.get("observation", "")})
                time.sleep(0.85)
        except Exception as err:
            self.ui_queue.put(("sys", f"CUA stopped: {err}"))
        finally:
            self.ui_queue.put(("cua_state", False))
            self.ui_queue.put(("status", "Ready (CUA off)"))


def main():
    if sys.platform == "win32":
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            try:
                ctypes.windll.user32.SetProcessDPIAware()
            except Exception:
                pass
    root = tk.Tk()
    AdaDesktopApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
