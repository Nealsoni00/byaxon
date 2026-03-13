'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

const OPTIMUS_IMG = 'https://igaqhhu6xiolnmsh.public.blob.vercel-storage.com/images/1773363194597-optimuschime.png';
const PRIME_IMG = 'https://igaqhhu6xiolnmsh.public.blob.vercel-storage.com/images/1773407964880-prime-chime.png';

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 600;
const GROUND_Y = 480;
const PLAYER_SIZE = 100;
const GRAVITY = 0.8;
const JUMP_FORCE = -18;
const MOVE_SPEED = 8;
const ROUND_TIME = 60;

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  facing: 'left' | 'right';
  isJumping: boolean;
  isAttacking: boolean;
  attackType: 'none' | 'punch' | 'kick' | 'special';
  attackCooldown: number;
  specialCooldown: number;
  specialCharge: number;
  stunned: number;
  combo: number;
}

type GameState = 'menu' | 'fighting' | 'roundEnd' | 'gameOver';
type GameMode = '1p' | '2p';

const ATTACKS = {
  punch: { damage: 8, range: 80, cooldown: 15, knockback: 5 },
  kick: { damage: 12, range: 100, cooldown: 25, knockback: 10 },
  special: { damage: 25, range: 150, cooldown: 0, knockback: 20 },
};

export default function ChimeFighters() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('1p');
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [optimusScore, setOptimusScore] = useState(0);
  const [primeScore, setPrimeScore] = useState(0);
  const [round, setRound] = useState(1);
  const [winner, setWinner] = useState<'optimus' | 'prime' | 'draw' | null>(null);
  const [hitEffects, setHitEffects] = useState<{ x: number; y: number; text: string; id: number }[]>([]);

  const keysPressed = useRef<Set<string>>(new Set());
  const effectId = useRef(0);
  const aiDecisionTimer = useRef(0);

  const createPlayer = (x: number, facing: 'left' | 'right'): Player => ({
    x, y: GROUND_Y, vx: 0, vy: 0, health: 100,
    facing, isJumping: false, isAttacking: false,
    attackType: 'none', attackCooldown: 0, specialCooldown: 0,
    specialCharge: 0, stunned: 0, combo: 0
  });

  // Use refs for game state to avoid React batching issues
  const p1Ref = useRef<Player>(createPlayer(200, 'right'));
  const p2Ref = useRef<Player>(createPlayer(900, 'left'));

  // React state for rendering only
  const [p1, setP1] = useState<Player>(createPlayer(200, 'right'));
  const [p2, setP2] = useState<Player>(createPlayer(900, 'left'));

  const resetPlayers = useCallback(() => {
    p1Ref.current = createPlayer(200, 'right');
    p2Ref.current = createPlayer(900, 'left');
    setP1(createPlayer(200, 'right'));
    setP2(createPlayer(900, 'left'));
  }, []);

  const startGame = useCallback(() => {
    resetPlayers();
    setTimeLeft(ROUND_TIME);
    setWinner(null);
    setGameState('fighting');
  }, [resetPlayers]);

  const addHitEffect = useCallback((x: number, y: number, text: string) => {
    const id = effectId.current++;
    setHitEffects(prev => [...prev, { x, y, text, id }]);
    setTimeout(() => {
      setHitEffects(prev => prev.filter(e => e.id !== id));
    }, 500);
  }, []);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());

      if (gameState === 'menu' && (e.key === ' ' || e.key.toLowerCase() === 'f')) {
        startGame();
      }
      if ((gameState === 'roundEnd' || gameState === 'gameOver') && e.key === ' ') {
        if (gameState === 'gameOver') {
          setOptimusScore(0);
          setPrimeScore(0);
          setRound(1);
        } else {
          setRound(r => r + 1);
        }
        startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, startGame]);

  // Timer
  useEffect(() => {
    if (gameState !== 'fighting') return;

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Time's up - determine winner by health
          if (p1.health > p2.health) {
            setWinner('optimus');
            setOptimusScore(s => s + 1);
          } else if (p2.health > p1.health) {
            setWinner('prime');
            setPrimeScore(s => s + 1);
          } else {
            setWinner('draw');
          }
          setGameState('roundEnd');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, p1.health, p2.health]);

  // Game loop - uses refs for all game logic to avoid React state batching issues
  useEffect(() => {
    if (gameState !== 'fighting') return;

    const gameLoop = setInterval(() => {
      const keys = keysPressed.current;
      const p1 = p1Ref.current;
      const p2 = p2Ref.current;

      // === UPDATE P1 ===
      if (p1.attackCooldown > 0) p1.attackCooldown--;
      if (p1.specialCooldown > 0) p1.specialCooldown--;
      if (p1.stunned > 0) {
        p1.stunned--;
        p1.vx *= 0.9;
      }
      if (p1.specialCharge < 100) p1.specialCharge += 0.2;

      if (p1.stunned <= 0) {
        if (keys.has('a')) { p1.vx = -MOVE_SPEED; p1.facing = 'left'; }
        else if (keys.has('d')) { p1.vx = MOVE_SPEED; p1.facing = 'right'; }
        else { p1.vx *= 0.8; }

        if (keys.has('w') && !p1.isJumping) { p1.vy = JUMP_FORCE; p1.isJumping = true; }

        if (p1.attackCooldown <= 0) {
          if (keys.has('g')) { p1.isAttacking = true; p1.attackType = 'punch'; p1.attackCooldown = ATTACKS.punch.cooldown; }
          else if (keys.has('h')) { p1.isAttacking = true; p1.attackType = 'kick'; p1.attackCooldown = ATTACKS.kick.cooldown; }
          else if (keys.has('j') && p1.specialCharge >= 100) { p1.isAttacking = true; p1.attackType = 'special'; p1.specialCharge = 0; }
        }
      }

      p1.vy += GRAVITY; p1.x += p1.vx; p1.y += p1.vy;
      if (p1.y >= GROUND_Y) { p1.y = GROUND_Y; p1.vy = 0; p1.isJumping = false; }
      p1.x = Math.max(50, Math.min(GAME_WIDTH - 50, p1.x));
      if (p1.attackCooldown <= ATTACKS[p1.attackType === 'none' ? 'punch' : p1.attackType].cooldown - 5) {
        p1.isAttacking = false; p1.attackType = 'none';
      }

      // === UPDATE P2 ===
      if (p2.attackCooldown > 0) p2.attackCooldown--;
      if (p2.specialCooldown > 0) p2.specialCooldown--;
      if (p2.stunned > 0) {
        p2.stunned--;
        p2.vx *= 0.9;
      }
      if (p2.specialCharge < 100) p2.specialCharge += 0.2;

      if (p2.stunned <= 0) {
        if (gameMode === '2p') {
          if (keys.has('arrowleft')) { p2.vx = -MOVE_SPEED; p2.facing = 'left'; }
          else if (keys.has('arrowright')) { p2.vx = MOVE_SPEED; p2.facing = 'right'; }
          else { p2.vx *= 0.8; }

          if (keys.has('arrowup') && !p2.isJumping) { p2.vy = JUMP_FORCE; p2.isJumping = true; }

          if (p2.attackCooldown <= 0) {
            if (keys.has(',') || keys.has('1')) { p2.isAttacking = true; p2.attackType = 'punch'; p2.attackCooldown = ATTACKS.punch.cooldown; }
            else if (keys.has('.') || keys.has('2')) { p2.isAttacking = true; p2.attackType = 'kick'; p2.attackCooldown = ATTACKS.kick.cooldown; }
            else if ((keys.has('/') || keys.has('3')) && p2.specialCharge >= 100) { p2.isAttacking = true; p2.attackType = 'special'; p2.specialCharge = 0; }
          }
        } else {
          // SMARTER AI
          aiDecisionTimer.current++;
          const distance = Math.abs(p1.x - p2.x);
          const playerIsLeft = p1.x < p2.x;

          // Always face player
          p2.facing = playerIsLeft ? 'left' : 'right';

          // AI makes decisions more frequently for better responsiveness
          if (aiDecisionTimer.current % 5 === 0) {
            // Aggressive movement - always try to get in attack range
            if (distance > 100) {
              p2.vx = playerIsLeft ? -MOVE_SPEED * 0.9 : MOVE_SPEED * 0.9;
            } else if (distance < 60) {
              // Too close, back up slightly or attack
              if (p2.attackCooldown <= 0) {
                // Attack immediately when close!
                const rand = Math.random();
                if (p2.specialCharge >= 100) {
                  p2.isAttacking = true; p2.attackType = 'special'; p2.specialCharge = 0;
                } else if (rand > 0.4) {
                  p2.isAttacking = true; p2.attackType = 'kick'; p2.attackCooldown = ATTACKS.kick.cooldown;
                } else {
                  p2.isAttacking = true; p2.attackType = 'punch'; p2.attackCooldown = ATTACKS.punch.cooldown;
                }
              } else {
                // Back away while on cooldown
                p2.vx = playerIsLeft ? MOVE_SPEED * 0.5 : -MOVE_SPEED * 0.5;
              }
            } else {
              // In attack range - attack!
              if (p2.attackCooldown <= 0) {
                const rand = Math.random();
                if (p2.specialCharge >= 100 && rand > 0.5) {
                  p2.isAttacking = true; p2.attackType = 'special'; p2.specialCharge = 0;
                } else if (rand > 0.3) {
                  p2.isAttacking = true; p2.attackType = 'kick'; p2.attackCooldown = ATTACKS.kick.cooldown;
                } else {
                  p2.isAttacking = true; p2.attackType = 'punch'; p2.attackCooldown = ATTACKS.punch.cooldown;
                }
              }
              p2.vx *= 0.8;
            }

            // Jump to dodge or close distance
            if (!p2.isJumping && Math.random() > 0.92) {
              p2.vy = JUMP_FORCE; p2.isJumping = true;
            }
          }
        }
      } else {
        p2.vx *= 0.8;
      }

      p2.vy += GRAVITY; p2.x += p2.vx; p2.y += p2.vy;
      if (p2.y >= GROUND_Y) { p2.y = GROUND_Y; p2.vy = 0; p2.isJumping = false; }
      p2.x = Math.max(50, Math.min(GAME_WIDTH - 50, p2.x));
      if (p2.attackCooldown <= ATTACKS[p2.attackType === 'none' ? 'punch' : p2.attackType].cooldown - 5) {
        p2.isAttacking = false; p2.attackType = 'none';
      }

      // === HIT DETECTION (now sees current state!) ===
      const distance = Math.abs(p1.x - p2.x);

      // P1 attacking P2
      if (p1.isAttacking && p1.attackType !== 'none') {
        const attack = ATTACKS[p1.attackType];
        const attackType = p1.attackType;
        const inRange = distance < attack.range;
        const facingCorrect = (p1.facing === 'right' && p2.x > p1.x) || (p1.facing === 'left' && p2.x < p1.x);

        if (inRange && facingCorrect && p2.stunned <= 0) {
          const damage = attack.damage + Math.floor(Math.random() * 5);
          p2.health = Math.max(0, p2.health - damage);
          p2.vx = (p1.facing === 'right' ? 1 : -1) * attack.knockback;
          p2.vy = -8;
          p2.stunned = 20;
          p1.combo++;
          p1.specialCharge = Math.min(100, p1.specialCharge + 10);
          p1.isAttacking = false; p1.attackType = 'none'; // Prevent multi-hit

          const texts = ['POW!', 'BAM!', 'WHAM!', 'CRASH!', 'BOOM!'];
          addHitEffect((p1.x + p2.x) / 2, p2.y - 50,
            attackType === 'special' ? `💥 SUPER! -${damage}` : `${texts[Math.floor(Math.random() * texts.length)]} -${damage}`);
        }
      }

      // P2 attacking P1
      if (p2.isAttacking && p2.attackType !== 'none') {
        const attack = ATTACKS[p2.attackType];
        const attackType = p2.attackType;
        const inRange = distance < attack.range;
        const facingCorrect = (p2.facing === 'right' && p1.x > p2.x) || (p2.facing === 'left' && p1.x < p2.x);

        if (inRange && facingCorrect && p1.stunned <= 0) {
          const damage = attack.damage + Math.floor(Math.random() * 5);
          p1.health = Math.max(0, p1.health - damage);
          p1.vx = (p2.facing === 'right' ? 1 : -1) * attack.knockback;
          p1.vy = -8;
          p1.stunned = 20;
          p2.combo++;
          p2.specialCharge = Math.min(100, p2.specialCharge + 10);
          p2.isAttacking = false; p2.attackType = 'none'; // Prevent multi-hit

          const texts = ['POW!', 'BAM!', 'WHAM!', 'CRASH!', 'BOOM!'];
          addHitEffect((p1.x + p2.x) / 2, p1.y - 50,
            attackType === 'special' ? `💥 SUPER! -${damage}` : `${texts[Math.floor(Math.random() * texts.length)]} -${damage}`);
        }
      }

      // Check for KO
      if (p1.health <= 0) {
        setWinner('prime');
        setPrimeScore(s => s + 1);
        setGameState('roundEnd');
      } else if (p2.health <= 0) {
        setWinner('optimus');
        setOptimusScore(s => s + 1);
        setGameState('roundEnd');
      }

      // Sync refs to React state for rendering
      setP1({ ...p1 });
      setP2({ ...p2 });

    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameState, gameMode, addHitEffect]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <style jsx global>{`
        @keyframes hitPop {
          0% { transform: scale(0) rotate(-10deg); opacity: 1; }
          50% { transform: scale(1.5) rotate(5deg); opacity: 1; }
          100% { transform: scale(0.5) translateY(-30px); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes glow {
          0%, 100% { filter: drop-shadow(0 0 10px gold); }
          50% { filter: drop-shadow(0 0 30px gold); }
        }
      `}</style>

      {/* Header */}
      <div className="w-full max-w-5xl mb-4">
        <h1 className="text-4xl font-black text-center text-white mb-2"
            style={{ textShadow: '0 0 20px #ff6b6b' }}>
          CHIME FIGHTERS
        </h1>

        {/* Score and Timer */}
        <div className="flex justify-between items-center px-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">{optimusScore}</div>
            <div className="text-sm text-zinc-400">OPTIMUS</div>
          </div>

          <div className="text-center">
            <div className="text-sm text-zinc-400">ROUND {round}</div>
            <div className={`text-4xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">{primeScore}</div>
            <div className="text-sm text-zinc-400">PRIME</div>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div
        ref={canvasRef}
        className="relative bg-gradient-to-b from-indigo-900 via-purple-900 to-zinc-900 rounded-lg overflow-hidden border-4 border-zinc-700"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT, maxWidth: '100%' }}
      >
        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-800 to-zinc-700" />
        <div className="absolute bottom-20 left-0 right-0 h-1 bg-zinc-600" />

        {/* Health Bars */}
        <div className="absolute top-4 left-4 right-4 flex justify-between gap-8">
          {/* P1 Health */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-red-400 font-bold text-xs">
                {gameMode === '1p' ? 'YOU (OPTIMUS)' : 'P1 OPTIMUS'}
              </span>
            </div>
            <div className="h-4 bg-zinc-800 rounded overflow-hidden">
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: `${p1.health}%`,
                  background: p1.health > 50 ? '#22c55e' : p1.health > 25 ? '#eab308' : '#dc2626'
                }}
              />
            </div>
            {/* Special meter */}
            <div className="h-2 bg-zinc-800 rounded mt-1 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${p1.specialCharge}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">SPECIAL {p1.specialCharge >= 100 ? '✓ READY!' : ''}</div>
          </div>

          {/* P2 Health */}
          <div className="flex-1">
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className="text-yellow-400 font-bold text-xs">
                {gameMode === '1p' ? '🤖 AI (PRIME)' : 'P2 PRIME'}
              </span>
            </div>
            <div className="h-4 bg-zinc-800 rounded overflow-hidden">
              <div
                className="h-full transition-all duration-100 ml-auto"
                style={{
                  width: `${p2.health}%`,
                  background: p2.health > 50 ? '#22c55e' : p2.health > 25 ? '#eab308' : '#dc2626'
                }}
              />
            </div>
            {/* Special meter */}
            <div className="h-2 bg-zinc-800 rounded mt-1 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-100 ml-auto"
                style={{ width: `${p2.specialCharge}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500 mt-0.5 text-right">{p2.specialCharge >= 100 ? 'READY! ✓' : ''} SPECIAL</div>
          </div>
        </div>

        {/* Player 1 - Optimus */}
        <div
          className="absolute transition-transform"
          style={{
            left: p1.x - PLAYER_SIZE / 2,
            top: p1.y - PLAYER_SIZE,
            transform: `scaleX(${p1.facing === 'left' ? -1 : 1}) ${p1.stunned > 0 ? 'rotate(10deg)' : ''}`,
            animation: p1.isAttacking ? 'pulse 0.1s ease-out' : 'none',
            filter: p1.stunned > 0 ? 'brightness(2)' : p1.specialCharge >= 100 ? 'drop-shadow(0 0 10px blue)' : 'none'
          }}
        >
          <img
            src={OPTIMUS_IMG}
            alt="Optimus"
            style={{ width: PLAYER_SIZE, height: PLAYER_SIZE, objectFit: 'contain' }}
          />
          {p1.isAttacking && (
            <div
              className="absolute top-1/2 text-4xl"
              style={{
                left: p1.facing === 'right' ? PLAYER_SIZE : -40,
                animation: 'pulse 0.1s'
              }}
            >
              {p1.attackType === 'punch' ? '👊' : p1.attackType === 'kick' ? '🦵' : '💥'}
            </div>
          )}
        </div>

        {/* Player 2 - Prime */}
        <div
          className="absolute transition-transform"
          style={{
            left: p2.x - PLAYER_SIZE / 2,
            top: p2.y - PLAYER_SIZE,
            transform: `scaleX(${p2.facing === 'left' ? -1 : 1}) ${p2.stunned > 0 ? 'rotate(-10deg)' : ''}`,
            animation: p2.isAttacking ? 'pulse 0.1s ease-out' : 'none',
            filter: p2.stunned > 0 ? 'brightness(2)' : p2.specialCharge >= 100 ? 'drop-shadow(0 0 10px blue)' : 'none'
          }}
        >
          <img
            src={PRIME_IMG}
            alt="Prime"
            style={{ width: PLAYER_SIZE, height: PLAYER_SIZE, objectFit: 'contain' }}
          />
          {p2.isAttacking && (
            <div
              className="absolute top-1/2 text-4xl"
              style={{
                left: p2.facing === 'right' ? PLAYER_SIZE : -40,
                animation: 'pulse 0.1s'
              }}
            >
              {p2.attackType === 'punch' ? '👊' : p2.attackType === 'kick' ? '🦵' : '💥'}
            </div>
          )}
        </div>

        {/* Hit Effects */}
        {hitEffects.map(effect => (
          <div
            key={effect.id}
            className="absolute text-2xl font-black text-yellow-300 pointer-events-none"
            style={{
              left: effect.x,
              top: effect.y,
              textShadow: '0 0 10px red',
              animation: 'hitPop 0.5s ease-out forwards'
            }}
          >
            {effect.text}
          </div>
        ))}

        {/* Menu Overlay */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <h2 className="text-5xl font-black text-white mb-4" style={{ textShadow: '0 0 30px #ff6b6b' }}>
              CHIME FIGHTERS
            </h2>
            <p className="text-zinc-400 mb-4">Our Fearless Leader & CEO Battle</p>

            {/* Mode Selection */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setGameMode('1p')}
                className={`px-6 py-3 rounded-lg font-bold text-lg transition-all ${
                  gameMode === '1p'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                1 PLAYER vs AI
              </button>
              <button
                onClick={() => setGameMode('2p')}
                className={`px-6 py-3 rounded-lg font-bold text-lg transition-all ${
                  gameMode === '2p'
                    ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/50'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                2 PLAYERS
              </button>
            </div>

            <div className="text-yellow-400 text-2xl font-bold animate-bounce mb-6">
              Press SPACE or F to Start!
            </div>

            {gameMode === '1p' ? (
              <div className="text-center text-sm text-zinc-300">
                <div className="text-red-400 font-bold mb-2">YOUR CONTROLS (OPTIMUS)</div>
                <div>W - Jump | A/D - Move</div>
                <div>G - Punch | H - Kick | J - Special</div>
                <div className="mt-4 text-yellow-400 font-bold">
                  🤖 Prime Chime is controlled by AI
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-8 text-sm text-zinc-300">
                <div>
                  <div className="text-red-400 font-bold mb-2">PLAYER 1 (OPTIMUS)</div>
                  <div>W - Jump</div>
                  <div>A/D - Move</div>
                  <div>G - Punch</div>
                  <div>H - Kick</div>
                  <div>J - Special (when full)</div>
                </div>
                <div>
                  <div className="text-yellow-400 font-bold mb-2">PLAYER 2 (PRIME)</div>
                  <div>↑ - Jump</div>
                  <div>←/→ - Move</div>
                  <div>, or 1 - Punch</div>
                  <div>. or 2 - Kick</div>
                  <div>/ or 3 - Special (when full)</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Round End Overlay */}
        {gameState === 'roundEnd' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <div className="text-4xl font-black text-yellow-400 mb-4" style={{ animation: 'glow 0.5s infinite' }}>
              {winner === 'draw' ? '🤝 DRAW! 🤝' : '🏆 K.O.! 🏆'}
            </div>
            {winner !== 'draw' && (
              <div className="text-3xl text-white font-bold mb-4">
                {winner === 'optimus' ? 'OPTIMUS CHIME' : 'PRIME CHIME'} WINS!
              </div>
            )}
            <div className="text-zinc-400 mb-8">
              Score: {optimusScore} - {primeScore}
            </div>
            <div className="text-yellow-400 animate-bounce">
              Press SPACE for next round
            </div>
          </div>
        )}
      </div>

      {/* Controls reminder */}
      <div className="mt-4 text-zinc-500 text-xs text-center">
        P1: WASD + G(punch) H(kick) J(special) | P2: Arrows + ,(punch) .(kick) /(special)
      </div>

      <p className="mt-2 text-zinc-600 text-xs">
        This is satire - no affiliation with Axon Enterprise, Inc.
      </p>
    </div>
  );
}
