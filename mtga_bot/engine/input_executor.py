import time
import random
import math
from typing import Tuple

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
    pyautogui.FAILSAFE = True  # Move mouse to top-left corner (0,0) to instantly abort!
except ImportError:
    PYAUTOGUI_AVAILABLE = False

class HumanInputExecutor:
    """
    Executes humanized, non-detectable mouse clicks, drags, and keystrokes.
    - Uses cubic Bezier curves rather than direct linear teleportation.
    - Injects randomized jitter, hesitation, and variance (250ms - 650ms).
    - Emergency abort: slam mouse to (0,0) corner.
    """
    def __init__(self, screen_resolution: Tuple[int, int] = (1920, 1080)):
        self.width, self.height = screen_resolution
        
        # Standard 1080p button anchor coordinates (scaled proportionally)
        self.button_positions = {
            "orange_pass_button": (1680, 930),     # Bottom right 'Pass Turn' / 'Next' / 'Attack'
            "keep_hand_button": (1150, 840),       # Mulligan 'Keep'
            "mulligan_button": (770, 840),         # 'Mulligan'
            "all_attack_button": (1680, 930),      # During Declare Attackers
            "resolve_button": (1680, 930),         # Resolve triggers
            "done_button": (960, 930),             # Center prompts like 'Done'
            "cancel_button": (420, 930),
            "play_game_button": (1680, 1000)       # Main lobby 'Play'
        }

    def _bezier_curve(self, start: Tuple[int, int], end: Tuple[int, int], control: Tuple[int, int], t: float) -> Tuple[int, int]:
        x = (1 - t)**2 * start[0] + 2 * (1 - t) * t * control[0] + t**2 * end[0]
        y = (1 - t)**2 * start[1] + 2 * (1 - t) * t * control[1] + t**2 * end[1]
        return int(x), int(y)

    def human_move(self, target_x: int, target_y: int, speed: float = 0.35):
        if not PYAUTOGUI_AVAILABLE:
            print(f"[SIMULATED MOUSE MOVE] -> ({target_x}, {target_y})")
            return

        current_x, current_y = pyautogui.position()
        
        # Add random human offset so we never click the exact same pixel
        jitter_x = target_x + random.randint(-8, 8)
        jitter_y = target_y + random.randint(-6, 6)

        # Control point for arc
        mid_x = (current_x + jitter_x) // 2 + random.randint(-40, 40)
        mid_y = (current_y + jitter_y) // 2 + random.randint(-40, 40)

        steps = 15
        for i in range(1, steps + 1):
            t = i / float(steps)
            nx, ny = self._bezier_curve((current_x, current_y), (jitter_x, jitter_y), (mid_x, mid_y), t)
            pyautogui.moveTo(nx, ny)
            time.sleep(random.uniform(0.008, 0.022))

    def human_click(self, target_x: int, target_y: int):
        self.human_move(target_x, target_y)
        time.sleep(random.uniform(0.08, 0.22)) # Human hesitation before click
        if PYAUTOGUI_AVAILABLE:
            pyautogui.click()
        else:
            print(f"[SIMULATED MOUSE CLICK] -> ({target_x}, {target_y})")
        time.sleep(random.uniform(0.12, 0.28)) # Release delay

    def click_named_button(self, name: str) -> bool:
        coords = self.button_positions.get(name)
        if coords:
            self.human_click(coords[0], coords[1])
            return True
        return False

    def press_spacebar(self):
        """Standard MTGA shortcut to pass priority / resolve"""
        time.sleep(random.uniform(0.15, 0.40))
        if PYAUTOGUI_AVAILABLE:
            pyautogui.press("space")
        else:
            print("[SIMULATED KEYPRESS] -> SPACEBAR")

    def play_land(self, hand_index: int = 0, total_cards_in_hand: int = 5):
        """
        Calculates hand card coordinate, drags card up to battlefield
        """
        hand_y = 1000
        # Calculate dynamic hand distribution
        start_x = 750
        gap = 85
        card_x = start_x + (hand_index * gap)
        
        self.human_move(card_x, hand_y)
        time.sleep(random.uniform(0.1, 0.2))
        
        # Drag to center battlefield
        battlefield_x = 960 + random.randint(-100, 100)
        battlefield_y = 650 + random.randint(-40, 40)
        
        if PYAUTOGUI_AVAILABLE:
            pyautogui.mouseDown()
            self.human_move(battlefield_x, battlefield_y)
            pyautogui.mouseUp()
        else:
            print(f"[SIMULATED DRAG CARD] From ({card_x}, {hand_y}) to ({battlefield_x}, {battlefield_y})")

    def cast_spell(self, hand_index: int = 0, total_cards_in_hand: int = 5):
        self.play_land(hand_index, total_cards_in_hand)
