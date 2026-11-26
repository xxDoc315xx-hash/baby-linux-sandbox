import React, { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { playGameSound } from "./gameAudio";

type Cell = 0 | 1 | 2; // 0 empty, 1 Doc (Amber), 2 Ada (Sky/Emerald)
type Difficulty = "casual" | "tactical" | "core";

interface ConnectFourGameProps {
  muted: boolean;
  isFullscreen?: boolean;
}

const ROWS = 6;
const COLS = 7;
const WINS_KEY = "doc_ada_game_c4_wins";

function createBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
}

function getDropRow(board: Cell[][], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1;
}

function findWinningCells(board: Cell[][], player: 1 | 2): [number, number][] | null {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (
        board[r][c] === player &&
        board[r][c + 1] === player &&
        board[r][c + 2] === player &&
        board[r][c + 3] === player
      ) {
        return [
          [r, c],
          [r, c + 1],
          [r, c + 2],
          [r, c + 3],
        ];
      }
    }
  }
  // Vertical
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      if (
        board[r][c] === player &&
        board[r + 1][c] === player &&
        board[r + 2][c] === player &&
        board[r + 3][c] === player
      ) {
        return [
          [r, c],
          [r + 1, c],
          [r + 2, c],
          [r + 3, c],
        ];
      }
    }
  }
  // Diagonal down-right
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (
        board[r][c] === player &&
        board[r + 1][c + 1] === player &&
        board[r + 2][c + 2] === player &&
        board[r + 3][c + 3] === player
      ) {
        return [
          [r, c],
          [r + 1, c + 1],
          [r + 2, c + 2],
          [r + 3, c + 3],
        ];
      }
    }
  }
  // Diagonal up-right
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (
        board[r][c] === player &&
        board[r - 1][c + 1] === player &&
        board[r - 2][c + 2] === player &&
        board[r - 3][c + 3] === player
      ) {
        return [
          [r, c],
          [r - 1, c + 1],
          [r - 2, c + 2],
          [r - 3, c + 3],
        ];
      }
    }
  }
  return null;
}

function isBoardFull(board: Cell[][]): boolean {
  return board[0].every((c) => c !== 0);
}

function evaluateWindow(window: Cell[], aiPlayer: 2): number {
  const opp: Cell = 1;
  let aiCount = 0;
  let oppCount = 0;
  let emptyCount = 0;
  for (const v of window) {
    if (v === aiPlayer) aiCount++;
    else if (v === opp) oppCount++;
    else emptyCount++;
  }
  if (aiCount === 4) return 10000;
  if (oppCount === 4) return -10000;
  if (aiCount === 3 && emptyCount === 1) return 12;
  if (aiCount === 2 && emptyCount === 2) return 3;
  if (oppCount === 3 && emptyCount === 1) return -15;
  return 0;
}

function scoreBoard(board: Cell[][]): number {
  let score = 0;
  const centerCol = Math.floor(COLS / 2);
  let centerCount = 0;
  for (let r = 0; r < ROWS; r++) {
    if (board[r][centerCol] === 2) centerCount++;
  }
  score += centerCount * 4;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += evaluateWindow([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]], 2);
    }
  }
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      score += evaluateWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]], 2);
    }
  }
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += evaluateWindow(
        [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]],
        2
      );
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += evaluateWindow(
        [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]],
        2
      );
    }
  }
  return score;
}

function validColumns(board: Cell[][]): number[] {
  const order = [3, 2, 4, 1, 5, 0, 6];
  return order.filter((c) => board[0][c] === 0);
}

function minimax(
  board: Cell[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): { col: number; score: number } {
  const valid = validColumns(board);
  if (findWinningCells(board, 2)) return { col: -1, score: 100000 + depth };
  if (findWinningCells(board, 1)) return { col: -1, score: -100000 - depth };
  if (valid.length === 0) return { col: -1, score: 0 };
  if (depth === 0) return { col: -1, score: scoreBoard(board) };

  if (maximizing) {
    let bestScore = -Infinity;
    let bestCol = valid[0];
    for (const col of valid) {
      const r = getDropRow(board, col);
      board[r][col] = 2;
      const next = minimax(board, depth - 1, alpha, beta, false).score;
      board[r][col] = 0;
      if (next > bestScore) {
        bestScore = next;
        bestCol = col;
      }
      alpha = Math.max(alpha, bestScore);
      if (alpha >= beta) break;
    }
    return { col: bestCol, score: bestScore };
  } else {
    let bestScore = Infinity;
    let bestCol = valid[0];
    for (const col of valid) {
      const r = getDropRow(board, col);
      board[r][col] = 1;
      const next = minimax(board, depth - 1, alpha, beta, true).score;
      board[r][col] = 0;
      if (next < bestScore) {
        bestScore = next;
        bestCol = col;
      }
      beta = Math.min(beta, bestScore);
      if (alpha >= beta) break;
    }
    return { col: bestCol, score: bestScore };
  }
}

function pickAiColumn(board: Cell[][], difficulty: Difficulty): number {
  const valid = validColumns(board);
  if (valid.length === 0) return -1;
  if (difficulty === "casual" && Math.random() < 0.45) {
    return valid[Math.floor(Math.random() * valid.length)];
  }
  const depth = difficulty === "casual" ? 2 : difficulty === "tactical" ? 4 : 5;
  const copy = board.map((row) => [...row]);
  const chosen = minimax(copy, depth, -Infinity, Infinity, true).col;
  return chosen >= 0 ? chosen : valid[0];
}

export const ConnectFourGame: React.FC<ConnectFourGameProps> = ({ muted, isFullscreen = false }) => {
  const [board, setBoard] = useState<Cell[][]>(() => createBoard());
  const [turn, setTurn] = useState<1 | 2>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>("tactical");
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [winCells, setWinCells] = useState<[number, number][] | null>(null);
  const [winner, setWinner] = useState<0 | 1 | 2 | "draw">(0);
  const [wins, setWins] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(WINS_KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  });

  const aiTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    };
  }, []);

  const resetMatch = useCallback(() => {
    if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    setBoard(createBoard());
    setTurn(1);
    setWinCells(null);
    setWinner(0);
  }, []);

  const applyMove = useCallback(
    (col: number, player: 1 | 2, currentBoard: Cell[][]) => {
      const r = getDropRow(currentBoard, col);
      if (r < 0) return;

      const nextBoard = currentBoard.map((row) => [...row]);
      nextBoard[r][col] = player;
      setBoard(nextBoard);
      playGameSound("drop", muted);

      const won = findWinningCells(nextBoard, player);
      if (won) {
        setWinCells(won);
        setWinner(player);
        if (player === 1) {
          setWins((w) => {
            const next = w + 1;
            try {
              localStorage.setItem(WINS_KEY, String(next));
            } catch (_) {}
            return next;
          });
          playGameSound("win", muted);
        } else {
          playGameSound("lose", muted);
        }
        return;
      }

      if (isBoardFull(nextBoard)) {
        setWinner("draw");
        return;
      }

      setTurn(player === 1 ? 2 : 1);
    },
    [muted]
  );

  // Trigger Ada AI turn
  useEffect(() => {
    if (winner !== 0 || turn !== 2) return;
    aiTimerRef.current = window.setTimeout(() => {
      const col = pickAiColumn(board, difficulty);
      if (col >= 0) applyMove(col, 2, board);
    }, 460);
    return () => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    };
  }, [turn, winner, board, difficulty, applyMove]);

  const handlePlayerDrop = (col: number) => {
    if (winner !== 0 || turn !== 1) return;
    if (getDropRow(board, col) < 0) return;
    applyMove(col, 1, board);
  };

  const isWinCell = (r: number, c: number) =>
    winCells?.some(([wr, wc]) => wr === r && wc === c) ?? false;

  const statusText =
    winner === 1
      ? "You won four in a row!"
      : winner === 2
      ? "Ada connected four!"
      : winner === "draw"
      ? "Draw — board is full."
      : turn === 1
      ? "Your turn (Amber)"
      : "Ada is choosing a column...";

  return (
    <div className="space-y-3">
      {/* HUD & Difficulty Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold text-white">{statusText}</span>
          <span className="text-xs text-stone-400 font-mono tabular-nums">
            Matches Won: <span className="text-amber-400 font-bold">{wins}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-950 border border-stone-800">
            {(
              [
                { id: "casual", label: "Casual" },
                { id: "tactical", label: "Tactical" },
                { id: "core", label: "Ship Core" },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setDifficulty(d.id);
                  resetMatch();
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  difficulty === d.id
                    ? "bg-amber-600 text-white"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={resetMatch}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-stone-700 bg-stone-950 hover:bg-stone-800 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Match</span>
          </button>
        </div>
      </div>

      {/* Board Surface */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-800 bg-stone-900/70 p-3 sm:p-4">
        <div
          className={`w-full select-none ${
            isFullscreen
              ? "max-w-[clamp(280px,calc((100vh-270px)*1.16),540px)]"
              : "max-w-[clamp(260px,calc((100vh-345px)*1.16),480px)]"
          }`}
        >
          {/* Column Drop Buttons */}
          <div className="grid grid-cols-7 gap-2 mb-2 px-2">
            {Array.from({ length: COLS }).map((_, col) => {
              const canDrop = winner === 0 && turn === 1 && getDropRow(board, col) >= 0;
              return (
                <button
                  key={col}
                  type="button"
                  disabled={!canDrop}
                  onMouseEnter={() => setHoverCol(col)}
                  onMouseLeave={() => setHoverCol(null)}
                  onClick={() => handlePlayerDrop(col)}
                  aria-label={`Drop piece in column ${col + 1}`}
                  className="h-7 rounded-lg flex items-center justify-center cursor-pointer disabled:cursor-default transition-transform duration-150"
                >
                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-opacity duration-150 ${
                      canDrop && hoverCol === col
                        ? "bg-amber-400 opacity-100 scale-105"
                        : canDrop
                        ? "bg-amber-500/25 opacity-60 hover:opacity-100"
                        : "opacity-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Board Frame */}
          <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-2.5 sm:p-3 shadow-2xl">
            <div className="grid grid-cols-7 gap-2">
              {board.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const winning = isWinCell(rIdx, cIdx);
                  return (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      type="button"
                      onMouseEnter={() => setHoverCol(cIdx)}
                      onMouseLeave={() => setHoverCol(null)}
                      onClick={() => handlePlayerDrop(cIdx)}
                      aria-label={`Row ${rIdx + 1} Column ${cIdx + 1}`}
                      className={`aspect-square rounded-full flex items-center justify-center cursor-pointer transition-transform duration-150 ${
                        cell === 0
                          ? "bg-stone-950 border border-slate-700/70 hover:border-amber-500/50"
                          : cell === 1
                          ? "bg-amber-400 border-2 border-amber-200 shadow-inner"
                          : "bg-sky-400 border-2 border-sky-200 shadow-inner"
                      } ${winning ? "ring-4 ring-white scale-105" : ""}`}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Legend + Play Again */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span>You (Amber)</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" />
                <span>Ada (Blue)</span>
              </span>
            </div>

            {winner !== 0 && (
              <button
                type="button"
                onClick={resetMatch}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
              >
                Play Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
