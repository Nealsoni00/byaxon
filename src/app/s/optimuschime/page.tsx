'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';

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
const TOTAL_ROUNDS = 3;

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

interface LeaderboardEntry {
  name: string;
  score: number;
  wins: number;
  bestScore: number;
  lastPlayed: string;
}

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
  const [hitEffects, setHitEffects] = useState<{ x: number; y: number; text: string; id: number; attacker: 'optimus' | 'prime' }[]>([]);

  // Leaderboard state
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lastScore, setLastScore] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const totalDamageDealt = useRef(0);

  const keysPressed = useRef<Set<string>>(new Set());
  const effectId = useRef(0);
  const aiDecisionTimer = useRef(0);

  // Pre-generate random patterns for skyline (so they don't change on re-render)
  const skylineData = useMemo(() => ({
    buildings: [
      [...Array(24)].map(() => Math.random() > 0.4),
      [...Array(20)].map(() => Math.random() > 0.5),
      [...Array(30)].map(() => Math.random() > 0.45),
      [...Array(15)].map(() => Math.random() > 0.5),
      [...Array(21)].map(() => Math.random() > 0.45),
      [...Array(28)].map(() => Math.random() > 0.5),
      [...Array(18)].map(() => Math.random() > 0.55),
      [...Array(32)].map(() => Math.random() > 0.5),
      [...Array(12)].map(() => Math.random() > 0.5),
    ],
    stars: [...Array(30)].map(() => ({
      size: Math.random() > 0.7 ? 3 : 2,
      left: Math.random() * 100,
      top: Math.random() * 100,
      opacity: 0.4 + Math.random() * 0.6,
      duration: 2 + Math.random() * 3
    }))
  }), []);

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
    setLastScore(0);
    setPlayerRank(null);
    totalDamageDealt.current = 0;
    setGameState('fighting');
  }, [resetPlayers]);

  const addHitEffect = useCallback((x: number, y: number, text: string, attacker: 'optimus' | 'prime') => {
    const id = effectId.current++;
    setHitEffects(prev => [...prev, { x, y, text, id, attacker }]);
    setTimeout(() => {
      setHitEffects(prev => prev.filter(e => e.id !== id));
    }, 500);
  }, []);

  // Fetch leaderboard on load
  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => setLeaderboard(Array.isArray(data) ? data : []))
      .catch(() => setLeaderboard([]));
  }, []);

  // Calculate score based on performance
  const calculateScore = useCallback((healthRemaining: number, timeRemaining: number, damageDealt: number) => {
    let score = 0;

    // Base win bonus
    score += 100;

    // Health bonus (1 point per HP remaining)
    score += healthRemaining;

    // Time bonus (2 points per second remaining)
    score += timeRemaining * 2;

    // Damage dealt bonus (0.5 points per damage)
    score += Math.floor(damageDealt * 0.5);

    // Perfect win bonus (no damage taken)
    if (healthRemaining === 100) {
      score += 50;
    }

    // Quick win bonus (under 30 seconds)
    if (timeRemaining > 30) {
      score += 25;
    }

    return score;
  }, []);

  // Submit score to leaderboard
  const submitScore = useCallback(async (score: number) => {
    if (!playerName.trim() || gameMode !== '1p') return;

    setSubmittingScore(true);
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, score }),
      });

      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setPlayerRank(data.playerRank || null);
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
    setSubmittingScore(false);
  }, [playerName, gameMode]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());

      // For 2P mode, allow SPACE or F to start (no name input needed)
      if (gameState === 'menu' && gameMode === '2p' && (e.key === ' ' || e.key.toLowerCase() === 'f')) {
        startGame();
      }
      if ((gameState === 'roundEnd' || gameState === 'gameOver') && e.key === ' ') {
        if (gameState === 'gameOver') {
          // Reset everything for new game
          setOptimusScore(0);
          setPrimeScore(0);
          setRound(1);
          setGameState('menu');
          // Refresh leaderboard
          fetch('/api/leaderboard')
            .then(res => res.json())
            .then(data => setLeaderboard(Array.isArray(data) ? data : []))
            .catch(() => {});
        } else if (round >= TOTAL_ROUNDS) {
          // All rounds complete - go to game over
          setGameState('gameOver');
        } else {
          // Next round
          setRound(r => r + 1);
          startGame();
        }
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
  }, [gameState, startGame, playerName, gameMode, round]);

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
            // Calculate score for time-based win (0 time remaining)
            const score = calculateScore(p1.health, 0, totalDamageDealt.current);
            setLastScore(score);
            if (gameMode === '1p' && playerName.trim()) {
              submitScore(score);
            }
          } else if (p2.health > p1.health) {
            setWinner('prime');
            setPrimeScore(s => s + 1);
            setLastScore(0);
          } else {
            setWinner('draw');
            setLastScore(0);
          }
          setGameState('roundEnd');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, p1.health, p2.health, gameMode, playerName, calculateScore, submitScore]);

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

          // Dynamic AI personality - changes based on health and situation
          const aiAggression = p2.health < 40 ? 0.8 : p2.health > p1.health ? 0.4 : 0.6;
          const isLosing = p2.health < p1.health;

          // React to player attacking - try to dodge or counter!
          if (p1.isAttacking && distance < 120 && Math.random() > 0.5) {
            // Dodge by jumping or backing away
            if (!p2.isJumping && Math.random() > 0.4) {
              p2.vy = JUMP_FORCE; p2.isJumping = true;
            } else {
              p2.vx = playerIsLeft ? MOVE_SPEED * 0.8 : -MOVE_SPEED * 0.8;
            }
          }

          // AI makes decisions every 10 frames
          if (aiDecisionTimer.current % 10 === 0) {
            // Movement based on distance and aggression
            if (distance > 200) {
              // Far away - approach at varying speeds
              const speed = MOVE_SPEED * (0.5 + Math.random() * 0.3);
              p2.vx = playerIsLeft ? -speed : speed;
            } else if (distance > 100) {
              // Mid range - mix of approach and feints
              if (Math.random() < aiAggression) {
                p2.vx = playerIsLeft ? -MOVE_SPEED * 0.6 : MOVE_SPEED * 0.6;
              } else {
                // Feint - move back then forward
                p2.vx = playerIsLeft ? MOVE_SPEED * 0.3 : -MOVE_SPEED * 0.3;
              }
            } else if (distance < 60) {
              // Close range - attack or create space
              if (p2.attackCooldown <= 0 && Math.random() < aiAggression) {
                const rand = Math.random();
                if (p2.specialCharge >= 100 && (isLosing || rand > 0.7)) {
                  p2.isAttacking = true; p2.attackType = 'special'; p2.specialCharge = 0;
                } else if (rand > 0.5) {
                  p2.isAttacking = true; p2.attackType = 'kick'; p2.attackCooldown = ATTACKS.kick.cooldown;
                } else {
                  p2.isAttacking = true; p2.attackType = 'punch'; p2.attackCooldown = ATTACKS.punch.cooldown;
                }
              } else {
                // Back away to reset
                p2.vx = playerIsLeft ? MOVE_SPEED * 0.5 : -MOVE_SPEED * 0.5;
              }
            } else {
              // In attack range (60-100) - the sweet spot
              if (p2.attackCooldown <= 0 && Math.random() < (aiAggression * 0.8)) {
                const rand = Math.random();
                if (p2.specialCharge >= 100 && rand > 0.6) {
                  p2.isAttacking = true; p2.attackType = 'special'; p2.specialCharge = 0;
                } else if (rand > 0.4) {
                  p2.isAttacking = true; p2.attackType = 'kick'; p2.attackCooldown = ATTACKS.kick.cooldown;
                } else {
                  p2.isAttacking = true; p2.attackType = 'punch'; p2.attackCooldown = ATTACKS.punch.cooldown;
                }
              }
              p2.vx *= 0.8;
            }

            // Dynamic jumping - more when losing or to dodge
            if (!p2.isJumping) {
              const jumpChance = isLosing ? 0.12 : 0.06;
              if (Math.random() < jumpChance) {
                p2.vy = JUMP_FORCE; p2.isJumping = true;
                // Jump toward or away from player
                if (Math.random() > 0.5) {
                  p2.vx = playerIsLeft ? -MOVE_SPEED * 0.5 : MOVE_SPEED * 0.5;
                }
              }
            }
          } else {
            // Smooth movement between decisions
            p2.vx *= 0.92;
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
          totalDamageDealt.current += damage; // Track damage for scoring

          const texts = ['POW!', 'BAM!', 'WHAM!', 'CRASH!', 'BOOM!'];
          addHitEffect((p1.x + p2.x) / 2, p2.y - 50,
            attackType === 'special' ? `💥 SUPER! -${damage}` : `${texts[Math.floor(Math.random() * texts.length)]} -${damage}`, 'optimus');
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
            attackType === 'special' ? `💥 SUPER! -${damage}` : `${texts[Math.floor(Math.random() * texts.length)]} -${damage}`, 'prime');
        }
      }

      // Check for KO
      if (p1.health <= 0) {
        setWinner('prime');
        setPrimeScore(s => s + 1);
        setLastScore(0); // No score for losing
        setGameState('roundEnd');
      } else if (p2.health <= 0) {
        setWinner('optimus');
        setOptimusScore(s => s + 1);
        // Calculate and set score for winning
        const score = calculateScore(p1.health, timeLeft, totalDamageDealt.current);
        setLastScore(score);
        if (gameMode === '1p' && playerName.trim()) {
          submitScore(score);
        }
        setGameState('roundEnd');
      }

      // Sync refs to React state for rendering
      setP1({ ...p1 });
      setP2({ ...p2 });

    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameState, gameMode, addHitEffect, timeLeft, calculateScore, submitScore, playerName]);

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
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
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
        className="relative rounded-lg overflow-hidden border-4 border-zinc-700"
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          maxWidth: '100%',
          background: 'linear-gradient(to bottom, #0a0a1a 0%, #1a1a3a 30%, #2d1b4e 60%, #1a1a2e 100%)',
          imageRendering: 'pixelated'
        }}
      >
        {/* Pixel Art NYC Skyline */}
        <div className="absolute bottom-20 left-0 right-0 flex items-end justify-around" style={{ height: '280px', imageRendering: 'pixelated' }}>
          {/* Empire State Building */}
          <div className="relative" style={{ width: '40px' }}>
            <div style={{ width: '8px', height: '30px', background: '#1a1a2e', margin: '0 auto' }} />
            <div style={{ width: '20px', height: '120px', background: '#1a1a2e', margin: '0 auto', boxShadow: 'inset 2px 0 0 #252540, inset -2px 0 0 #0f0f1a' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 4px)', gap: '2px', padding: '8px 2px' }}>
                {skylineData.buildings[0].map((lit, i) => <div key={i} style={{ width: '4px', height: '4px', background: lit ? '#ffeb3b' : '#1a1a2e' }} />)}
              </div>
            </div>
            <div style={{ width: '30px', height: '40px', background: '#1a1a2e', margin: '0 auto', boxShadow: 'inset 2px 0 0 #252540' }} />
          </div>

          {/* Building 1 */}
          <div style={{ width: '50px', height: '100px', background: '#151525', boxShadow: 'inset 2px 0 0 #202035' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 6px)', gap: '4px', padding: '8px' }}>
              {skylineData.buildings[1].map((lit, i) => <div key={i} style={{ width: '6px', height: '6px', background: lit ? '#ffd54f' : '#151525' }} />)}
            </div>
          </div>

          {/* One WTC */}
          <div className="relative" style={{ width: '35px' }}>
            <div style={{ width: '6px', height: '20px', background: '#1f1f35', margin: '0 auto' }} />
            <div style={{ width: '30px', height: '180px', background: 'linear-gradient(to bottom, #1f1f35, #151528)', margin: '0 auto', clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0 100%)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 5px)', gap: '3px', padding: '10px 4px' }}>
                {skylineData.buildings[2].map((lit, i) => <div key={i} style={{ width: '5px', height: '5px', background: lit ? '#4fc3f7' : '#1f1f35' }} />)}
              </div>
            </div>
          </div>

          {/* Building 2 */}
          <div style={{ width: '60px', height: '80px', background: '#181830', boxShadow: 'inset 3px 0 0 #222240' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 6px)', gap: '4px', padding: '6px' }}>
              {skylineData.buildings[3].map((lit, i) => <div key={i} style={{ width: '6px', height: '6px', background: lit ? '#ffcc02' : '#181830' }} />)}
            </div>
          </div>

          {/* Chrysler Building */}
          <div className="relative" style={{ width: '35px' }}>
            <div style={{ width: '0', height: '0', borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '25px solid #202038', margin: '0 auto' }} />
            <div style={{ width: '24px', height: '15px', background: '#202038', margin: '0 auto', borderRadius: '4px 4px 0 0' }} />
            <div style={{ width: '30px', height: '110px', background: '#1a1a30', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 5px)', gap: '3px', padding: '8px 5px' }}>
                {skylineData.buildings[4].map((lit, i) => <div key={i} style={{ width: '5px', height: '5px', background: lit ? '#fff176' : '#1a1a30' }} />)}
              </div>
            </div>
          </div>

          {/* Building 3 */}
          <div style={{ width: '45px', height: '130px', background: '#161628', boxShadow: 'inset 2px 0 0 #1f1f38' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 5px)', gap: '4px', padding: '8px 6px' }}>
              {skylineData.buildings[5].map((lit, i) => <div key={i} style={{ width: '5px', height: '5px', background: lit ? '#ffe082' : '#161628' }} />)}
            </div>
          </div>

          {/* Building 4 */}
          <div style={{ width: '55px', height: '90px', background: '#141428', boxShadow: 'inset 2px 0 0 #1c1c38' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 5px)', gap: '4px', padding: '6px' }}>
              {skylineData.buildings[6].map((lit, i) => <div key={i} style={{ width: '5px', height: '5px', background: lit ? '#ffb74d' : '#141428' }} />)}
            </div>
          </div>

          {/* Building 5 */}
          <div style={{ width: '40px', height: '150px', background: '#171730', boxShadow: 'inset 2px 0 0 #202042' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 6px)', gap: '4px', padding: '8px' }}>
              {skylineData.buildings[7].map((lit, i) => <div key={i} style={{ width: '6px', height: '6px', background: lit ? '#81d4fa' : '#171730' }} />)}
            </div>
          </div>

          {/* Building 6 */}
          <div style={{ width: '50px', height: '70px', background: '#151528' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 6px)', gap: '4px', padding: '6px' }}>
              {skylineData.buildings[8].map((lit, i) => <div key={i} style={{ width: '6px', height: '6px', background: lit ? '#fff59d' : '#151528' }} />)}
            </div>
          </div>
        </div>

        {/* Stars */}
        <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none">
          {skylineData.stars.map((star, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full"
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                left: `${star.left}%`,
                top: `${star.top}%`,
                opacity: star.opacity,
                animation: `twinkle ${star.duration}s infinite`
              }}
            />
          ))}
        </div>

        {/* Mini Leaderboard - always visible in corner */}
        {gameMode === '1p' && leaderboard.length > 0 && gameState !== 'menu' && (
          <div className="absolute top-4 right-4 bg-black/60 rounded p-2 text-xs w-32 pointer-events-none">
            <div className="text-purple-400 font-bold mb-1">🏆 TOP 5</div>
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div key={entry.name} className={`flex justify-between ${entry.name.toLowerCase() === playerName.toLowerCase() ? 'text-yellow-400' : 'text-zinc-400'}`}>
                <span className="truncate">{i + 1}. {entry.name}</span>
                <span>{entry.score}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: 'linear-gradient(to top, #0a0a12, #151520)', imageRendering: 'pixelated' }} />
        <div className="absolute bottom-20 left-0 right-0 h-1" style={{ background: '#252530' }} />

        {/* Health Bars */}
        <div className="absolute top-4 left-4 right-4 flex justify-between gap-4">
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

          {/* Round & Score Center */}
          <div className="flex flex-col items-center justify-center min-w-24">
            <div className="text-white font-black text-lg">
              ROUND {round}/{TOTAL_ROUNDS}
            </div>
            <div className="text-zinc-400 text-xs">
              {optimusScore} - {primeScore}
            </div>
            {gameMode === '1p' && gameState === 'fighting' && (
              <div className="text-green-400 text-xs font-bold mt-1">
                +{Math.max(0, 100 + p1.health + (timeLeft * 2) + Math.floor(totalDamageDealt.current * 0.5))} pts
              </div>
            )}
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
            className={`absolute text-2xl font-black pointer-events-none ${
              effect.attacker === 'optimus' ? 'text-red-400' : 'text-yellow-400'
            }`}
            style={{
              left: effect.x,
              top: effect.y,
              textShadow: effect.attacker === 'optimus' ? '0 0 10px #ff0000, 0 0 20px #ff0000' : '0 0 10px #ffaa00, 0 0 20px #ffaa00',
              animation: 'hitPop 0.5s ease-out forwards'
            }}
          >
            <div className="text-xs mb-1 opacity-80">
              {effect.attacker === 'optimus' ? '⚡ OPTIMUS' : '🤖 PRIME'}
            </div>
            {effect.text}
          </div>
        ))}

        {/* Menu Overlay */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center overflow-y-auto py-4">
            <h2 className="text-5xl font-black text-white mb-2" style={{ textShadow: '0 0 30px #ff6b6b' }}>
              CHIME FIGHTERS
            </h2>
            <p className="text-zinc-400 mb-3">Our Fearless Leader & CEO Battle</p>

            {/* Mode Selection */}
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => { setGameMode('1p'); setShowLeaderboard(false); }}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  gameMode === '1p'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                1P vs AI
              </button>
              <button
                onClick={() => { setGameMode('2p'); setShowLeaderboard(false); }}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  gameMode === '2p'
                    ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/50'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                2 PLAYERS
              </button>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  showLeaderboard
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                🏆 LEADERBOARD
              </button>
            </div>

            {showLeaderboard ? (
              <div className="bg-zinc-900/90 rounded-lg p-4 max-w-md w-full max-h-80 overflow-y-auto">
                <h3 className="text-xl font-bold text-center text-purple-400 mb-3">🏆 TOP PRIME CHIME SLAYERS</h3>
                {leaderboard.length === 0 ? (
                  <p className="text-zinc-500 text-center">No scores yet. Be the first!</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-zinc-400 border-b border-zinc-700">
                        <th className="py-1 text-left">#</th>
                        <th className="py-1 text-left">Name</th>
                        <th className="py-1 text-right">Score</th>
                        <th className="py-1 text-right">Wins</th>
                        <th className="py-1 text-right">Best</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, i) => (
                        <tr key={entry.name} className={`border-b border-zinc-800 ${i < 3 ? 'text-yellow-400' : 'text-zinc-300'}`}>
                          <td className="py-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                          <td className="py-1 font-medium">{entry.name}</td>
                          <td className="py-1 text-right">{entry.score.toLocaleString()}</td>
                          <td className="py-1 text-right">{entry.wins}</td>
                          <td className="py-1 text-right">{entry.bestScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <>
                {/* 1P Mode: Name input + Start button */}
                {gameMode === '1p' ? (
                  <div className="text-center">
                    <div className="mb-4">
                      <label className="block text-sm text-zinc-400 mb-2">Enter your name for leaderboard:</label>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            startGame();
                          }
                        }}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-center w-64 focus:outline-none focus:border-purple-500"
                        maxLength={20}
                      />
                    </div>

                    <div className="text-purple-400 font-bold text-sm mb-2">
                      ⚔️ BEST OF {TOTAL_ROUNDS} ROUNDS ⚔️
                    </div>

                    <button
                      type="button"
                      onClick={() => startGame()}
                      className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white text-xl font-bold rounded-lg shadow-lg transform hover:scale-105 transition-all mb-4"
                    >
                      🎮 START GAME
                    </button>

                    <div className="text-sm text-zinc-400 mt-4">
                      <div className="text-zinc-500 mb-2">Controls:</div>
                      <div className="text-xs">W - Jump | A/D - Move | G - Punch | H - Kick | J - Special</div>
                      <div className="mt-2 text-yellow-400 text-xs">
                        🤖 Prime Chime is controlled by AI
                      </div>
                      <div className="mt-2 text-green-400 text-xs">
                        Win rounds to earn points for the leaderboard!
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-yellow-400 text-xl font-bold animate-bounce mb-4">
                      Press SPACE or F to Start!
                    </div>
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
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Round End Overlay */}
        {gameState === 'roundEnd' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <div className="text-sm text-zinc-500 mb-2">ROUND {round} OF {TOTAL_ROUNDS}</div>
            <div className="text-4xl font-black text-yellow-400 mb-4" style={{ animation: 'glow 0.5s infinite' }}>
              {winner === 'draw' ? '🤝 DRAW! 🤝' : '🏆 K.O.! 🏆'}
            </div>
            {winner !== 'draw' && (
              <div className="text-3xl text-white font-bold mb-2">
                {winner === 'optimus' ? 'OPTIMUS CHIME' : 'PRIME CHIME'} WINS!
              </div>
            )}

            {/* Score display for 1P mode */}
            {gameMode === '1p' && winner === 'optimus' && lastScore > 0 && (
              <div className="bg-zinc-900/80 rounded-lg p-4 mb-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  +{lastScore} POINTS!
                </div>
                {playerName && (
                  <div className="text-sm text-zinc-400">
                    {submittingScore ? 'Saving...' : playerRank ? `Rank #${playerRank}` : 'Saved!'}
                  </div>
                )}
              </div>
            )}

            {gameMode === '1p' && winner === 'prime' && (
              <div className="text-red-400 mb-4">
                🤖 AI wins! No points.
              </div>
            )}

            <div className="text-zinc-400 mb-4">
              Match: {optimusScore} - {primeScore}
            </div>
            <div className="text-yellow-400 animate-bounce">
              {round >= TOTAL_ROUNDS ? 'Press SPACE for final results' : `Press SPACE for Round ${round + 1}`}
            </div>
          </div>
        )}

        {/* Game Over Overlay with Leaderboard */}
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center overflow-y-auto py-4">
            <div className="text-5xl font-black text-yellow-400 mb-2" style={{ animation: 'glow 0.5s infinite' }}>
              🏆 GAME OVER 🏆
            </div>
            <div className="text-3xl text-white font-bold mb-4">
              {optimusScore > primeScore ? 'YOU WIN THE MATCH!' :
               optimusScore < primeScore ? 'AI WINS THE MATCH!' : 'IT\'S A TIE!'}
            </div>
            <div className="text-xl text-zinc-300 mb-6">
              Final Score: {optimusScore} - {primeScore}
            </div>

            {/* Leaderboard */}
            {gameMode === '1p' && (
              <div className="bg-zinc-900/90 rounded-lg p-4 max-w-md w-full max-h-60 overflow-y-auto mb-4">
                <h3 className="text-lg font-bold text-center text-purple-400 mb-3">🏆 LEADERBOARD</h3>
                {leaderboard.length === 0 ? (
                  <p className="text-zinc-500 text-center">No scores yet!</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-zinc-400 border-b border-zinc-700">
                        <th className="py-1 text-left">#</th>
                        <th className="py-1 text-left">Name</th>
                        <th className="py-1 text-right">Score</th>
                        <th className="py-1 text-right">Wins</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.slice(0, 10).map((entry, i) => (
                        <tr key={entry.name} className={`border-b border-zinc-800 ${
                          entry.name.toLowerCase() === playerName.toLowerCase() ? 'bg-purple-900/30 text-purple-300' :
                          i < 3 ? 'text-yellow-400' : 'text-zinc-300'
                        }`}>
                          <td className="py-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                          <td className="py-1 font-medium">{entry.name}</td>
                          <td className="py-1 text-right">{entry.score.toLocaleString()}</td>
                          <td className="py-1 text-right">{entry.wins}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div className="text-yellow-400 animate-bounce">
              Press SPACE to play again
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
