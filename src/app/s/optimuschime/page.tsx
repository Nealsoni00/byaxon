'use client';

import { useEffect, useState, useCallback } from 'react';

const OPTIMUS_IMG = 'https://igaqhhu6xiolnmsh.public.blob.vercel-storage.com/images/1773363194597-optimuschime.png';
const PRIME_IMG = 'https://igaqhhu6xiolnmsh.public.blob.vercel-storage.com/images/1773407964880-prime-chime.png';

type GameState = 'idle' | 'fighting' | 'victory';
type PowerUp = 'none' | 'fire' | 'lightning' | 'shield' | 'mega';

const POWER_UPS: { name: PowerUp; color: string; emoji: string }[] = [
  { name: 'fire', color: '#ff4444', emoji: '🔥' },
  { name: 'lightning', color: '#ffff00', emoji: '⚡' },
  { name: 'shield', color: '#4444ff', emoji: '🛡️' },
  { name: 'mega', color: '#ff00ff', emoji: '💥' },
];

const ATTACK_MESSAGES = [
  'BOOM!', 'POW!', 'WHAM!', 'CRASH!', 'ZAP!', 'SLAM!',
  'KABOOM!', 'SMASH!', 'THWACK!', 'CRUNCH!'
];

export default function OptimusChimePage() {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [optimusHealth, setOptimusHealth] = useState(100);
  const [primeHealth, setPrimeHealth] = useState(100);
  const [optimusPower, setOptimusPower] = useState<PowerUp>('none');
  const [primePower, setPrimePower] = useState<PowerUp>('none');
  const [winner, setWinner] = useState<'optimus' | 'prime' | null>(null);
  const [attackMessage, setAttackMessage] = useState('');
  const [optimusScore, setOptimusScore] = useState(0);
  const [primeScore, setPrimeScore] = useState(0);
  const [showPrompt, setShowPrompt] = useState(true);
  const [shakeLeft, setShakeLeft] = useState(false);
  const [shakeRight, setShakeRight] = useState(false);
  const [combo, setCombo] = useState(0);

  const resetGame = useCallback(() => {
    setOptimusHealth(100);
    setPrimeHealth(100);
    setOptimusPower('none');
    setPrimePower('none');
    setWinner(null);
    setAttackMessage('');
    setGameState('idle');
    setCombo(0);
  }, []);

  const startFight = useCallback(() => {
    if (gameState !== 'idle') return;
    setGameState('fighting');
    setShowPrompt(false);
  }, [gameState]);

  // Auto-start fight after a delay if idle
  useEffect(() => {
    if (gameState === 'idle') {
      const autoStart = setTimeout(() => {
        startFight();
      }, 5000);
      return () => clearTimeout(autoStart);
    }
  }, [gameState, startFight]);

  // Fight logic
  useEffect(() => {
    if (gameState !== 'fighting') return;

    const fightInterval = setInterval(() => {
      const attacker = Math.random() > 0.5 ? 'optimus' : 'prime';
      let damage = Math.floor(Math.random() * 15) + 5;

      // Power-up effects
      const activePower = attacker === 'optimus' ? optimusPower : primePower;
      if (activePower === 'mega') damage *= 2;
      if (activePower === 'fire') damage += 10;
      if (activePower === 'lightning') damage += 5;

      // Shield reduces damage
      const defenderPower = attacker === 'optimus' ? primePower : optimusPower;
      if (defenderPower === 'shield') damage = Math.floor(damage * 0.5);

      // Apply damage
      if (attacker === 'optimus') {
        setPrimeHealth(h => Math.max(0, h - damage));
        setShakeRight(true);
        setTimeout(() => setShakeRight(false), 200);
      } else {
        setOptimusHealth(h => Math.max(0, h - damage));
        setShakeLeft(true);
        setTimeout(() => setShakeLeft(false), 200);
      }

      // Show attack message
      const msg = ATTACK_MESSAGES[Math.floor(Math.random() * ATTACK_MESSAGES.length)];
      setAttackMessage(`${msg} -${damage}`);
      setCombo(c => c + 1);

      // Random power-up spawn
      if (Math.random() < 0.15) {
        const powerUp = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
        if (Math.random() > 0.5) {
          setOptimusPower(powerUp.name);
          setTimeout(() => setOptimusPower('none'), 3000);
        } else {
          setPrimePower(powerUp.name);
          setTimeout(() => setPrimePower('none'), 3000);
        }
      }

      // Create hit effect
      createHitEffect(attacker === 'optimus' ? 'right' : 'left');

    }, 400);

    return () => clearInterval(fightInterval);
  }, [gameState, optimusPower, primePower]);

  // Check for winner
  useEffect(() => {
    if (gameState !== 'fighting') return;

    if (optimusHealth <= 0) {
      setWinner('prime');
      setPrimeScore(s => s + 1);
      setGameState('victory');
    } else if (primeHealth <= 0) {
      setWinner('optimus');
      setOptimusScore(s => s + 1);
      setGameState('victory');
    }
  }, [optimusHealth, primeHealth, gameState]);

  // Auto-restart after victory
  useEffect(() => {
    if (gameState === 'victory') {
      const restart = setTimeout(resetGame, 4000);
      return () => clearTimeout(restart);
    }
  }, [gameState, resetGame]);

  // Keyboard handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        if (gameState === 'idle') startFight();
        else if (gameState === 'victory') resetGame();
      }
      // Click to boost your fighter
      if (gameState === 'fighting') {
        if (e.key === '1' || e.key === 'a') {
          setOptimusPower('mega');
          setTimeout(() => setOptimusPower('none'), 2000);
        }
        if (e.key === '2' || e.key === 'l') {
          setPrimePower('mega');
          setTimeout(() => setPrimePower('none'), 2000);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, startFight, resetGame]);

  const createHitEffect = (side: 'left' | 'right') => {
    const effect = document.createElement('div');
    effect.textContent = ATTACK_MESSAGES[Math.floor(Math.random() * ATTACK_MESSAGES.length)];
    effect.style.cssText = `
      position: fixed;
      top: ${40 + Math.random() * 20}%;
      ${side}: ${30 + Math.random() * 10}%;
      font-size: 3rem;
      font-weight: bold;
      color: #ff0;
      text-shadow: 0 0 20px #f00, 0 0 40px #f00;
      pointer-events: none;
      z-index: 1000;
      animation: hitPop 0.5s ease-out forwards;
    `;
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
  };

  // Floating chimes background
  useEffect(() => {
    const images = [OPTIMUS_IMG, PRIME_IMG];

    function createFloatingChime() {
      const img = document.createElement('img');
      img.src = images[Math.floor(Math.random() * images.length)];
      img.style.cssText = `
        position: fixed;
        pointer-events: none;
        opacity: 0.4;
        width: ${20 + Math.random() * 40}px;
        left: ${Math.random() * window.innerWidth}px;
        top: ${window.innerHeight + 50}px;
        z-index: 1;
      `;
      const duration = 6 + Math.random() * 4;
      const rotation = (Math.random() - 0.5) * 720;
      img.animate([
        { transform: 'translateY(0) rotate(0deg)', opacity: 0.4 },
        { transform: `translateY(-${window.innerHeight + 100}px) rotate(${rotation}deg)`, opacity: 0 }
      ], { duration: duration * 1000, easing: 'linear' }).onfinish = () => img.remove();
      document.body.appendChild(img);
    }

    const interval = setInterval(createFloatingChime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPowerUpStyle = (power: PowerUp) => {
    const p = POWER_UPS.find(pu => pu.name === power);
    if (!p) return {};
    return {
      boxShadow: `0 0 30px ${p.color}, 0 0 60px ${p.color}`,
      filter: `drop-shadow(0 0 20px ${p.color})`
    };
  };

  return (
    <div className="min-h-screen overflow-hidden select-none" style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
    }}>
      <style jsx global>{`
        @keyframes glow {
          from { text-shadow: 0 0 20px #ff6b6b, 0 0 40px #ff6b6b; }
          to { text-shadow: 0 0 30px #4ecdc4, 0 0 60px #4ecdc4, 0 0 80px #4ecdc4; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px) rotate(-2deg); }
          75% { transform: translateX(10px) rotate(2deg); }
        }
        @keyframes pulse {
          from { transform: scale(1); }
          to { transform: scale(1.1); }
        }
        @keyframes hitPop {
          0% { transform: scale(0) rotate(-10deg); opacity: 1; }
          50% { transform: scale(1.5) rotate(5deg); opacity: 1; }
          100% { transform: scale(0.5) translateY(-50px); opacity: 0; }
        }
        @keyframes victoryBounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.2) rotate(-5deg); }
          50% { transform: scale(1.3) rotate(5deg); }
          75% { transform: scale(1.2) rotate(-3deg); }
        }
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Score Board */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-8 z-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{optimusScore}</div>
          <div className="text-xs text-zinc-400">OPTIMUS</div>
        </div>
        <h1
          className="text-3xl md:text-4xl font-black text-white text-center"
          style={{
            textShadow: '0 0 20px #ff6b6b, 0 0 40px #ff6b6b',
            animation: 'glow 2s ease-in-out infinite alternate',
            fontFamily: 'Arial Black, sans-serif'
          }}
        >
          CHIME FIGHTERS
        </h1>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{primeScore}</div>
          <div className="text-xs text-zinc-400">PRIME</div>
        </div>
      </div>

      {/* Health Bars */}
      <div className="fixed top-20 left-0 right-0 px-8 flex justify-between items-center z-40">
        {/* Optimus Health */}
        <div className="w-[35%]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-400 font-bold text-sm">OPTIMUS CHIME</span>
            {optimusPower !== 'none' && (
              <span className="text-lg">{POWER_UPS.find(p => p.name === optimusPower)?.emoji}</span>
            )}
          </div>
          <div className="h-6 bg-zinc-800 rounded-full overflow-hidden border-2 border-red-900">
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${optimusHealth}%`,
                background: optimusHealth > 50 ? 'linear-gradient(90deg, #22c55e, #4ade80)' :
                           optimusHealth > 25 ? 'linear-gradient(90deg, #eab308, #facc15)' :
                           'linear-gradient(90deg, #dc2626, #ef4444)',
                animation: optimusHealth < 25 ? 'flash 0.3s infinite' : 'none'
              }}
            />
          </div>
        </div>

        {/* VS / Combo */}
        <div className="text-center">
          {gameState === 'fighting' && (
            <>
              <div className="text-4xl font-black text-red-500" style={{ textShadow: '0 0 20px #f00' }}>
                {attackMessage}
              </div>
              {combo > 3 && (
                <div className="text-yellow-400 text-sm">
                  {combo}x COMBO!
                </div>
              )}
            </>
          )}
        </div>

        {/* Prime Health */}
        <div className="w-[35%]">
          <div className="flex items-center justify-end gap-2 mb-1">
            {primePower !== 'none' && (
              <span className="text-lg">{POWER_UPS.find(p => p.name === primePower)?.emoji}</span>
            )}
            <span className="text-yellow-400 font-bold text-sm">PRIME CHIME</span>
          </div>
          <div className="h-6 bg-zinc-800 rounded-full overflow-hidden border-2 border-yellow-900">
            <div
              className="h-full transition-all duration-200 ml-auto"
              style={{
                width: `${primeHealth}%`,
                background: primeHealth > 50 ? 'linear-gradient(90deg, #4ade80, #22c55e)' :
                           primeHealth > 25 ? 'linear-gradient(90deg, #facc15, #eab308)' :
                           'linear-gradient(90deg, #ef4444, #dc2626)',
                animation: primeHealth < 25 ? 'flash 0.3s infinite' : 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Fighters */}
      <div className="fixed top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between items-center px-12 md:px-24">
        <div
          className="relative"
          style={{
            animation: shakeLeft ? 'shake 0.2s ease-in-out' :
                      gameState === 'fighting' ? 'pulse 0.5s ease-in-out infinite alternate' : 'none',
            ...getPowerUpStyle(optimusPower)
          }}
        >
          <img
            src={OPTIMUS_IMG}
            alt="Optimus Chime"
            className="w-48 md:w-64 cursor-pointer transition-transform"
            style={{
              filter: winner === 'prime' ? 'grayscale(1) brightness(0.5)' :
                     winner === 'optimus' ? 'drop-shadow(0 0 30px gold)' :
                     'drop-shadow(0 0 10px rgba(255,100,100,0.5))',
              animation: winner === 'optimus' ? 'victoryBounce 0.5s ease-in-out infinite' : 'none',
              transform: winner === 'prime' ? 'rotate(15deg) translateY(20px)' : 'none'
            }}
            onClick={() => {
              if (gameState === 'idle') startFight();
              else if (gameState === 'fighting') {
                setOptimusPower('mega');
                setTimeout(() => setOptimusPower('none'), 2000);
              }
            }}
          />
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-zinc-400">
            Press A or Click
          </div>
        </div>

        {/* Center content */}
        <div className="text-center z-20">
          {gameState === 'idle' && (
            <div className="animate-pulse">
              <div className="text-6xl font-black text-red-500 mb-4" style={{ textShadow: '0 0 30px #f00' }}>
                VS
              </div>
              {showPrompt && (
                <div className="bg-black/50 px-6 py-3 rounded-lg">
                  <div className="text-yellow-400 text-xl font-bold animate-bounce">
                    Press F to FIGHT!
                  </div>
                  <div className="text-zinc-400 text-sm mt-1">or wait for auto-battle</div>
                </div>
              )}
            </div>
          )}

          {gameState === 'victory' && winner && (
            <div className="animate-bounce">
              <div className="text-4xl md:text-6xl font-black text-yellow-400 mb-2"
                   style={{ textShadow: '0 0 30px gold, 0 0 60px gold' }}>
                🏆 WINNER! 🏆
              </div>
              <div className="text-2xl text-white font-bold">
                {winner === 'optimus' ? 'OPTIMUS CHIME' : 'PRIME CHIME'}
              </div>
              <div className="text-zinc-400 text-sm mt-4">
                Next round starting soon... (or press F)
              </div>
            </div>
          )}
        </div>

        <div
          className="relative"
          style={{
            animation: shakeRight ? 'shake 0.2s ease-in-out' :
                      gameState === 'fighting' ? 'pulse 0.5s ease-in-out infinite alternate-reverse' : 'none',
            ...getPowerUpStyle(primePower)
          }}
        >
          <img
            src={PRIME_IMG}
            alt="Prime Chime"
            className="w-48 md:w-64 cursor-pointer transition-transform"
            style={{
              filter: winner === 'optimus' ? 'grayscale(1) brightness(0.5)' :
                     winner === 'prime' ? 'drop-shadow(0 0 30px gold)' :
                     'drop-shadow(0 0 10px rgba(255,255,100,0.5))',
              animation: winner === 'prime' ? 'victoryBounce 0.5s ease-in-out infinite' : 'none',
              transform: winner === 'optimus' ? 'rotate(-15deg) translateY(20px)' : 'none'
            }}
            onClick={() => {
              if (gameState === 'idle') startFight();
              else if (gameState === 'fighting') {
                setPrimePower('mega');
                setTimeout(() => setPrimePower('none'), 2000);
              }
            }}
          />
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-zinc-400">
            Press L or Click
          </div>
        </div>
      </div>

      {/* Power-up Legend */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex gap-4 text-xs text-zinc-500">
        {POWER_UPS.map(p => (
          <span key={p.name}>{p.emoji} {p.name}</span>
        ))}
      </div>

      <p className="fixed bottom-4 left-1/2 -translate-x-1/2 text-zinc-600 text-xs text-center z-50 px-4">
        This is satire - no affiliation with Axon Enterprise, Inc.
      </p>
    </div>
  );
}
