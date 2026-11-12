# MTGA Mono-White Lifegain Pilot (Doc & Ada Edition) 🕊️✨

A clean, safe, and modular automated pilot for Magic: The Gathering Arena designed to play Mono-White Lifegain.

## 📁 Project Architecture
```
mtga_bot/
├── config/
│   └── mono_white_lifegain.txt  # 60-card MTGA decklist import
├── engine/
│   ├── log_reader.py            # Live Player.log parser (turns, phases, mulligan)
│   ├── strategy.py              # Mono-White Lifegain decision tree
│   └── input_executor.py        # Cubic Bezier humanized mouse movement & clicks
├── vision/                      # OpenCV screen scanner modules (optional templates)
└── main.py                      # Main automation loop with safety failsafes
```

## 🛡️ Anti-Detection & Account Safety
- **No Memory Injection**: Reads standard MTGA client logs written directly by the game (`Player.log`).
- **Humanized Bezier Curves**: The mouse glides across arcs with randomized offsets, variable jitter, and human hesitation (250–650ms), rather than snapping to exact pixel coordinates.
- **Emergency Hardware Kill-Switch**: Slam your mouse to the **top-left corner of your screen (0, 0)** to instantly kill PyAutoGUI and abort the bot immediately!

## 🚀 Setup & How to Run on Windows
1. **Enable Detailed Logs in MTGA**:
   - Open MTGA $\rightarrow$ Options (Gear Icon) $\rightarrow$ Account.
   - Check the box: **"Detailed Logs (Plugin Support)"**.
2. **Install Requirements**:
   ```bash
   pip install pyautogui
   ```
3. **Run Pilot**:
   ```bash
   python main.py
   ```
4. **Test First**: Test in "Bot Match" against Sparky before jumping into unranked queues!
