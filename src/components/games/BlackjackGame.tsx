import React, { useState, useRef, useEffect, useCallback } from "react";
import { RotateCcw, Coins } from "lucide-react";
import { playGameSound } from "./gameAudio";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

interface PlayingCard {
  suit: Suit;
  rank: Rank;
  id: string;
}

type RoundPhase = "BETTING" | "PLAYER_TURN" | "DEALER_TURN" | "ROUND_OVER";

interface BlackjackGameProps {
  muted: boolean;
}

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const CHIPS_STORAGE_KEY = "doc_ada_game_blackjack_chips";
const WINS_STORAGE_KEY = "doc_ada_game_blackjack_wins";

function createShuffledDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}-${Math.random().toString(36).slice(2, 6)}` });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function handTotal(cards: PlayingCard[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces += 1;
      total += 11;
    } else if (["K", "Q", "J"].includes(c.rank)) {
      total += 10;
    } else {
      total += parseInt(c.rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

const CardView: React.FC<{ card: PlayingCard; hidden?: boolean }> = ({ card, hidden }) => {
  if (hidden) {
    return (
      <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl bg-stone-900 border-2 border-amber-500/60 shadow-lg flex items-center justify-center select-none">
        <div className="w-14 h-22 sm:w-16 sm:h-26 rounded-lg border border-amber-500/30 bg-amber-950/40 flex items-center justify-center text-amber-400/70 font-serif font-bold text-lg">
          A
        </div>
      </div>
    );
  }

  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl bg-white border border-stone-300 shadow-lg p-2 flex flex-col justify-between select-none transition-transform duration-150 hover:-translate-y-1">
      <div className={`text-left leading-none font-bold ${isRed ? "text-red-600" : "text-stone-900"}`}>
        <div className="text-base sm:text-lg font-mono">{card.rank}</div>
        <div className="text-sm">{card.suit}</div>
      </div>
      <div className={`text-center text-2xl sm:text-3xl leading-none ${isRed ? "text-red-600" : "text-stone-900"}`}>
        {card.suit}
      </div>
      <div className={`text-right leading-none font-bold rotate-180 ${isRed ? "text-red-600" : "text-stone-900"}`}>
        <div className="text-base sm:text-lg font-mono">{card.rank}</div>
        <div className="text-sm">{card.suit}</div>
      </div>
    </div>
  );
};

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ muted }) => {
  const [chips, setChips] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(CHIPS_STORAGE_KEY);
      const val = saved ? parseInt(saved, 10) : 500;
      return Number.isFinite(val) && val >= 0 ? val : 500;
    } catch {
      return 500;
    }
  });
  const [wins, setWins] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(WINS_STORAGE_KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  });

  const [bet, setBet] = useState<number>(25);
  const [phase, setPhase] = useState<RoundPhase>("BETTING");
  const [deck, setDeck] = useState<PlayingCard[]>(() => createShuffledDeck());
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [outcomeMsg, setOutcomeMsg] = useState<string>("Place your bet and deal a hand.");

  const dealerTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHIPS_STORAGE_KEY, String(chips));
      localStorage.setItem(WINS_STORAGE_KEY, String(wins));
    } catch (_) {}
  }, [chips, wins]);

  useEffect(() => {
    return () => {
      if (dealerTimerRef.current) window.clearTimeout(dealerTimerRef.current);
    };
  }, []);

  const settleHand = useCallback(
    (finalPlayer: PlayingCard[], finalDealer: PlayingCard[], wager: number) => {
      const pVal = handTotal(finalPlayer);
      const dVal = handTotal(finalDealer);
      const pBlackjack = finalPlayer.length === 2 && pVal === 21;

      if (pVal > 21) {
        setOutcomeMsg(`Bust with ${pVal}. Ada takes this hand.`);
        playGameSound("lose", muted);
      } else if (pBlackjack && dVal !== 21) {
        const payout = Math.floor(wager * 2.5);
        setChips((c) => c + payout);
        setWins((w) => w + 1);
        setOutcomeMsg(`Blackjack! You win ${payout} chips.`);
        playGameSound("win", muted);
      } else if (dVal > 21 || pVal > dVal) {
        const payout = wager * 2;
        setChips((c) => c + payout);
        setWins((w) => w + 1);
        setOutcomeMsg(
          dVal > 21
            ? `Dealer busts with ${dVal}! You win ${payout} chips.`
            : `You beat ${dVal} with ${pVal}! +${payout} chips.`
        );
        playGameSound("win", muted);
      } else if (pVal === dVal) {
        setChips((c) => c + wager);
        setOutcomeMsg(`Push at ${pVal}. Your ${wager} chips are returned.`);
        playGameSound("chip", muted);
      } else {
        setOutcomeMsg(`Dealer stands at ${dVal} against ${pVal}.`);
        playGameSound("lose", muted);
      }
      setPhase("ROUND_OVER");
    },
    [muted]
  );

  const runDealerTurn = useCallback(
    (currentPlayer: PlayingCard[], currentDealer: PlayingCard[], currentDeck: PlayingCard[], wager: number) => {
      setPhase("DEALER_TURN");
      let workingDealer = [...currentDealer];
      let workingDeck = [...currentDeck];

      const step = () => {
        if (handTotal(workingDealer) < 17) {
          if (workingDeck.length < 4) workingDeck = createShuffledDeck();
          const next = workingDeck[0];
          workingDeck = workingDeck.slice(1);
          workingDealer = [...workingDealer, next];
          setDealerHand(workingDealer);
          setDeck(workingDeck);
          playGameSound("card", muted);
          dealerTimerRef.current = window.setTimeout(step, 520);
        } else {
          settleHand(currentPlayer, workingDealer, wager);
        }
      };

      dealerTimerRef.current = window.setTimeout(step, 480);
    },
    [muted, settleHand]
  );

  const handleDeal = () => {
    const activeBet = Math.min(bet, chips);
    if (activeBet <= 0) return;
    if (dealerTimerRef.current) window.clearTimeout(dealerTimerRef.current);

    let workingDeck = deck.length < 14 ? createShuffledDeck() : [...deck];
    const pHand = [workingDeck[0], workingDeck[2]];
    const dHand = [workingDeck[1], workingDeck[3]];
    workingDeck = workingDeck.slice(4);

    setChips((c) => c - activeBet);
    setBet(activeBet);
    setDeck(workingDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    playGameSound("card", muted);

    if (handTotal(pHand) === 21) {
      settleHand(pHand, dHand, activeBet);
    } else {
      setOutcomeMsg("Your turn — Hit, Stand, or Double Down.");
      setPhase("PLAYER_TURN");
    }
  };

  const handleHit = () => {
    if (phase !== "PLAYER_TURN") return;
    let workingDeck = deck.length < 4 ? createShuffledDeck() : [...deck];
    const card = workingDeck[0];
    workingDeck = workingDeck.slice(1);
    const nextHand = [...playerHand, card];
    setDeck(workingDeck);
    setPlayerHand(nextHand);
    playGameSound("card", muted);

    const total = handTotal(nextHand);
    if (total > 21) {
      settleHand(nextHand, dealerHand, bet);
    } else if (total === 21) {
      runDealerTurn(nextHand, dealerHand, workingDeck, bet);
    }
  };

  const handleStand = () => {
    if (phase !== "PLAYER_TURN") return;
    runDealerTurn(playerHand, dealerHand, deck, bet);
  };

  const handleDoubleDown = () => {
    if (phase !== "PLAYER_TURN" || playerHand.length !== 2 || chips < bet) return;
    const newWager = bet * 2;
    setChips((c) => c - bet);
    setBet(newWager);

    let workingDeck = deck.length < 4 ? createShuffledDeck() : [...deck];
    const card = workingDeck[0];
    workingDeck = workingDeck.slice(1);
    const nextHand = [...playerHand, card];
    setDeck(workingDeck);
    setPlayerHand(nextHand);
    playGameSound("card", muted);

    if (handTotal(nextHand) > 21) {
      settleHand(nextHand, dealerHand, newWager);
    } else {
      runDealerTurn(nextHand, dealerHand, workingDeck, newWager);
    }
  };

  const handleNewRound = () => {
    if (chips <= 0) {
      setChips(500);
      setBet(25);
      setOutcomeMsg("House staked you a fresh 500 chips. Place your bet.");
    } else {
      setBet((b) => Math.min(b, chips));
      setOutcomeMsg("Place your bet and deal a hand.");
    }
    setPlayerHand([]);
    setDealerHand([]);
    setPhase("BETTING");
  };

  const playerTotal = handTotal(playerHand);
  const dealerVisibleTotal =
    phase === "PLAYER_TURN" && dealerHand.length > 0
      ? handTotal([dealerHand[0]])
      : handTotal(dealerHand);

  return (
    <div className="space-y-4">
      {/* Top Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-xl bg-stone-900 border border-stone-800">
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-stone-400 text-xs">Chips</span>
            <span className="font-bold text-white">{chips.toLocaleString()}</span>
          </div>
          <div className="font-mono tabular-nums">
            <span className="text-stone-400 text-xs mr-1.5">Current Bet</span>
            <span className="font-bold text-amber-400">{bet}</span>
          </div>
          <div className="font-mono tabular-nums text-xs text-stone-400">
            Hands Won <span className="text-stone-200 font-semibold">{wins}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setChips(500);
            setBet(25);
            setPlayerHand([]);
            setDealerHand([]);
            setPhase("BETTING");
            setOutcomeMsg("Bankroll reset to 500 chips.");
          }}
          className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-stone-700 bg-stone-950 hover:bg-stone-800 text-stone-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Bankroll</span>
        </button>
      </div>

      {/* Classic Felt Table Surface */}
      <div
        className="rounded-xl border-4 border-[#3E2723] p-6 sm:p-8 shadow-2xl min-h-[460px] flex flex-col justify-between gap-8"
        style={{ backgroundColor: "#0F5132" }}
      >
        {/* Dealer Zone */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-100/90">
            <span>Dealer · Ada &amp; Tux Jr.</span>
            <span className="font-mono tabular-nums">
              {dealerHand.length > 0 ? `Showing: ${dealerVisibleTotal}` : "Waiting for deal"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 min-h-[120px] sm:min-h-[138px]">
            {dealerHand.length === 0 ? (
              <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border border-dashed border-emerald-300/30 flex items-center justify-center text-xs text-emerald-200/50">
                Dealer
              </div>
            ) : (
              dealerHand.map((card, idx) => (
                <CardView key={card.id} card={card} hidden={phase === "PLAYER_TURN" && idx === 1} />
              ))
            )}
          </div>
        </div>

        {/* Table Center Message */}
        <div className="text-center py-2 border-y border-emerald-200/15">
          <p className="text-base sm:text-lg font-semibold text-white">{outcomeMsg}</p>
        </div>

        {/* Player Zone + Controls */}
        <div className="space-y-5">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-100/90">
            <span>Your Hand</span>
            <span className="font-mono tabular-nums">
              {playerHand.length > 0 ? `Total: ${playerTotal}` : "Ready"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 min-h-[120px] sm:min-h-[138px]">
            {playerHand.length === 0 ? (
              <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border border-dashed border-emerald-300/30 flex items-center justify-center text-xs text-emerald-200/50">
                Player
              </div>
            ) : (
              playerHand.map((card) => <CardView key={card.id} card={card} />)
            )}
          </div>

          {/* Action Bar */}
          {phase === "BETTING" && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={chips < amt && amt > chips}
                    onClick={() => {
                      setBet(Math.min(amt, Math.max(10, chips)));
                      playGameSound("chip", muted);
                    }}
                    className={`min-h-[42px] px-4 py-2 rounded-lg font-mono tabular-nums text-xs font-bold cursor-pointer transition-colors ${
                      bet === amt
                        ? "bg-amber-500 text-stone-950"
                        : "bg-black/30 hover:bg-black/45 text-white border border-emerald-200/20"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={chips <= 0}
                onClick={handleDeal}
                className="min-h-[44px] px-7 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 text-sm font-bold cursor-pointer transition-colors"
              >
                Deal Hand
              </button>
            </div>
          )}

          {phase === "PLAYER_TURN" && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleHit}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold cursor-pointer transition-colors"
              >
                Hit
              </button>
              <button
                type="button"
                onClick={handleStand}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-900 text-sm font-bold cursor-pointer transition-colors"
              >
                Stand
              </button>
              {playerHand.length === 2 && chips >= bet && (
                <button
                  type="button"
                  onClick={handleDoubleDown}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-black/35 hover:bg-black/50 border border-emerald-200/30 text-white text-sm font-semibold cursor-pointer transition-colors"
                >
                  Double Down
                </button>
              )}
            </div>
          )}

          {phase === "DEALER_TURN" && (
            <div className="pt-2 text-sm text-emerald-100/80 font-medium">
              Ada is revealing her hand...
            </div>
          )}

          {phase === "ROUND_OVER" && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleNewRound}
                className="min-h-[44px] px-7 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold cursor-pointer transition-colors"
              >
                {chips <= 0 ? "Refill Chips & Play Again" : "Next Hand"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
