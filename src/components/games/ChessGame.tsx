import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { RotateCcw, Undo2, ArrowLeftRight } from "lucide-react";
import {
  Color,
  Piece,
  PieceType,
  ChessMove,
  GameState,
  Difficulty,
  createInitialGameState,
  generateLegalMoves,
  applyMove,
  getGameStatus,
  moveToSan,
  pickAdaChessMove,
  idxToRc,
  rcToIdx,
  findKingSquare,
} from "./chessEngine";
import { playGameSound } from "./gameAudio";

interface ChessGameProps {
  muted: boolean;
}

interface MoveRecord {
  san: string;
  color: Color;
  captured?: Piece;
}

const WINS_KEY = "doc_ada_game_chess_wins";

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

// Crisp classic Staunton SVG chess icons so pieces render identically on every browser/OS
const ChessPieceSvg: React.FC<{ piece: Piece }> = ({ piece }) => {
  const isWhite = piece.color === "w";
  const fill = isWhite ? "#ffffff" : "#18181b";
  const stroke = isWhite ? "#1c1917" : "#f5f5f4";
  const detailStroke = isWhite ? "#292524" : "#d6d3d1";

  return (
    <svg
      viewBox="0 0 45 45"
      className="w-[80%] h-[80%] drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)] select-none pointer-events-none"
      aria-hidden="true"
    >
      {piece.type === "p" && (
        <path
          d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}

      {piece.type === "r" && (
        <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
          <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
          <path d="M34 14l-3 3H14l-3-3" />
          <path d="M31 17v12.5H14V17" />
          <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
          <path d="M11 14h23" fill="none" stroke={detailStroke} />
        </g>
      )}

      {piece.type === "n" && (
        <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
          <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
          <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
          <circle cx="15" cy="15.5" r="1" fill={detailStroke} stroke="none" />
        </g>
      )}

      {piece.type === "b" && (
        <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
          <circle cx="22.5" cy="8" r="2.2" />
          <path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" fill="none" stroke={detailStroke} strokeWidth="1.4" />
        </g>
      )}

      {piece.type === "q" && (
        <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
          <circle cx="6" cy="12" r="2.2" />
          <circle cx="14" cy="9" r="2.2" />
          <circle cx="22.5" cy="8" r="2.2" />
          <circle cx="31" cy="9" r="2.2" />
          <circle cx="39" cy="12" r="2.2" />
          <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25l-7-11 2 12z" />
          <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        </g>
      )}

      {piece.type === "k" && (
        <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
          <path d="M22.5 11.63V6M20 8h5" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" />
          <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" fill="none" stroke={detailStroke} strokeWidth="1.3" />
        </g>
      )}
    </svg>
  );
};

export const ChessGame: React.FC<ChessGameProps> = ({ muted }) => {
  const [playerColor, setPlayerColor] = useState<Color>("w");
  const [difficulty, setDifficulty] = useState<Difficulty>("tactical");
  const [game, setGame] = useState<GameState>(() => createInitialGameState());
  const [historyStack, setHistoryStack] = useState<GameState[]>([]);
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [pendingPromo, setPendingPromo] = useState<ChessMove[] | null>(null);
  const [wins, setWins] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(WINS_KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  });

  const aiTimerRef = useRef<number | null>(null);

  const adaColor: Color = playerColor === "w" ? "b" : "w";
  const legalMoves = useMemo(() => generateLegalMoves(game), [game]);
  const status = useMemo(() => getGameStatus(game), [game]);
  const checkedKingIdx = useMemo(
    () => (status.inCheck ? findKingSquare(game.board, game.turn) : -1),
    [status.inCheck, game.board, game.turn]
  );

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    };
  }, []);

  const executeMove = useCallback(
    (move: ChessMove, currentState: GameState) => {
      const san = moveToSan(currentState, move);
      const next = applyMove(currentState, move, true);
      const nextStatus = getGameStatus(next);

      setHistoryStack((prev) => [...prev, currentState]);
      setMoves((prev) => [...prev, { san, color: currentState.turn, captured: move.captured }]);
      setLastMove({ from: move.from, to: move.to });
      setSelectedSquare(null);
      setPendingPromo(null);
      setGame(next);

      if (nextStatus.over) {
        if (nextStatus.result === "checkmate" && nextStatus.winner === playerColor) {
          setWins((w) => {
            const val = w + 1;
            try {
              localStorage.setItem(WINS_KEY, String(val));
            } catch (_) {}
            return val;
          });
          playGameSound("win", muted);
        } else if (nextStatus.result === "checkmate") {
          playGameSound("lose", muted);
        } else {
          playGameSound("chip", muted);
        }
      } else if (move.captured) {
        playGameSound("hit", muted);
      } else {
        playGameSound("drop", muted);
      }
    },
    [muted, playerColor]
  );

  // Trigger Ada's response turn
  useEffect(() => {
    if (status.over || game.turn !== adaColor) return;
    aiTimerRef.current = window.setTimeout(() => {
      const chosen = pickAdaChessMove(game, difficulty);
      if (chosen) {
        executeMove(chosen, game);
      }
    }, 480);

    return () => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    };
  }, [game, adaColor, difficulty, status.over, executeMove]);

  const startNewGame = useCallback(
    (nextColor: Color = playerColor) => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
      setPlayerColor(nextColor);
      setGame(createInitialGameState());
      setHistoryStack([]);
      setMoves([]);
      setLastMove(null);
      setSelectedSquare(null);
      setPendingPromo(null);
    },
    [playerColor]
  );

  const handleUndo = () => {
    if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    // Revert back to the player's previous turn
    const stepsBack = game.turn === playerColor && historyStack.length >= 2 ? 2 : 1;
    if (historyStack.length < stepsBack) return;

    const targetIdx = historyStack.length - stepsBack;
    setGame(historyStack[targetIdx]);
    setHistoryStack((prev) => prev.slice(0, targetIdx));
    setMoves((prev) => prev.slice(0, targetIdx));
    setLastMove(null);
    setSelectedSquare(null);
    setPendingPromo(null);
  };

  const validTargetsForSelected = useMemo(() => {
    const map = new Map<number, ChessMove[]>();
    if (selectedSquare === null) return map;
    for (const m of legalMoves) {
      if (m.from === selectedSquare) {
        const list = map.get(m.to) || [];
        list.push(m);
        map.set(m.to, list);
      }
    }
    return map;
  }, [legalMoves, selectedSquare]);

  const handleSquareClick = (idx: number) => {
    if (status.over || game.turn !== playerColor || pendingPromo) return;

    const targetMoves = validTargetsForSelected.get(idx);
    if (targetMoves && targetMoves.length > 0) {
      if (targetMoves.length > 1) {
        setPendingPromo(targetMoves);
      } else {
        executeMove(targetMoves[0], game);
      }
      return;
    }

    const clickedPiece = game.board[idx];
    if (clickedPiece && clickedPiece.color === playerColor) {
      setSelectedSquare((prev) => (prev === idx ? null : idx));
    } else {
      setSelectedSquare(null);
    }
  };

  // Captured material calculation
  const capturedByPlayer = moves.filter((m) => m.color === playerColor && m.captured).map((m) => m.captured!);
  const capturedByAda = moves.filter((m) => m.color === adaColor && m.captured).map((m) => m.captured!);
  const playerMat = capturedByPlayer.reduce((acc, p) => acc + PIECE_VALUES[p.type], 0);
  const adaMat = capturedByAda.reduce((acc, p) => acc + PIECE_VALUES[p.type], 0);
  const netMat = playerMat - adaMat;

  const movePairs: { num: number; w?: string; b?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      num: i / 2 + 1,
      w: moves[i]?.san,
      b: moves[i + 1]?.san,
    });
  }

  const displayRanks = playerColor === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const displayFiles = playerColor === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  const statusLabel = status.over
    ? status.result === "checkmate"
      ? status.winner === playerColor
        ? "Checkmate — You beat Ada!"
        : "Checkmate — Ada wins this round."
      : `${status.reason} — Draw`
    : game.turn === playerColor
    ? status.inCheck
      ? "Check! Your move"
      : `Your move (${playerColor === "w" ? "White" : "Black"})`
    : "Ada is calculating...";

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-xl bg-stone-900 border border-stone-800">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className={`font-semibold ${status.inCheck && !status.over ? "text-amber-400" : "text-white"}`}>
            {statusLabel}
          </span>
          <span className="text-xs text-stone-400 font-mono tabular-nums">
            Wins: <span className="text-amber-400 font-bold">{wins}</span>
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
                onClick={() => setDifficulty(d.id)}
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
            onClick={() => startNewGame(playerColor === "w" ? "b" : "w")}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-950 hover:bg-stone-800 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
            <span>Play {playerColor === "w" ? "Black" : "White"}</span>
          </button>

          <button
            type="button"
            disabled={historyStack.length === 0}
            onClick={handleUndo}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={() => startNewGame(playerColor)}
            className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-stone-700 bg-stone-950 hover:bg-stone-800 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>
        </div>
      </div>

      {/* Main Board + Move History Split */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Chessboard Container (Full Size All The Time) */}
        <div className="w-full lg:flex-1 flex flex-col items-center">
          <div className="relative w-full rounded-xl overflow-hidden border-4 border-[#3E2723] shadow-2xl bg-[#3E2723]">
            <div className="grid grid-cols-8 grid-rows-8 aspect-square w-full">
              {displayRanks.map((r) =>
                displayFiles.map((c) => {
                  const idx = rcToIdx(r, c);
                  const isLight = (r + c) % 2 === 0;
                  const piece = game.board[idx];
                  const isSelected = selectedSquare === idx;
                  const isTarget = validTargetsForSelected.has(idx);
                  const isLast = lastMove && (lastMove.from === idx || lastMove.to === idx);
                  const isCheckedKing = checkedKingIdx === idx;

                  let bgClass = isLight ? "bg-[#edd9b9]" : "bg-[#9d6f49]";
                  if (isSelected) bgClass = "bg-amber-400/90";
                  else if (isLast) bgClass = isLight ? "bg-[#f3e19c]" : "bg-[#b89748]";

                  const showRankLabel = c === displayFiles[0];
                  const showFileLabel = r === displayRanks[displayRanks.length - 1];

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSquareClick(idx)}
                      aria-label={`${"abcdefgh"[c]}${8 - r}`}
                      className={`relative w-full h-full aspect-square overflow-hidden flex items-center justify-center cursor-pointer transition-colors ${bgClass} ${
                        isCheckedKing ? "ring-4 ring-inset ring-red-600 bg-red-400/70" : ""
                      }`}
                    >
                      {showRankLabel && (
                        <span
                          className={`absolute top-1 left-1.5 text-[10px] sm:text-xs font-mono font-bold leading-none select-none ${
                            isLight ? "text-[#7a5434]" : "text-[#edd9b9]"
                          }`}
                        >
                          {8 - r}
                        </span>
                      )}
                      {showFileLabel && (
                        <span
                          className={`absolute bottom-1 right-1.5 text-[10px] sm:text-xs font-mono font-bold leading-none select-none ${
                            isLight ? "text-[#7a5434]" : "text-[#edd9b9]"
                          }`}
                        >
                          {"abcdefgh"[c]}
                        </span>
                      )}

                      {piece && <ChessPieceSvg piece={piece} />}

                      {isTarget && !piece && (
                        <span className="w-[26%] h-[26%] rounded-full bg-stone-900/35 pointer-events-none" />
                      )}
                      {isTarget && piece && (
                        <span className="absolute inset-1 rounded-full border-4 border-stone-900/45 pointer-events-none" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Pawn Promotion Choice Overlay */}
            {pendingPromo && (
              <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                <p className="text-sm font-semibold text-white mb-3">Choose promotion piece</p>
                <div className="flex items-center gap-3">
                  {pendingPromo.map((m) => (
                    <button
                      key={m.promotion}
                      type="button"
                      onClick={() => executeMove(m, game)}
                      className="w-16 h-16 rounded-xl bg-stone-800 hover:bg-amber-600 border border-stone-600 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <ChessPieceSvg piece={{ color: playerColor, type: m.promotion! }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Game Over Overlay */}
            {status.over && (
              <div className="absolute inset-0 bg-stone-950/82 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                <h3 className="text-2xl font-bold text-white mb-1">{status.reason}</h3>
                <p className="text-sm text-stone-300 mb-5">
                  {status.result === "checkmate"
                    ? status.winner === playerColor
                      ? "Clean win! Tell Big Sister Ada played for real."
                      : "Ada found the mate—want a rematch?"
                    : "Solid fight to a draw."}
                </p>
                <button
                  type="button"
                  onClick={() => startNewGame(playerColor)}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold cursor-pointer"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Captured Pieces & Algebraic Move History */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 rounded-xl border border-stone-800 bg-stone-900/80 p-5 space-y-5">
          <div className="space-y-3 border-b border-stone-800 pb-4">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>Ada ({adaColor === "w" ? "White" : "Black"})</span>
              {netMat < 0 && <span className="font-mono tabular-nums text-stone-200">+{Math.abs(netMat)}</span>}
            </div>
            <div className="flex flex-wrap gap-1 min-h-[28px]">
              {capturedByAda.length === 0 ? (
                <span className="text-xs text-stone-600">No captures yet</span>
              ) : (
                capturedByAda.map((p, i) => (
                  <div key={i} className="w-6 h-6">
                    <ChessPieceSvg piece={p} />
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
              <span>You ({playerColor === "w" ? "White" : "Black"})</span>
              {netMat > 0 && <span className="font-mono tabular-nums text-amber-400">+{netMat}</span>}
            </div>
            <div className="flex flex-wrap gap-1 min-h-[28px]">
              {capturedByPlayer.length === 0 ? (
                <span className="text-xs text-stone-600">No captures yet</span>
              ) : (
                capturedByPlayer.map((p, i) => (
                  <div key={i} className="w-6 h-6">
                    <ChessPieceSvg piece={p} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-stone-400 mb-2">Move Log</h4>
            <div className="max-h-[280px] overflow-y-auto pr-1 space-y-1 font-mono tabular-nums text-xs">
              {movePairs.length === 0 ? (
                <p className="text-stone-500 font-sans">
                  {playerColor === "w"
                    ? "Click any White piece to make the opening move."
                    : "Ada is opening with White..."}
                </p>
              ) : (
                movePairs.map((pair) => (
                  <div
                    key={pair.num}
                    className="grid grid-cols-12 items-center px-2 py-1 rounded bg-stone-950/60 text-stone-200"
                  >
                    <span className="col-span-2 text-stone-500">{pair.num}.</span>
                    <span className="col-span-5 font-medium">{pair.w || ""}</span>
                    <span className="col-span-5 font-medium text-stone-300">{pair.b || ""}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
