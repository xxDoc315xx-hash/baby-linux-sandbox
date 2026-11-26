// Full-rules Chess Engine + Alpha-Beta AI (with Quiescence & Piece-Square Tables)

export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface Piece {
  color: Color;
  type: PieceType;
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface ChessMove {
  from: number; // 0..63 (row*8 + col, row 0 = rank 8, row 7 = rank 1)
  to: number;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  isCastle?: "K" | "Q";
  isEnPassant?: boolean;
}

export interface GameState {
  board: (Piece | null)[];
  turn: Color;
  castling: CastlingRights;
  epSquare: number | null;
  halfMoveClock: number;
  fullMoveNumber: number;
  positionHistory: string[];
}

export type Difficulty = "casual" | "tactical" | "core";

export interface GameStatus {
  over: boolean;
  result: "ongoing" | "checkmate" | "stalemate" | "draw";
  winner?: Color;
  reason?: string;
  inCheck: boolean;
}

export function rcToIdx(r: number, c: number): number {
  return r * 8 + c;
}

export function idxToRc(idx: number): [number, number] {
  return [Math.floor(idx / 8), idx % 8];
}

export function idxToCoord(idx: number): string {
  const [r, c] = idxToRc(idx);
  return `${"abcdefgh"[c]}${8 - r}`;
}

export function createInitialGameState(): GameState {
  const backRank: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  const board: (Piece | null)[] = Array(64).fill(null);

  for (let c = 0; c < 8; c++) {
    board[rcToIdx(0, c)] = { color: "b", type: backRank[c] };
    board[rcToIdx(1, c)] = { color: "b", type: "p" };
    board[rcToIdx(6, c)] = { color: "w", type: "p" };
    board[rcToIdx(7, c)] = { color: "w", type: backRank[c] };
  }

  const state: GameState = {
    board,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    epSquare: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    positionHistory: [],
  };
  state.positionHistory = [serializePosition(state)];
  return state;
}

export function serializePosition(s: GameState): string {
  let b = "";
  for (let i = 0; i < 64; i++) {
    const p = s.board[i];
    b += p ? (p.color === "w" ? p.type.toUpperCase() : p.type) : ".";
  }
  const c =
    (s.castling.wK ? "K" : "") +
    (s.castling.wQ ? "Q" : "") +
    (s.castling.bK ? "k" : "") +
    (s.castling.bQ ? "q" : "");
  return `${b}:${s.turn}:${c || "-"}:${s.epSquare ?? "-"}`;
}

export function isSquareAttacked(
  board: (Piece | null)[],
  square: number,
  byColor: Color
): boolean {
  const [tr, tc] = idxToRc(square);

  // Pawns
  const pawnDir = byColor === "w" ? 1 : -1;
  const pr = tr + pawnDir;
  if (pr >= 0 && pr < 8) {
    for (const dc of [-1, 1]) {
      const pc = tc + dc;
      if (pc >= 0 && pc < 8) {
        const p = board[rcToIdx(pr, pc)];
        if (p && p.color === byColor && p.type === "p") return true;
      }
    }
  }

  // Knights
  const knightSteps = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const [dr, dc] of knightSteps) {
    const r = tr + dr;
    const c = tc + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[rcToIdx(r, c)];
      if (p && p.color === byColor && p.type === "n") return true;
    }
  }

  // Kings
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = tr + dr;
      const c = tc + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = board[rcToIdx(r, c)];
        if (p && p.color === byColor && p.type === "k") return true;
      }
    }
  }

  // Orthogonal rays (Rook / Queen)
  const ortho = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of ortho) {
    let r = tr + dr;
    let c = tc + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[rcToIdx(r, c)];
      if (p) {
        if (p.color === byColor && (p.type === "r" || p.type === "q")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  // Diagonal rays (Bishop / Queen)
  const diag = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of diag) {
    let r = tr + dr;
    let c = tc + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[rcToIdx(r, c)];
      if (p) {
        if (p.color === byColor && (p.type === "b" || p.type === "q")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

export function findKingSquare(board: (Piece | null)[], color: Color): number {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.color === color && p.type === "k") return i;
  }
  return -1;
}

export function isKingInCheck(board: (Piece | null)[], color: Color): boolean {
  const kSq = findKingSquare(board, color);
  if (kSq < 0) return false;
  return isSquareAttacked(board, kSq, color === "w" ? "b" : "w");
}

function generatePseudoLegalMoves(state: GameState): ChessMove[] {
  const moves: ChessMove[] = [];
  const { board, turn, castling, epSquare } = state;
  const opp: Color = turn === "w" ? "b" : "w";

  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece || piece.color !== turn) continue;
    const [r, c] = idxToRc(from);

    if (piece.type === "p") {
      const dir = turn === "w" ? -1 : 1;
      const startRow = turn === "w" ? 6 : 1;
      const promoRow = turn === "w" ? 0 : 7;

      const oneStepR = r + dir;
      if (oneStepR >= 0 && oneStepR < 8) {
        const oneIdx = rcToIdx(oneStepR, c);
        if (!board[oneIdx]) {
          if (oneStepR === promoRow) {
            for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
              moves.push({ from, to: oneIdx, piece, promotion: promo });
            }
          } else {
            moves.push({ from, to: oneIdx, piece });
            if (r === startRow) {
              const twoIdx = rcToIdx(r + dir * 2, c);
              if (!board[twoIdx]) {
                moves.push({ from, to: twoIdx, piece });
              }
            }
          }
        }

        // Captures & En Passant
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (nc < 0 || nc >= 8) continue;
          const capIdx = rcToIdx(oneStepR, nc);
          const target = board[capIdx];
          if (target && target.color === opp) {
            if (oneStepR === promoRow) {
              for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
                moves.push({ from, to: capIdx, piece, captured: target, promotion: promo });
              }
            } else {
              moves.push({ from, to: capIdx, piece, captured: target });
            }
          } else if (epSquare === capIdx) {
            const epPawn = board[rcToIdx(r, nc)];
            if (epPawn && epPawn.color === opp && epPawn.type === "p") {
              moves.push({
                from,
                to: capIdx,
                piece,
                captured: epPawn,
                isEnPassant: true,
              });
            }
          }
        }
      }
    } else if (piece.type === "n") {
      const steps = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ];
      for (const [dr, dc] of steps) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
        const to = rcToIdx(nr, nc);
        const target = board[to];
        if (!target || target.color === opp) {
          moves.push({ from, to, piece, captured: target || undefined });
        }
      }
    } else if (piece.type === "b" || piece.type === "r" || piece.type === "q") {
      const dirs: number[][] = [];
      if (piece.type === "b" || piece.type === "q") {
        dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }
      if (piece.type === "r" || piece.type === "q") {
        dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const to = rcToIdx(nr, nc);
          const target = board[to];
          if (!target) {
            moves.push({ from, to, piece });
          } else {
            if (target.color === opp) {
              moves.push({ from, to, piece, captured: target });
            }
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    } else if (piece.type === "k") {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
          const to = rcToIdx(nr, nc);
          const target = board[to];
          if (!target || target.color === opp) {
            moves.push({ from, to, piece, captured: target || undefined });
          }
        }
      }

      // Castling
      const homeRow = turn === "w" ? 7 : 0;
      if (r === homeRow && c === 4 && !isSquareAttacked(board, from, opp)) {
        const canK = turn === "w" ? castling.wK : castling.bK;
        const canQ = turn === "w" ? castling.wQ : castling.bQ;

        if (
          canK &&
          !board[rcToIdx(homeRow, 5)] &&
          !board[rcToIdx(homeRow, 6)] &&
          board[rcToIdx(homeRow, 7)]?.type === "r" &&
          board[rcToIdx(homeRow, 7)]?.color === turn &&
          !isSquareAttacked(board, rcToIdx(homeRow, 5), opp) &&
          !isSquareAttacked(board, rcToIdx(homeRow, 6), opp)
        ) {
          moves.push({ from, to: rcToIdx(homeRow, 6), piece, isCastle: "K" });
        }

        if (
          canQ &&
          !board[rcToIdx(homeRow, 3)] &&
          !board[rcToIdx(homeRow, 2)] &&
          !board[rcToIdx(homeRow, 1)] &&
          board[rcToIdx(homeRow, 0)]?.type === "r" &&
          board[rcToIdx(homeRow, 0)]?.color === turn &&
          !isSquareAttacked(board, rcToIdx(homeRow, 3), opp) &&
          !isSquareAttacked(board, rcToIdx(homeRow, 2), opp)
        ) {
          moves.push({ from, to: rcToIdx(homeRow, 2), piece, isCastle: "Q" });
        }
      }
    }
  }

  return moves;
}

export function applyMove(state: GameState, move: ChessMove, trackHistory = true): GameState {
  const board = state.board.slice();
  const castling: CastlingRights = { ...state.castling };
  const [fr, fc] = idxToRc(move.from);
  const [tr, tc] = idxToRc(move.to);

  board[move.from] = null;
  board[move.to] = move.promotion
    ? { color: move.piece.color, type: move.promotion }
    : move.piece;

  if (move.isEnPassant) {
    board[rcToIdx(fr, tc)] = null;
  }

  if (move.isCastle === "K") {
    board[rcToIdx(fr, 5)] = board[rcToIdx(fr, 7)];
    board[rcToIdx(fr, 7)] = null;
  } else if (move.isCastle === "Q") {
    board[rcToIdx(fr, 3)] = board[rcToIdx(fr, 0)];
    board[rcToIdx(fr, 0)] = null;
  }

  // Update castling rights
  if (move.piece.type === "k") {
    if (move.piece.color === "w") {
      castling.wK = false;
      castling.wQ = false;
    } else {
      castling.bK = false;
      castling.bQ = false;
    }
  }
  if (move.from === rcToIdx(7, 7) || move.to === rcToIdx(7, 7)) castling.wK = false;
  if (move.from === rcToIdx(7, 0) || move.to === rcToIdx(7, 0)) castling.wQ = false;
  if (move.from === rcToIdx(0, 7) || move.to === rcToIdx(0, 7)) castling.bK = false;
  if (move.from === rcToIdx(0, 0) || move.to === rcToIdx(0, 0)) castling.bQ = false;

  // En passant target square
  let epSquare: number | null = null;
  if (move.piece.type === "p" && Math.abs(tr - fr) === 2) {
    epSquare = rcToIdx((fr + tr) / 2, fc);
  }

  const nextTurn: Color = state.turn === "w" ? "b" : "w";
  const nextHalfMove =
    move.piece.type === "p" || move.captured ? 0 : state.halfMoveClock + 1;
  const nextFullMove =
    state.turn === "b" ? state.fullMoveNumber + 1 : state.fullMoveNumber;

  const nextState: GameState = {
    board,
    turn: nextTurn,
    castling,
    epSquare,
    halfMoveClock: nextHalfMove,
    fullMoveNumber: nextFullMove,
    positionHistory: state.positionHistory,
  };

  if (trackHistory) {
    nextState.positionHistory = [...state.positionHistory, serializePosition(nextState)];
  }
  return nextState;
}

export function generateLegalMoves(state: GameState): ChessMove[] {
  const pseudo = generatePseudoLegalMoves(state);
  return pseudo.filter((m) => {
    const next = applyMove(state, m, false);
    return !isKingInCheck(next.board, state.turn);
  });
}

function hasInsufficientMaterial(board: (Piece | null)[]): boolean {
  const wMinors: { type: PieceType; colorSq: number }[] = [];
  const bMinors: { type: PieceType; colorSq: number }[] = [];

  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.type === "k") continue;
    if (p.type === "p" || p.type === "r" || p.type === "q") return false;
    const [r, c] = idxToRc(i);
    const sqColor = (r + c) % 2;
    if (p.color === "w") wMinors.push({ type: p.type, colorSq: sqColor });
    else bMinors.push({ type: p.type, colorSq: sqColor });
  }

  if (wMinors.length === 0 && bMinors.length === 0) return true;
  if (wMinors.length === 1 && bMinors.length === 0) return true;
  if (bMinors.length === 1 && wMinors.length === 0) return true;
  if (
    wMinors.length === 1 &&
    bMinors.length === 1 &&
    wMinors[0].type === "b" &&
    bMinors[0].type === "b" &&
    wMinors[0].colorSq === bMinors[0].colorSq
  ) {
    return true;
  }
  return false;
}

export function getGameStatus(state: GameState): GameStatus {
  const legal = generateLegalMoves(state);
  const inCheck = isKingInCheck(state.board, state.turn);

  if (legal.length === 0) {
    if (inCheck) {
      return {
        over: true,
        result: "checkmate",
        winner: state.turn === "w" ? "b" : "w",
        reason: "Checkmate",
        inCheck: true,
      };
    }
    return {
      over: true,
      result: "stalemate",
      reason: "Stalemate",
      inCheck: false,
    };
  }

  if (state.halfMoveClock >= 100) {
    return { over: true, result: "draw", reason: "50-move draw", inCheck };
  }

  if (hasInsufficientMaterial(state.board)) {
    return { over: true, result: "draw", reason: "Insufficient material", inCheck };
  }

  // Threefold repetition check
  const currentPos = state.positionHistory[state.positionHistory.length - 1];
  if (currentPos) {
    let count = 0;
    for (const pos of state.positionHistory) {
      if (pos === currentPos) count++;
    }
    if (count >= 3) {
      return { over: true, result: "draw", reason: "Threefold repetition", inCheck };
    }
  }

  return { over: false, result: "ongoing", inCheck };
}

export function moveToSan(stateBefore: GameState, move: ChessMove): string {
  const after = applyMove(stateBefore, move, false);
  const nextLegal = generateLegalMoves(after);
  const oppInCheck = isKingInCheck(after.board, after.turn);
  const suffix =
    nextLegal.length === 0 && oppInCheck ? "#" : oppInCheck ? "+" : "";

  if (move.isCastle === "K") return `O-O${suffix}`;
  if (move.isCastle === "Q") return `O-O-O${suffix}`;

  const dest = idxToCoord(move.to);
  if (move.piece.type === "p") {
    const [, fc] = idxToRc(move.from);
    const capPrefix = move.captured ? `${"abcdefgh"[fc]}x` : "";
    const promoPart = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
    return `${capPrefix}${dest}${promoPart}${suffix}`;
  }

  const pieceChar = move.piece.type.toUpperCase();
  const sameTypeMoves = generateLegalMoves(stateBefore).filter(
    (m) =>
      m.piece.type === move.piece.type &&
      m.to === move.to &&
      m.from !== move.from
  );
  let disambig = "";
  if (sameTypeMoves.length > 0) {
    const [fr, fc] = idxToRc(move.from);
    const sameFile = sameTypeMoves.some((m) => idxToRc(m.from)[1] === fc);
    const sameRank = sameTypeMoves.some((m) => idxToRc(m.from)[0] === fr);
    if (!sameFile) disambig = "abcdefgh"[fc];
    else if (!sameRank) disambig = String(8 - fr);
    else disambig = `${"abcdefgh"[fc]}${8 - fr}`;
  }

  const cap = move.captured ? "x" : "";
  return `${pieceChar}${disambig}${cap}${dest}${suffix}`;
}

// =========================================================================
// AI Engine (Piece-Square Tables + MVV-LVA Ordering + Alpha-Beta + Quiescence)
// =========================================================================

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 27, 27, 10,  5,  5,
  0,  0,  0, 24, 24,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-22,-22, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MID_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

function getPstBonus(type: PieceType, color: Color, idx: number): number {
  const [r, c] = idxToRc(idx);
  const tableIdx = color === "w" ? rcToIdx(r, c) : rcToIdx(7 - r, c);
  switch (type) {
    case "p":
      return PAWN_PST[tableIdx];
    case "n":
      return KNIGHT_PST[tableIdx];
    case "b":
      return BISHOP_PST[tableIdx];
    case "r":
      return ROOK_PST[tableIdx];
    case "q":
      return QUEEN_PST[tableIdx];
    case "k":
      return KING_MID_PST[tableIdx];
  }
}

function evaluateBoard(board: (Piece | null)[], perspective: Color): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const val = PIECE_VALUES[p.type] + getPstBonus(p.type, p.color, i);
    score += p.color === "w" ? val : -val;
  }
  return perspective === "w" ? score : -score;
}

function movePriority(m: ChessMove): number {
  let score = 0;
  if (m.captured) {
    score += 10 * PIECE_VALUES[m.captured.type] - PIECE_VALUES[m.piece.type];
  }
  if (m.promotion) {
    score += PIECE_VALUES[m.promotion];
  }
  if (m.isCastle) score += 60;
  return score;
}

function orderMoves(moves: ChessMove[]): ChessMove[] {
  return moves.sort((a, b) => movePriority(b) - movePriority(a));
}

function quiescence(
  state: GameState,
  alpha: number,
  beta: number,
  depthLeft: number
): number {
  const standPat = evaluateBoard(state.board, state.turn);
  if (depthLeft <= 0) return standPat;
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  const captures = orderMoves(
    generateLegalMoves(state).filter((m) => m.captured || m.promotion === "q")
  );

  for (const m of captures) {
    const next = applyMove(state, m, false);
    const score = -quiescence(next, -beta, -alpha, depthLeft - 1);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function alphaBeta(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  useQuiescence: boolean
): number {
  const legal = generateLegalMoves(state);
  if (legal.length === 0) {
    if (isKingInCheck(state.board, state.turn)) {
      return -50000 - depth * 100;
    }
    return 0;
  }
  if (depth <= 0) {
    return useQuiescence
      ? quiescence(state, alpha, beta, 3)
      : evaluateBoard(state.board, state.turn);
  }

  orderMoves(legal);
  for (const m of legal) {
    const next = applyMove(state, m, false);
    const score = -alphaBeta(next, depth - 1, -beta, -alpha, useQuiescence);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

export function pickAdaChessMove(
  state: GameState,
  difficulty: Difficulty
): ChessMove | null {
  const legal = generateLegalMoves(state);
  if (legal.length === 0) return null;

  // Avoid trivial repetition unless forced
  const depth = difficulty === "casual" ? 1 : difficulty === "tactical" ? 2 : 3;
  const useQuiescence = difficulty !== "casual";

  orderMoves(legal);
  const scored: { move: ChessMove; score: number }[] = [];

  let alpha = -Infinity;
  const beta = Infinity;

  for (const m of legal) {
    const next = applyMove(state, m, false);
    let score = -alphaBeta(next, depth - 1, -beta, -alpha, useQuiescence);

    // Slight variety in Casual mode
    if (difficulty === "casual") {
      score += (Math.random() - 0.5) * 65;
    }

    scored.push({ move: m, score });
    if (score > alpha) alpha = score;
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}

export function perft(state: GameState, depth: number): number {
  if (depth === 0) return 1;
  const moves = generateLegalMoves(state);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const m of moves) {
    nodes += perft(applyMove(state, m, false), depth - 1);
  }
  return nodes;
}
