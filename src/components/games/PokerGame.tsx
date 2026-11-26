import React, { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw, Coins } from "lucide-react";
import {
  PokerCard,
  SeatPlayer,
  createShuffledPokerDeck,
  evaluateBestHand,
  resolveShowdownPots,
  decideBotAction,
  rankLabel,
} from "./pokerEngine";
import { playGameSound } from "./gameAudio";

type Street = "IDLE" | "PREFLOP" | "FLOP" | "TURN" | "RIVER" | "SHOWDOWN";

interface PokerGameProps {
  muted: boolean;
  isFullscreen?: boolean;
}

const STARTING_STACK = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const CHIPS_KEY = "doc_ada_game_poker_chips";
const HANDS_WON_KEY = "doc_ada_game_poker_wins";

function createInitialSeats(savedHumanChips: number): SeatPlayer[] {
  return [
    {
      id: "doc",
      name: "You",
      isHuman: true,
      chips: savedHumanChips > 0 ? savedHumanChips : STARTING_STACK,
      holeCards: [],
      currentBet: 0,
      totalInPot: 0,
      folded: false,
      allIn: false,
      busted: false,
      actedThisStreet: false,
      lastAction: "",
    },
    {
      id: "maverick",
      name: "Maverick",
      isHuman: false,
      persona: "maverick",
      chips: STARTING_STACK,
      holeCards: [],
      currentBet: 0,
      totalInPot: 0,
      folded: false,
      allIn: false,
      busted: false,
      actedThisStreet: false,
      lastAction: "",
    },
    {
      id: "ada",
      name: "Ada",
      isHuman: false,
      persona: "ada",
      chips: STARTING_STACK,
      holeCards: [],
      currentBet: 0,
      totalInPot: 0,
      folded: false,
      allIn: false,
      busted: false,
      actedThisStreet: false,
      lastAction: "",
    },
    {
      id: "tux",
      name: "Tux Jr.",
      isHuman: false,
      persona: "tux",
      chips: STARTING_STACK,
      holeCards: [],
      currentBet: 0,
      totalInPot: 0,
      folded: false,
      allIn: false,
      busted: false,
      actedThisStreet: false,
      lastAction: "",
    },
  ];
}

const MiniCard: React.FC<{ card?: PokerCard; hidden?: boolean; compact?: boolean }> = ({
  card,
  hidden,
  compact = false,
}) => {
  const sizeClass = compact
    ? "w-11 h-15 sm:w-12 sm:h-17"
    : "w-13 h-19 sm:w-16 sm:h-23";

  if (hidden || !card) {
    return (
      <div
        className={`${sizeClass} rounded-lg bg-stone-900 border border-amber-500/50 shadow-md flex items-center justify-center select-none`}
      >
        <div className="w-[75%] h-[78%] rounded border border-amber-500/25 bg-amber-950/40 flex items-center justify-center text-amber-400/70 font-serif font-bold text-xs">
          A
        </div>
      </div>
    );
  }

  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <div
      className={`${sizeClass} rounded-lg bg-white border border-stone-300 shadow-md p-1.5 flex flex-col justify-between select-none`}
    >
      <div
        className={`leading-none font-bold ${isRed ? "text-red-600" : "text-stone-900"}`}
      >
        <div className={compact ? "text-xs font-mono" : "text-sm sm:text-base font-mono"}>
          {rankLabel(card.rank)}
        </div>
        <div className={compact ? "text-[10px]" : "text-xs"}>{card.suit}</div>
      </div>
      <div
        className={`text-center leading-none ${
          compact ? "text-lg" : "text-2xl sm:text-3xl"
        } ${isRed ? "text-red-600" : "text-stone-900"}`}
      >
        {card.suit}
      </div>
      <div
        className={`leading-none font-bold rotate-180 ${
          isRed ? "text-red-600" : "text-stone-900"
        }`}
      >
        <div className={compact ? "text-xs font-mono" : "text-sm sm:text-base font-mono"}>
          {rankLabel(card.rank)}
        </div>
      </div>
    </div>
  );
};

export const PokerGame: React.FC<PokerGameProps> = ({ muted, isFullscreen = false }) => {
  const [seats, setSeats] = useState<SeatPlayer[]>(() => {
    let savedChips = STARTING_STACK;
    try {
      const raw = localStorage.getItem(CHIPS_KEY);
      if (raw) {
        const parsed = parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed > 0) savedChips = parsed;
      }
    } catch (_) {}
    return createInitialSeats(savedChips);
  });

  const [handsWon, setHandsWon] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(HANDS_WON_KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  });

  const [street, setStreet] = useState<Street>("IDLE");
  const [deck, setDeck] = useState<PokerCard[]>([]);
  const [community, setCommunity] = useState<PokerCard[]>([]);
  const [dealerIdx, setDealerIdx] = useState<number>(0);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [highestBet, setHighestBet] = useState<number>(0);
  const [minRaiseDelta, setMinRaiseDelta] = useState<number>(BIG_BLIND);
  const [raisesThisStreet, setRaisesThisStreet] = useState<number>(0);
  const [raiseInput, setRaiseInput] = useState<number>(40);
  const [tableMessage, setTableMessage] = useState<string>(
    "Four-seat bridge table ready. Deal a hand to start."
  );

  const botTimerRef = useRef<number | null>(null);
  const runoutTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const human = seats[0];
    try {
      localStorage.setItem(CHIPS_KEY, String(human.chips));
      localStorage.setItem(HANDS_WON_KEY, String(handsWon));
    } catch (_) {}
  }, [seats, handsWon]);

  useEffect(() => {
    return () => {
      if (botTimerRef.current) window.clearTimeout(botTimerRef.current);
      if (runoutTimerRef.current) window.clearTimeout(runoutTimerRef.current);
    };
  }, []);

  const pot = seats.reduce((sum, s) => sum + s.totalInPot, 0);
  const humanSeat = seats[0];
  const aliveSeatsCount = seats.filter((s) => s.chips > 0).length;

  const findNextActiveIndex = useCallback(
    (list: SeatPlayer[], fromIdx: number): number => {
      for (let step = 1; step <= list.length; step++) {
        const idx = (fromIdx + step) % list.length;
        const p = list[idx];
        if (!p.busted && !p.folded && !p.allIn) return idx;
      }
      return -1;
    },
    []
  );

  const finishToShowdown = useCallback(
    (finalSeats: SeatPlayer[], boardCards: PokerCard[], curDealer: number) => {
      const { payouts, summary } = resolveShowdownPots(finalSeats, boardCards, curDealer);
      const contenders = finalSeats.filter((s) => !s.folded && !s.busted);
      const updated = finalSeats.map((s) => {
        const won = payouts.get(s.id) || 0;
        const evalHand =
          contenders.length > 1 && !s.folded && !s.busted
            ? evaluateBestHand([...s.holeCards, ...boardCards])
            : undefined;
        return {
          ...s,
          chips: s.chips + won,
          currentBet: 0,
          evalHand,
        };
      });

      const humanWon = payouts.get("doc") || 0;
      if (humanWon > 0) {
        setHandsWon((w) => w + 1);
        playGameSound("win", muted);
      } else {
        playGameSound("lose", muted);
      }

      setSeats(updated);
      setActiveIdx(-1);
      setHighestBet(0);
      setStreet("SHOWDOWN");
      setTableMessage(summary);
    },
    [muted]
  );

  const advanceStreetOrShowdown = useCallback(
    (
      curSeats: SeatPlayer[],
      curDeck: PokerCard[],
      curCommunity: PokerCard[],
      curStreet: Street,
      curDealer: number
    ) => {
      const notFolded = curSeats.filter((s) => !s.busted && !s.folded);
      if (notFolded.length <= 1) {
        finishToShowdown(curSeats, curCommunity, curDealer);
        return;
      }

      if (curStreet === "RIVER") {
        finishToShowdown(curSeats, curCommunity, curDealer);
        return;
      }

      let nextStreet: Street = "FLOP";
      let drawCount = 3;
      if (curStreet === "FLOP") {
        nextStreet = "TURN";
        drawCount = 1;
      } else if (curStreet === "TURN") {
        nextStreet = "RIVER";
        drawCount = 1;
      }

      const newCards = curDeck.slice(0, drawCount);
      const nextDeck = curDeck.slice(drawCount);
      const nextBoard = [...curCommunity, ...newCards];

      const resetSeats = curSeats.map((s) => ({
        ...s,
        currentBet: 0,
        actedThisStreet: false,
        lastAction: s.folded ? "Folded" : s.allIn ? "All-In" : "",
      }));

      setDeck(nextDeck);
      setCommunity(nextBoard);
      setStreet(nextStreet);
      setHighestBet(0);
      setMinRaiseDelta(BIG_BLIND);
      setRaisesThisStreet(0);
      setRaiseInput(BIG_BLIND);
      setSeats(resetSeats);
      playGameSound("card", muted);

      // Check if >= 2 players can still make betting decisions
      const canAct = resetSeats.filter((s) => !s.busted && !s.folded && !s.allIn);
      if (canAct.length < 2) {
        setActiveIdx(-1);
        setTableMessage(`All-in runout — dealing ${nextStreet.toLowerCase()}...`);
        runoutTimerRef.current = window.setTimeout(() => {
          advanceStreetOrShowdown(resetSeats, nextDeck, nextBoard, nextStreet, curDealer);
        }, 750);
        return;
      }

      const firstActor = findNextActiveIndex(resetSeats, curDealer);
      setActiveIdx(firstActor);
      setTableMessage(`${nextStreet}: ${resetSeats[firstActor].name} to act.`);
    },
    [findNextActiveIndex, finishToShowdown, muted]
  );

  const handlePlayerCommit = useCallback(
    (
      actorIdx: number,
      action:
        | { type: "fold" }
        | { type: "check" }
        | { type: "call" }
        | { type: "raise"; raiseTo: number }
    ) => {
      const actor = seats[actorIdx];
      if (!actor || actorIdx !== activeIdx) return;

      let nextHighest = highestBet;
      let nextMinDelta = minRaiseDelta;
      let nextRaises = raisesThisStreet;
      let someoneRaised = false;

      const updatedSeats = seats.map((s, idx) => {
        if (idx !== actorIdx) return s;

        if (action.type === "fold") {
          return {
            ...s,
            folded: true,
            actedThisStreet: true,
            lastAction: "Fold",
          };
        }

        if (action.type === "check") {
          return {
            ...s,
            actedThisStreet: true,
            lastAction: "Check",
          };
        }

        if (action.type === "call") {
          const needed = Math.max(0, highestBet - s.currentBet);
          const paid = Math.min(s.chips, needed);
          const rem = s.chips - paid;
          return {
            ...s,
            chips: rem,
            currentBet: s.currentBet + paid,
            totalInPot: s.totalInPot + paid,
            allIn: rem === 0,
            actedThisStreet: true,
            lastAction: rem === 0 ? "All-In" : `Call $${paid}`,
          };
        }

        // Raise / Bet
        const clampedTarget = Math.min(
          s.currentBet + s.chips,
          Math.max(highestBet + BIG_BLIND, action.raiseTo)
        );
        const added = Math.max(0, clampedTarget - s.currentBet);
        const rem = s.chips - added;
        const newBet = s.currentBet + added;
        if (newBet > highestBet) {
          someoneRaised = true;
          nextMinDelta = Math.max(BIG_BLIND, newBet - highestBet);
          nextHighest = newBet;
          nextRaises += 1;
        }
        return {
          ...s,
          chips: rem,
          currentBet: newBet,
          totalInPot: s.totalInPot + added,
          allIn: rem === 0,
          actedThisStreet: true,
          lastAction:
            rem === 0
              ? `All-In $${newBet}`
              : highestBet === 0
              ? `Bet $${newBet}`
              : `Raise $${newBet}`,
        };
      });

      const finalSeats = someoneRaised
        ? updatedSeats.map((s, idx) =>
            idx === actorIdx ? s : { ...s, actedThisStreet: false }
          )
        : updatedSeats;

      playGameSound(action.type === "fold" ? "card" : "chip", muted);

      setSeats(finalSeats);
      setHighestBet(nextHighest);
      setMinRaiseDelta(nextMinDelta);
      setRaisesThisStreet(nextRaises);

      const remaining = finalSeats.filter((s) => !s.busted && !s.folded);
      if (remaining.length <= 1) {
        finishToShowdown(finalSeats, community, dealerIdx);
        return;
      }

      const nextIdx = findNextActiveIndex(finalSeats, actorIdx);
      const streetDone =
        nextIdx === -1 ||
        finalSeats
          .filter((s) => !s.busted && !s.folded && !s.allIn)
          .every((s) => s.actedThisStreet && s.currentBet === nextHighest);

      if (streetDone) {
        setActiveIdx(-1);
        advanceStreetOrShowdown(finalSeats, deck, community, street, dealerIdx);
      } else {
        setActiveIdx(nextIdx);
        setTableMessage(`${finalSeats[nextIdx].name} to act.`);
      }
    },
    [
      seats,
      activeIdx,
      highestBet,
      minRaiseDelta,
      raisesThisStreet,
      muted,
      community,
      dealerIdx,
      findNextActiveIndex,
      finishToShowdown,
      advanceStreetOrShowdown,
      deck,
      street,
    ]
  );

  // Trigger bot turn automatically
  useEffect(() => {
    if (
      activeIdx < 0 ||
      street === "IDLE" ||
      street === "SHOWDOWN" ||
      !seats[activeIdx] ||
      seats[activeIdx].isHuman
    ) {
      return;
    }

    const curSeat = seats[activeIdx];
    botTimerRef.current = window.setTimeout(() => {
      const decision = decideBotAction(
        curSeat,
        community,
        highestBet,
        minRaiseDelta,
        pot,
        raisesThisStreet
      );
      handlePlayerCommit(activeIdx, decision);
    }, 580);

    return () => {
      if (botTimerRef.current) window.clearTimeout(botTimerRef.current);
    };
  }, [
    activeIdx,
    street,
    seats,
    community,
    highestBet,
    minRaiseDelta,
    pot,
    raisesThisStreet,
    handlePlayerCommit,
  ]);

  // Keep raise slider bounds valid for Doc's turn
  useEffect(() => {
    if (activeIdx === 0) {
      const minTarget = Math.min(
        humanSeat.currentBet + humanSeat.chips,
        highestBet + minRaiseDelta
      );
      setRaiseInput(minTarget);
    }
  }, [activeIdx, highestBet, minRaiseDelta, humanSeat.currentBet, humanSeat.chips]);

  const dealNewHand = (rebuyAll = false) => {
    if (botTimerRef.current) window.clearTimeout(botTimerRef.current);
    if (runoutTimerRef.current) window.clearTimeout(runoutTimerRef.current);

    let baseSeats = seats.map((s) => ({
      ...s,
      chips: rebuyAll ? STARTING_STACK : s.chips,
    }));

    // Auto-rebuy human if broke and requested, or mark busted bots
    baseSeats = baseSeats.map((s) => ({
      ...s,
      busted: s.chips <= 0,
      holeCards: [],
      currentBet: 0,
      totalInPot: 0,
      folded: s.chips <= 0,
      allIn: false,
      actedThisStreet: false,
      lastAction: s.chips <= 0 ? "Out" : "",
      evalHand: undefined,
    }));

    const activePlayers = baseSeats.filter((s) => !s.busted);
    if (activePlayers.length < 2) {
      baseSeats = createInitialSeats(STARTING_STACK);
    }

    // Rotate dealer button to next non-busted seat
    let nextDealer = dealerIdx;
    if (street !== "IDLE") {
      for (let i = 1; i <= baseSeats.length; i++) {
        const cand = (dealerIdx + i) % baseSeats.length;
        if (!baseSeats[cand].busted) {
          nextDealer = cand;
          break;
        }
      }
    }

    const shuffled = createShuffledPokerDeck();
    let ptr = 0;
    const dealtSeats = baseSeats.map((s) => {
      if (s.busted) return s;
      const cards = [shuffled[ptr], shuffled[ptr + 1]];
      ptr += 2;
      return { ...s, holeCards: cards };
    });

    const sbIdx = findNextActiveIndex(dealtSeats, nextDealer);
    const bbIdx = findNextActiveIndex(dealtSeats, sbIdx);

    const postBlind = (idx: number, amount: number, tag: string) => {
      const p = dealtSeats[idx];
      const paid = Math.min(p.chips, amount);
      const rem = p.chips - paid;
      dealtSeats[idx] = {
        ...p,
        chips: rem,
        currentBet: paid,
        totalInPot: paid,
        allIn: rem === 0,
        lastAction: rem === 0 ? `All-In $${paid}` : `${tag} $${paid}`,
      };
    };

    postBlind(sbIdx, SMALL_BLIND, "SB");
    postBlind(bbIdx, BIG_BLIND, "BB");

    const firstActor = findNextActiveIndex(dealtSeats, bbIdx);

    setDealerIdx(nextDealer);
    setDeck(shuffled.slice(ptr));
    setCommunity([]);
    setSeats(dealtSeats);
    setStreet("PREFLOP");
    setHighestBet(BIG_BLIND);
    setMinRaiseDelta(BIG_BLIND);
    setRaisesThisStreet(0);
    setActiveIdx(firstActor);
    setTableMessage(`Pre-Flop: ${dealtSeats[firstActor].name} to act.`);
    playGameSound("card", muted);
  };

  const resetEntireTable = () => {
    if (botTimerRef.current) window.clearTimeout(botTimerRef.current);
    if (runoutTimerRef.current) window.clearTimeout(runoutTimerRef.current);
    setSeats(createInitialSeats(STARTING_STACK));
    setCommunity([]);
    setStreet("IDLE");
    setDealerIdx(0);
    setActiveIdx(-1);
    setHighestBet(0);
    setTableMessage("Fresh $1,000 stacks dealt around the table.");
  };

  const humanEval =
    humanSeat.holeCards.length > 0 && !humanSeat.folded
      ? evaluateBestHand([...humanSeat.holeCards, ...community])
      : null;

  const isHumanTurn = activeIdx === 0 && street !== "IDLE" && street !== "SHOWDOWN";
  const toCall = Math.max(0, highestBet - humanSeat.currentBet);
  const minRaiseTarget = Math.min(
    humanSeat.currentBet + humanSeat.chips,
    highestBet + minRaiseDelta
  );
  const maxRaiseTarget = humanSeat.currentBet + humanSeat.chips;

  const opponents = seats.slice(1);

  return (
    <div className="space-y-3">
      {/* Top Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800">
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-stone-400 text-xs">Your Stack</span>
            <span className="font-bold text-white">${humanSeat.chips.toLocaleString()}</span>
          </div>
          <div className="font-mono tabular-nums text-xs text-stone-400">
            Blinds <span className="text-stone-200 font-semibold">${SMALL_BLIND}/${BIG_BLIND}</span>
          </div>
          <div className="font-mono tabular-nums text-xs text-stone-400">
            Hands Won <span className="text-amber-400 font-bold">{handsWon}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={resetEntireTable}
          className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-stone-700 bg-stone-950 hover:bg-stone-800 text-stone-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Table ($1,000)</span>
        </button>
      </div>

      {/* Felt Poker Table */}
      <div
        className={`rounded-2xl border-4 border-[#3E2723] shadow-2xl flex flex-col justify-between ${
          isFullscreen ? "p-4 sm:p-6 gap-5" : "p-3.5 sm:p-5 gap-3.5"
        }`}
        style={{ backgroundColor: "#0F5132" }}
      >
        {/* Top Row: Maverick, Ada, Tux Jr. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {opponents.map((bot, idx) => {
            const seatIndex = idx + 1;
            const isActive = activeIdx === seatIndex;
            const isDealer = dealerIdx === seatIndex && street !== "IDLE";
            const revealCards = street === "SHOWDOWN" && !bot.folded && !bot.busted && seats.filter((s) => !s.folded && !s.busted).length > 1;

            return (
              <div
                key={bot.id}
                className={`rounded-xl p-2.5 sm:p-3 border transition-colors ${
                  bot.folded || bot.busted
                    ? "bg-black/25 border-emerald-200/10 opacity-65"
                    : isActive
                    ? "bg-black/40 border-amber-400"
                    : "bg-black/30 border-emerald-200/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{bot.name}</span>
                    {isDealer && (
                      <span className="text-[11px] font-mono font-bold text-amber-300">· D</span>
                    )}
                  </div>
                  <span className="font-mono tabular-nums text-xs font-semibold text-emerald-100">
                    ${bot.chips.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-h-[60px] sm:min-h-[68px]">
                    {bot.holeCards.length > 0 && !bot.busted ? (
                      bot.holeCards.map((c) => (
                        <MiniCard key={c.id} card={c} hidden={!revealCards} compact />
                      ))
                    ) : (
                      <span className="text-xs text-emerald-100/50">
                        {bot.busted ? "Busted out" : "Waiting"}
                      </span>
                    )}
                  </div>

                  <div className="text-right space-y-1">
                    {bot.lastAction && (
                      <div className="text-xs font-semibold text-amber-300">{bot.lastAction}</div>
                    )}
                    {bot.evalHand && (
                      <div className="text-[11px] text-emerald-100/90 max-w-[115px] leading-snug">
                        {bot.evalHand.label}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Board & Pot */}
        <div className="py-3 border-y border-emerald-200/15 flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-4 text-sm font-mono tabular-nums">
            <span className="text-emerald-100/80">Pot</span>
            <span className="text-lg sm:text-xl font-bold text-amber-300">${pot.toLocaleString()}</span>
            {street !== "IDLE" && (
              <span className="text-xs text-emerald-100/70 font-sans">· {street}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {Array.from({ length: 5 }).map((_, i) =>
              community[i] ? (
                <MiniCard key={community[i].id} card={community[i]} />
              ) : (
                <div
                  key={i}
                  className="w-13 h-19 sm:w-16 sm:h-23 rounded-lg border border-dashed border-emerald-200/25 flex items-center justify-center text-[11px] text-emerald-200/35"
                >
                  {i < 3 ? "Flop" : i === 3 ? "Turn" : "River"}
                </div>
              )
            )}
          </div>

          <p className="text-xs sm:text-sm font-semibold text-white text-center">
            {tableMessage}
          </p>
        </div>

        {/* Bottom Player Seat (You) & Action Bar */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {humanSeat.holeCards.length > 0 ? (
                  humanSeat.holeCards.map((c) => <MiniCard key={c.id} card={c} />)
                ) : (
                  <>
                    <div className="w-13 h-19 sm:w-16 sm:h-23 rounded-lg border border-dashed border-emerald-200/30" />
                    <div className="w-13 h-19 sm:w-16 sm:h-23 rounded-lg border border-dashed border-emerald-200/30" />
                  </>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span>You</span>
                  {dealerIdx === 0 && street !== "IDLE" && (
                    <span className="text-xs font-mono text-amber-300">· Dealer</span>
                  )}
                </div>
                {humanEval && (
                  <p className="text-xs sm:text-sm font-medium text-amber-300">{humanEval.label}</p>
                )}
                {humanSeat.lastAction && (
                  <p className="text-xs text-emerald-100/75">{humanSeat.lastAction}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {(street === "IDLE" || street === "SHOWDOWN") && (
              <div className="flex flex-wrap items-center gap-2.5">
                {humanSeat.chips <= 0 ? (
                  <button
                    type="button"
                    onClick={() => dealNewHand(true)}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold cursor-pointer transition-colors"
                  >
                    Rebuy $1,000 &amp; Deal
                  </button>
                ) : aliveSeatsCount <= 1 ? (
                  <button
                    type="button"
                    onClick={() => dealNewHand(true)}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold cursor-pointer transition-colors"
                  >
                    You Swept the Table! New Match
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => dealNewHand(false)}
                    className="min-h-[44px] px-7 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold cursor-pointer transition-colors"
                  >
                    {street === "IDLE" ? "Deal Hand" : "Next Hand"}
                  </button>
                )}
              </div>
            )}

            {isHumanTurn && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePlayerCommit(0, { type: "fold" })}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-emerald-200/25 text-stone-200 text-sm font-semibold cursor-pointer"
                >
                  Fold
                </button>

                {toCall === 0 ? (
                  <button
                    type="button"
                    onClick={() => handlePlayerCommit(0, { type: "check" })}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-950 text-sm font-bold cursor-pointer"
                  >
                    Check
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePlayerCommit(0, { type: "call" })}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-950 text-sm font-bold cursor-pointer font-mono tabular-nums"
                  >
                    {humanSeat.chips <= toCall ? `All-In $${humanSeat.chips}` : `Call $${toCall}`}
                  </button>
                )}

                {humanSeat.chips > toCall && raisesThisStreet < 3 && (
                  <button
                    type="button"
                    onClick={() =>
                      handlePlayerCommit(0, { type: "raise", raiseTo: raiseInput })
                    }
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold cursor-pointer font-mono tabular-nums"
                  >
                    {raiseInput >= maxRaiseTarget
                      ? `All-In $${maxRaiseTarget}`
                      : highestBet === 0
                      ? `Bet $${raiseInput}`
                      : `Raise to $${raiseInput}`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bet / Raise Slider Bar on Doc's Turn */}
          {isHumanTurn && humanSeat.chips > toCall && raisesThisStreet < 3 && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-emerald-200/15">
              <input
                type="range"
                min={minRaiseTarget}
                max={maxRaiseTarget}
                step={10}
                value={raiseInput}
                onChange={(e) => setRaiseInput(parseInt(e.target.value, 10))}
                aria-label="Raise amount"
                className="flex-1 min-w-[160px] accent-amber-400 cursor-pointer"
              />
              <div className="flex items-center gap-1.5">
                {[
                  { label: "Min", val: minRaiseTarget },
                  {
                    label: "1/2 Pot",
                    val: Math.min(
                      maxRaiseTarget,
                      Math.max(minRaiseTarget, Math.round((highestBet + pot * 0.5) / 10) * 10)
                    ),
                  },
                  {
                    label: "Pot",
                    val: Math.min(
                      maxRaiseTarget,
                      Math.max(minRaiseTarget, Math.round((highestBet + pot) / 10) * 10)
                    ),
                  },
                  { label: "All-In", val: maxRaiseTarget },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setRaiseInput(preset.val)}
                    className="px-3 py-1.5 rounded-lg bg-black/35 hover:bg-black/55 border border-emerald-200/20 text-xs font-medium text-emerald-50 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
