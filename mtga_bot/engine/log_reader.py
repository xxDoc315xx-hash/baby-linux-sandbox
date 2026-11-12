import os
import json
import time
import re
from typing import Dict, Any, Optional, List

class MTGALogReader:
    """
    Watches and parses MTGA's Player.log in real time.
    Requires 'Detailed Logs (Plugin Support)' enabled in MTGA Audio/Graphic settings.
    Default Windows path: %USERPROFILE%/AppData/LocalLow/Wizards Of The Coast/MTGA/Player.log
    """
    def __init__(self, log_path: Optional[str] = None):
        if not log_path:
            # Default Windows AppData location
            user_profile = os.environ.get("USERPROFILE", "")
            self.log_path = os.path.join(
                user_profile, "AppData", "LocalLow", "Wizards Of The Coast", "MTGA", "Player.log"
            )
        else:
            self.log_path = log_path

        self._last_pos = 0
        self.game_state = {
            "in_match": False,
            "turn_number": 0,
            "active_player": None,
            "phase": "Unknown",
            "step": "Unknown",
            "life": {"player": 20, "opponent": 20},
            "my_turn": False,
            "has_priority": False,
            "mulligan_pending": False,
            "game_ended": False,
            "match_result": None
        }

    def check_log_exists(self) -> bool:
        return os.path.exists(self.log_path)

    def read_new_lines(self) -> List[str]:
        if not self.check_log_exists():
            return []
        
        try:
            with open(self.log_path, "r", encoding="utf-8", errors="ignore") as f:
                f.seek(self._last_pos)
                lines = f.readlines()
                self._last_pos = f.tell()
                return lines
        except Exception as e:
            return []

    def update_state(self) -> Dict[str, Any]:
        """
        Scans recent lines for GRE (Game Rules Engine) events, Match Door events, and Turn transitions.
        """
        lines = self.read_new_lines()
        for line in lines:
            line_str = line.strip()
            
            # Detect Match Entrance
            if "Event_PlayerRoom" in line_str or "MatchCreated" in line_str or "ConnectResp" in line_str:
                self.game_state["in_match"] = True
                self.game_state["game_ended"] = False

            # Detect Mulligan prompt
            if "MulliganReq" in line_str or "mulliganOption" in line_str:
                self.game_state["mulligan_pending"] = True

            # Detect Turn / Phase updates
            if "turnInfo" in line_str:
                match = re.search(r'"turnNumber":\s*(\d+)', line_str)
                if match:
                    self.game_state["turn_number"] = int(match.group(1))

                phase_match = re.search(r'"phase":\s*"([^"]+)"', line_str)
                if phase_match:
                    self.game_state["phase"] = phase_match.group(1)

                step_match = re.search(r'"step":\s*"([^"]+)"', line_str)
                if step_match:
                    self.game_state["step"] = step_match.group(1)

                active_match = re.search(r'"activePlayer":\s*(\d+)', line_str)
                if active_match:
                    self.game_state["active_player"] = int(active_match.group(1))

            # Detect Match End / Concede / Victory
            if "MatchResult" in line_str or "GameResult" in line_str or "Event_MatchComplete" in line_str:
                self.game_state["in_match"] = False
                self.game_state["game_ended"] = True

        return self.game_state
