// Full-rules Texas Hold'em Poker Engine (52-card deck, 7-card evaluator, side pots & bot AI)

export type Suit = "♠" | "♥" | "♦" | "♣";
export type RankNum = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J, 12=Q, 13=K, 14=A

export interface PokerCard {
  suit: Suit;
  rank: RankNum;
  id: string;
}

export interface HandEval {
  category: number; // 0..8
  tiebreakers: number[];
  label: string;
}

export type BotPersona = "maverick" | "ada" | "tux";

export interface SeatPlayer {
  id: string;
  name: string;
  isHuman: boolean;
  persona?: BotPersona;
  chips: number;
  holeCards: PokerCard[];
  currentBet: number; // bet on current street
  totalInPot: number; // total committed in current hand
  folded: boolean;
  allIn: boolean;
  busted: boolean; // out of chips before hand started
  actedThisStreet: boolean;
  lastAction: string;
  evalHand?: HandEval;
}

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: RankNum[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function rankLabel(r: RankNum): string {
  if (r === 14) return "A";
  if (r === 13) return "K";
  if (r === 12) return "Q";
  if (r === 11) return "J";
  return String(r);
}

function rankPlural(r: number): string {
  if (r === 14) return "Aces";
  if (r === 13) return "Kings";
  if (r === 12) return "Queens";
  if (r === 11) return "Jacks";
  if (r === 6) return "Sixes";
  return `${r}s`;
}

function rankSingular(r: number): string {
  if (r === 14) return "Ace";
  if (r === 13) return "King";
  if (r === 12) return "Queen";
  if (r === 11) return "Jack";
  return String(r);
}

export function createShuffledPokerDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}` });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function compareHandEvals(a: HandEval, b: HandEval): number {
  if (a.category !== b.category) return a.category - b.category;
  const len = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < len; i++) {
    const av = a.tiebreakers[i] ?? 0;
    const bv = b.tiebreakers[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function evaluateFiveCards(cards: PokerCard[]): HandEval {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const isFlush = cards.every((c) => c.suit === cards[0].suit);

  // Count frequencies
  const counts = new Map<number, number>();
  for (const r of ranks) {
    counts.set(r, (counts.get(r) || 0) + 1);
  }
  const groups = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  // Straight detection (including A-2-3-4-5 wheel)
  let straightHigh = 0;
  if (groups.length === 5) {
    if (ranks[0] - ranks[4] === 4) {
      straightHigh = ranks[0];
    } else if (
      ranks[0] === 14 &&
      ranks[1] === 5 &&
      ranks[2] === 4 &&
      ranks[3] === 3 &&
      ranks[4] === 2
    ) {
      straightHigh = 5;
    }
  }

  if (isFlush && straightHigh > 0) {
    return {
      category: 8,
      tiebreakers: [straightHigh],
      label: straightHigh === 14 ? "Royal Flush" : `Straight Flush, ${rankSingular(straightHigh)} high`,
    };
  }

  if (groups[0][1] === 4) {
    return {
      category: 7,
      tiebreakers: [groups[0][0], groups[1][0]],
      label: `Four of a Kind, ${rankPlural(groups[0][0])}`,
    };
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return {
      category: 6,
      tiebreakers: [groups[0][0], groups[1][0]],
      label: `Full House, ${rankPlural(groups[0][0])} full of ${rankPlural(groups[1][0])}`,
    };
  }

  if (isFlush) {
    return {
      category: 5,
      tiebreakers: ranks,
      label: `Flush, ${rankSingular(ranks[0])} high`,
    };
  }

  if (straightHigh > 0) {
    return {
      category: 4,
      tiebreakers: [straightHigh],
      label: `Straight, ${rankSingular(straightHigh)} high`,
    };
  }

  if (groups[0][1] === 3) {
    return {
      category: 3,
      tiebreakers: [groups[0][0], groups[1][0], groups[2][0]],
      label: `Three of a Kind, ${rankPlural(groups[0][0])}`,
    };
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    return {
      category: 2,
      tiebreakers: [groups[0][0], groups[1][0], groups[2][0]],
      label: `Two Pair, ${rankPlural(groups[0][0])} & ${rankPlural(groups[1][0])}`,
    };
  }

  if (groups[0][1] === 2) {
    return {
      category: 1,
      tiebreakers: [groups[0][0], groups[1][0], groups[2][0], groups[3][0]],
      label: `Pair of ${rankPlural(groups[0][0])}`,
    };
  }

  return {
    category: 0,
    tiebreakers: ranks,
    label: `High Card, ${rankSingular(ranks[0])}`,
  };
}

export function evaluateBestHand(cards: PokerCard[]): HandEval {
  if (cards.length < 5) {
    // Preflop partial label
    if (cards.length === 2) {
      const a = Math.max(cards[0].rank, cards[1].rank);
      const b = Math.min(cards[0].rank, cards[1].rank);
      if (a === b) {
        return { category: 1, tiebreakers: [a], label: `Pocket ${rankPlural(a)}` };
      }
      return {
        category: 0,
        tiebreakers: [a, b],
        label: `${rankSingular(a)}-${rankSingular(b)}${cards[0].suit === cards[1].suit ? " Suited" : ""}`,
      };
    }
    return { category: 0, tiebreakers: [0], label: "Waiting" };
  }

  if (cards.length === 5) return evaluateFiveCards(cards);

  let best: HandEval | null = null;
  const n = cards.length;
  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            const ev = evaluateFiveCards([cards[i], cards[j], cards[k], cards[l], cards[m]]);
            if (!best || compareHandEvals(ev, best) > 0) {
              best = ev;
            }
          }
        }
      }
    }
  }
  return best!;
}

// Resolve pot payouts accurately including all-in side pots
export function resolveShowdownPots(
  players: SeatPlayer[],
  community: PokerCard[],
  dealerIndex: number
): { payouts: Map<string, number>; summary: string } {
  const payouts = new Map<string, number>();
  const contenders = players.filter((p) => !p.folded && !p.busted);

  // If everyone else folded, sole survivor wins entire pot
  const totalPot = players.reduce((sum, p) => sum + p.totalInPot, 0);
  if (contenders.length === 1) {
    payouts.set(contenders[0].id, totalPot);
    return {
      payouts,
      summary: `${contenders[0].name} wins $${totalPot} (everyone else folded).`,
    };
  }

  // Evaluate each contender's best 5-card hand
  const evals = new Map<string, HandEval>();
  for (const p of contenders) {
    evals.set(p.id, evaluateBestHand([...p.holeCards, ...community]));
  }

  // Unique commitment tiers
  const levels = Array.from(
    new Set(players.filter((p) => p.totalInPot > 0).map((p) => p.totalInPot))
  ).sort((a, b) => a - b);

  let prevLevel = 0;
  const mainWinners: string[] = [];
  let mainLabel = "";

  for (const level of levels) {
    const slice = level - prevLevel;
    if (slice <= 0) continue;

    let potSlice = 0;
    for (const p of players) {
      if (p.totalInPot >= level) {
        potSlice += slice;
      } else if (p.totalInPot > prevLevel) {
        potSlice += p.totalInPot - prevLevel;
      }
    }

    const eligible = contenders.filter((p) => p.totalInPot >= level);
    if (eligible.length === 0) {
      prevLevel = level;
      continue;
    }

    let bestEval = evals.get(eligible[0].id)!;
    let sliceWinners = [eligible[0]];
    for (let i = 1; i < eligible.length; i++) {
      const ev = evals.get(eligible[i].id)!;
      const cmp = compareHandEvals(ev, bestEval);
      if (cmp > 0) {
        bestEval = ev;
        sliceWinners = [eligible[i]];
      } else if (cmp === 0) {
        sliceWinners.push(eligible[i]);
      }
    }

    // Split pot cleanly; odd chip goes to first winner clockwise from dealer
    const orderedWinners = [...sliceWinners].sort((a, b) => {
      const ai = players.findIndex((p) => p.id === a.id);
      const bi = players.findIndex((p) => p.id === b.id);
      const da = (ai - dealerIndex - 1 + players.length) % players.length;
      const db = (bi - dealerIndex - 1 + players.length) % players.length;
      return da - db;
    });

    const baseShare = Math.floor(potSlice / orderedWinners.length);
    let rem = potSlice % orderedWinners.length;
    for (const w of orderedWinners) {
      const extra = rem > 0 ? 1 : 0;
      if (rem > 0) rem--;
      payouts.set(w.id, (payouts.get(w.id) || 0) + baseShare + extra);
    }

    if (prevLevel === 0) {
      mainWinners.push(...orderedWinners.map((w) => w.name));
      mainLabel = bestEval.label;
    }
    prevLevel = level;
  }

  const winnerNames =
    mainWinners.length === 1 ? mainWinners[0] : `${mainWinners.join(" & ")} split`;
  return {
    payouts,
    summary: `${winnerNames} win${mainWinners.length === 1 ? "s" : ""} $${totalPot} (${mainLabel}).`,
  };
}

// ============================================================================
// Bot Decision Engine (Ada, Maverick, Tux Jr.)
// ============================================================================

export type BotDecision =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; raiseTo: number };

function preflopScore(cards: PokerCard[]): number {
  const r1 = Math.max(cards[0].rank, cards[1].rank);
  const r2 = Math.min(cards[0].rank, cards[1].rank);
  const suited = cards[0].suit === cards[1].suit;
  const gap = r1 - r2;

  let score = r1 * 2;
  if (r1 === r2) score = Math.max(16, r1 * 3 + 6);
  if (suited) score += 4;
  if (gap === 1) score += 3;
  else if (gap === 2) score += 1;
  return score; // roughly 10..48
}

function hasFlushOrStraightDraw(cards: PokerCard[]): boolean {
  if (cards.length < 5 || cards.length >= 7) return false;
  const suitCounts = new Map<Suit, number>();
  for (const c of cards) {
    suitCounts.set(c.suit, (suitCounts.get(c.suit) || 0) + 1);
  }
  for (const count of suitCounts.values()) {
    if (count === 4) return true;
  }
  const uniqueRanks = Array.from(new Set(cards.map((c) => c.rank))).sort((a, b) => a - b);
  for (let i = 0; i <= uniqueRanks.length - 4; i++) {
    if (uniqueRanks[i + 3] - uniqueRanks[i] <= 4) return true;
  }
  return false;
}

export function decideBotAction(
  player: SeatPlayer,
  community: PokerCard[],
  highestBet: number,
  minRaiseDelta: number,
  pot: number,
  raisesThisStreet: number
): BotDecision {
  const toCall = Math.max(0, highestBet - player.currentBet);
  const persona = player.persona || "ada";
  const canRaise = raisesThisStreet < 3 && player.chips > toCall + 10;
  const roll = Math.random();

  // Compute normalized 0..1 hand strength
  let strength = 0.35;
  if (community.length === 0) {
    const pf = preflopScore(player.holeCards);
    strength = Math.min(1, Math.max(0.08, (pf - 10) / 36));
  } else {
    const all = [...player.holeCards, ...community];
    const ev = evaluateBestHand(all);
    const draw = hasFlushOrStraightDraw(all);

    if (ev.category >= 4) strength = 0.94;
    else if (ev.category === 3) strength = 0.84;
    else if (ev.category === 2) strength = 0.72;
    else if (ev.category === 1) {
      const pairRank = ev.tiebreakers[0];
      const boardRanks = community.map((c) => c.rank);
      const maxBoard = Math.max(...boardRanks);
      const holePair = player.holeCards[0].rank === player.holeCards[1].rank;
      if (holePair && pairRank > maxBoard) strength = 0.66;
      else if (pairRank >= maxBoard) strength = 0.56;
      else strength = 0.38;
    } else {
      strength = draw ? 0.42 : Math.max(player.holeCards[0].rank, player.holeCards[1].rank) >= 13 ? 0.25 : 0.14;
    }
    if (draw && strength < 0.7) strength += 0.14;
  }

  // Persona adjustments
  const aggression = persona === "maverick" ? 0.18 : persona === "tux" ? 0.1 : 0.04;
  const bluffChance = persona === "maverick" ? 0.2 : persona === "tux" ? 0.14 : 0.06;
  const effectiveStrength = Math.min(1, strength + (roll < bluffChance ? 0.32 : 0));

  const callRatio = toCall / Math.max(1, player.chips);

  if (toCall === 0) {
    // Option to check or open bet
    if (canRaise && (effectiveStrength > 0.62 || (roll < aggression && effectiveStrength > 0.36))) {
      const betSize = Math.max(
        minRaiseDelta,
        Math.round((pot * (effectiveStrength > 0.8 ? 0.65 : 0.45)) / 10) * 10
      );
      const targetBet = Math.min(player.currentBet + player.chips, highestBet + Math.max(20, betSize));
      if (targetBet > highestBet) {
        return { type: "raise", raiseTo: targetBet };
      }
    }
    return { type: "check" };
  }

  // Facing a bet
  if (effectiveStrength < 0.24 && (toCall > 20 || callRatio > 0.08)) {
    return { type: "fold" };
  }
  if (effectiveStrength < 0.44 && callRatio > 0.25) {
    return { type: "fold" };
  }
  if (effectiveStrength < 0.58 && callRatio > 0.55) {
    return { type: "fold" };
  }

  if (canRaise && effectiveStrength > 0.74 && roll < 0.55 + aggression) {
    const bump = Math.max(
      minRaiseDelta,
      Math.round((pot * 0.55) / 10) * 10
    );
    const raiseTo = Math.min(player.currentBet + player.chips, highestBet + bump);
    if (raiseTo >= highestBet + minRaiseDelta) {
      return { type: "raise", raiseTo };
    }
  }

  return { type: "call" };
}
