import time
import sys
import os

from engine.log_reader import MTGALogReader
from engine.input_executor import HumanInputExecutor
from engine.strategy import LifegainStrategyEngine

def run_pilot():
    print("=" * 60)
    print("   MTGA Mono-White Lifegain Pilot (Doc & Ada Edition) 🕊️✨")
    print("   Emergency Failsafe: Move mouse to TOP-LEFT CORNER (0,0)")
    print("=" * 60)

    log_reader = MTGALogReader()
    executor = HumanInputExecutor()
    strategy = LifegainStrategyEngine()

    print(f"[*] Checking MTGA Player.log at: {log_reader.log_path}")
    if not log_reader.check_log_exists():
        print("[!] Note: Player.log not found yet (start MTGA or verify path).")
        print("[*] Running in test/observation mode...")

    print("[*] Pilot Active. Press Ctrl+C in terminal or slam mouse to corner to abort.\n")

    try:
        last_action_time = time.time()
        while True:
            # 1. Update live state from game logs
            state = log_reader.update_state()
            
            # 2. Get planned actions from strategy engine
            actions = strategy.plan_turn(state)
            
            # 3. Rate-limit actions so it plays at natural human cadence
            current_time = time.time()
            if actions and (current_time - last_action_time > 1.8):
                action = actions[0]
                print(f"[Ada Pilot Decision] -> {action} | Phase: {state['phase']} | Turn: {state['turn_number']}")
                
                if action == "KEEP_MULLIGAN":
                    executor.click_named_button("keep_hand_button")
                    strategy.mulligan_pending = False
                elif action == "PLAY_LAND":
                    executor.play_land(hand_index=0)
                elif action == "CAST_SPELL":
                    executor.cast_spell(hand_index=1)
                elif action == "ALL_ATTACK":
                    executor.click_named_button("all_attack_button")
                    executor.press_spacebar()
                elif action == "PASS_PRIORITY":
                    executor.press_spacebar()
                    
                last_action_time = current_time

            time.sleep(0.5)

    except KeyboardInterrupt:
        print("\n[*] Pilot stopped safely by Doc. Have a great match!")

if __name__ == "__main__":
    run_pilot()
