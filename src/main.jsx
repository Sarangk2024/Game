import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Clock, Medal, MousePointerClick, RefreshCcw, Sparkles } from 'lucide-react';
import './styles.css';

const SYMBOLS = ['Sun', 'Moon', 'Star', 'Cloud', 'Flame', 'Leaf', 'Gem', 'Zap', 'Heart', 'Crown', 'Anchor', 'Rocket'];

const SYMBOL_ART = {
  Sun: 'sun',
  Moon: 'moon',
  Star: 'star',
  Cloud: 'cloud',
  Flame: 'flame',
  Leaf: 'leaf',
  Gem: 'gem',
  Zap: 'zap',
  Heart: 'heart',
  Crown: 'crown',
  Anchor: 'anchor',
  Rocket: 'rocket'
};

const DIFFICULTIES = {
  Easy: { pairs: 6, columns: 4 },
  Medium: { pairs: 8, columns: 4 },
  Hard: { pairs: 12, columns: 6 }
};

const STORAGE_KEY = 'memory-match-best-scores';
const FLIP_BACK_DELAY = 850;

function shuffle(items) {
  const copied = [...items];

  for (let i = copied.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[randomIndex]] = [copied[randomIndex], copied[i]];
  }

  return copied;
}

function buildDeck(difficulty) {
  const selectedSymbols = SYMBOLS.slice(0, DIFFICULTIES[difficulty].pairs);
  const pairs = selectedSymbols.flatMap((symbol) => [
    { id: `${symbol}-a-${crypto.randomUUID()}`, symbol },
    { id: `${symbol}-b-${crypto.randomUUID()}`, symbol }
  ]);

  return shuffle(pairs);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function readBestScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function isBetterScore(nextScore, currentScore) {
  if (!currentScore) {
    return true;
  }

  if (nextScore.moves !== currentScore.moves) {
    return nextScore.moves < currentScore.moves;
  }

  return nextScore.time < currentScore.time;
}

function CardSymbol({ symbol }) {
  const art = SYMBOL_ART[symbol];

  return (
    <svg className={`symbol-art ${art}`} viewBox="0 0 64 64" aria-hidden="true">
      {art === 'sun' && (
        <>
          <circle cx="32" cy="32" r="12" />
          <path d="M32 6v10M32 48v10M6 32h10M48 32h10M13.6 13.6l7 7M43.4 43.4l7 7M50.4 13.6l-7 7M20.6 43.4l-7 7" />
        </>
      )}
      {art === 'moon' && <path d="M45 48c-15 4-29-7-29-22 0-9 5-17 13-20-3 15 7 27 22 26-1 7-3 12-6 16Z" />}
      {art === 'star' && <path d="m32 7 7.2 15 16.5 2.3-12 11.5 2.9 16.2L32 44.3 17.4 52l2.8-16.2-11.9-11.5 16.5-2.3L32 7Z" />}
      {art === 'cloud' && <path d="M21 48h26c7 0 12-5 12-11 0-6-5-11-12-11h-1C43 18 36 13 27 15c-8 2-13 9-13 17-6 1-10 4-10 9 0 4 4 7 17 7Z" />}
      {art === 'flame' && <path d="M33 58c-12 0-21-8-21-20 0-9 6-16 13-22 3-3 6-6 6-10 10 7 18 15 18 27 2-2 3-5 3-8 5 5 8 11 8 18 0 9-8 15-27 15Z" />}
      {art === 'leaf' && <path d="M55 9C32 10 13 21 12 43c0 8 6 13 14 13 22 0 28-27 29-47ZM13 55c9-16 21-25 38-39" />}
      {art === 'gem' && <path d="m18 8-10 15 24 33 24-33L46 8H18Zm-10 15h48M18 8l14 15L46 8M20 23l12 33 12-33" />}
      {art === 'zap' && <path d="M36 4 10 36h20l-3 24 27-35H34l2-21Z" />}
      {art === 'heart' && <path d="M32 55S9 42 9 24c0-8 6-15 14-15 5 0 8 2 9 5 1-3 5-5 9-5 8 0 14 7 14 15 0 18-23 31-23 31Z" />}
      {art === 'crown' && <path d="m8 18 13 13 11-20 11 20 13-13-5 31H13L8 18Zm7 37h34" />}
      {art === 'anchor' && <path d="M32 10v37M23 18a9 9 0 1 1 18 0 9 9 0 0 1-18 0ZM15 32H8c0 13 11 23 24 23s24-10 24-23h-7M24 47l-8-8M40 47l8-8" />}
      {art === 'rocket' && <path d="M38 42 22 26C27 13 39 6 54 7c1 15-6 27-19 32ZM20 29l-9 5 9 4M35 44l-4 9-5-9M43 20h.1M20 44l-8 8" />}
    </svg>
  );
}

function App() {
  const [difficulty, setDifficulty] = useState('Medium');
  const [cards, setCards] = useState(() => buildDeck('Medium'));
  const [flippedIds, setFlippedIds] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [bestScores, setBestScores] = useState(readBestScores);
  const [isChecking, setIsChecking] = useState(false);
  const timeoutRef = useRef(null);

  const matchedCount = matchedIds.length / 2;
  const totalPairs = DIFFICULTIES[difficulty].pairs;
  const hasWon = matchedCount === totalPairs;
  const currentBest = bestScores[difficulty];

  const gridStyle = useMemo(
    () => ({
      '--columns': DIFFICULTIES[difficulty].columns
    }),
    [difficulty]
  );

  useEffect(() => {
    if (!isRunning || hasWon) {
      return undefined;
    }

    const interval = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [hasWon, isRunning]);

  useEffect(() => {
    if (!hasWon || moves === 0) {
      return;
    }

    setIsRunning(false);
    const nextScore = { moves, time: seconds };

    if (isBetterScore(nextScore, bestScores[difficulty])) {
      const updatedScores = { ...bestScores, [difficulty]: nextScore };
      setBestScores(updatedScores);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScores));
    }
  }, [bestScores, difficulty, hasWon, moves, seconds]);

  function restart(nextDifficulty = difficulty) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setDifficulty(nextDifficulty);
    setCards(buildDeck(nextDifficulty));
    setFlippedIds([]);
    setMatchedIds([]);
    setMoves(0);
    setSeconds(0);
    setIsRunning(false);
    setIsChecking(false);
  }

  function handleCardClick(card) {
    const isVisible = flippedIds.includes(card.id) || matchedIds.includes(card.id);

    if (isChecking || isVisible || hasWon) {
      return;
    }

    if (!isRunning) {
      setIsRunning(true);
    }

    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length !== 2) {
      return;
    }

    setMoves((current) => current + 1);
    setIsChecking(true);

    const [firstId, secondId] = nextFlipped;
    const firstCard = cards.find((item) => item.id === firstId);
    const secondCard = cards.find((item) => item.id === secondId);

    timeoutRef.current = setTimeout(() => {
      if (firstCard.symbol === secondCard.symbol) {
        setMatchedIds((current) => [...current, firstId, secondId]);
      }

      setFlippedIds([]);
      setIsChecking(false);
    }, firstCard.symbol === secondCard.symbol ? 420 : FLIP_BACK_DELAY);
  }

  return (
    <main className="app-shell">
      <section className="game-panel" aria-labelledby="game-title">
        <div className="topbar">
          <div>
            <p className="eyebrow">React memory game</p>
            <h1 id="game-title">Memory Match</h1>
          </div>

          <button className="restart-button" type="button" onClick={() => restart()} aria-label="Restart game">
            <RefreshCcw size={18} />
            Restart Game
          </button>
        </div>

        <div className="difficulty-tabs" aria-label="Difficulty levels">
          {Object.keys(DIFFICULTIES).map((level) => (
            <button
              className={level === difficulty ? 'active' : ''}
              key={level}
              type="button"
              onClick={() => restart(level)}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="stats-grid">
          <div className="stat">
            <MousePointerClick size={18} />
            <span>Moves</span>
            <strong>{moves}</strong>
          </div>
          <div className="stat">
            <Clock size={18} />
            <span>Timer</span>
            <strong>{formatTime(seconds)}</strong>
          </div>
          <div className="stat">
            <Medal size={18} />
            <span>Best</span>
            <strong>{currentBest ? `${currentBest.moves} / ${formatTime(currentBest.time)}` : 'New'}</strong>
          </div>
        </div>

        <div className="progress-row" aria-label={`${matchedCount} of ${totalPairs} pairs matched`}>
          <span>{matchedCount} / {totalPairs} pairs</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(matchedCount / totalPairs) * 100}%` }} />
          </div>
        </div>

        <div className="board" style={gridStyle}>
          {cards.map((card) => {
            const isFlipped = flippedIds.includes(card.id);
            const isMatched = matchedIds.includes(card.id);

            return (
              <button
                className={`card ${isFlipped || isMatched ? 'flipped' : ''} ${isMatched ? 'matched' : ''}`}
                key={card.id}
                type="button"
                onClick={() => handleCardClick(card)}
                aria-label={isFlipped || isMatched ? `${card.symbol} card` : 'Hidden card'}
              >
                <span className="card-inner">
                  <span className="card-face card-back">
                    <Sparkles size={26} />
                  </span>
                  <span className="card-face card-front">
                    <CardSymbol symbol={card.symbol} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {hasWon && (
        <div className="win-overlay" role="dialog" aria-modal="true" aria-labelledby="win-title">
          <div className="win-card">
            <div className="win-icon">
              <Sparkles size={34} />
            </div>
            <p className="eyebrow">All pairs matched</p>
            <h2 id="win-title">Congratulations! You Won</h2>
            <p>You finished {difficulty} in {formatTime(seconds)} with {moves} moves.</p>
            <button className="restart-button primary" type="button" onClick={() => restart()}>
              <RefreshCcw size={18} />
              Restart Game
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
