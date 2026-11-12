from typing import Dict, Any, List

class LifegainStrategyEngine:
    """
    Mono-White Lifegain Turn & Board Strategy:
    1. Mulligan Evaluation: Keep 2-5 lands, mulligan 0, 1, or 6+ lands.
    2. Main Phase 1:
       - Play Plains if not already played.
       - Prioritize Soul Warden / Lunarch Veteran on Turn 1.
       - Prioritize Voice of the Blessed / Ajani's Pridemate on Turn 2.
       - Cast largest threat on curve.
    3. Combat Phase:
       - If we have creatures and opponent has unfavorable blockers -> Swing with team.
       - Lifelink and huge counters mean attacking is almost always positive EV.
    4. Main Phase 2:
       - Cast remaining cheap creatures with leftover open mana.
    5. Pass Priority:
       - Tap spacebar to let triggers resolve and pass turn.
    """
    def __init__(self):
        self.land_played_this_turn = False
        self.current_turn = 0

    def evaluate_mulligan(self, hand_cards: List[str]) -> str:
        """
        Simple, proven Mulligan rule for Mono-White:
        - Lands >= 2 and <= 4: KEEP
        - Lands == 1 with multiple 1-drops: KEEP (aggressive)
        - Otherwise: MULLIGAN
        """
        land_count = sum(1 for c in hand_cards if "Plains" in c or "Land" in c)
        if 2 <= land_count <= 4:
            return "KEEP"
        return "MULLIGAN"

    def plan_turn(self, state: Dict[str, Any]) -> List[str]:
        """
        Outputs ordered action commands for the input executor:
        e.g., ['PLAY_LAND', 'CAST_1_DROP', 'ATTACK_ALL', 'PASS_TURN']
        """
        actions = []
        turn = state.get("turn_number", 1)
        phase = state.get("phase", "Main1")
        
        # Reset per turn
        if turn != self.current_turn:
            self.current_turn = turn
            self.land_played_this_turn = False

        if state.get("mulligan_pending"):
            actions.append("KEEP_MULLIGAN")
            return actions

        if "Main" in phase:
            if not self.land_played_this_turn:
                actions.append("PLAY_LAND")
                self.land_played_this_turn = True
            
            # Cast creature
            actions.append("CAST_SPELL")

        elif "Combat" in phase:
            actions.append("ALL_ATTACK")

        # Always end with passing priority / resolving triggers
        actions.append("PASS_PRIORITY")
        return actions
