'use client';

import { useEffect } from 'react';

export default function OptimusChimePage() {
  useEffect(() => {
    const images = [
      'https://igaqhhu6xiolnmsh.public.blob.vercel-storage.com/images/1773363194597-optimuschime.png',
      'https://igaqhhu6xiolnmsh.public.blob.vercel-storage.com/images/1773407964880-prime-chime.png'
    ];

    function createFloatingChime() {
      const img = document.createElement('img');
      img.src = images[Math.floor(Math.random() * images.length)];
      img.style.cssText = `
        position: fixed;
        pointer-events: none;
        opacity: 0.6;
        width: ${30 + Math.random() * 70}px;
        left: ${Math.random() * window.innerWidth}px;
        top: ${window.innerHeight + 100}px;
      `;

      const duration = 5 + Math.random() * 5;
      const rotation = (Math.random() - 0.5) * 720;

      img.animate([
        { transform: 'translateY(0) rotate(0deg)', opacity: 0.6 },
        { transform: `translateY(-${window.innerHeight + 200}px) rotate(${rotation}deg)`, opacity: 0 }
      ], {
        duration: duration * 1000,
        easing: 'linear'
      }).onfinish = () => img.remove();

      document.body.appendChild(img);
    }

    const interval = setInterval(createFloatingChime, 800);

    const handleClick = (e: MouseEvent) => {
      for (let i = 0; i < 8; i++) {
        const sparkle = document.createElement('div');
        sparkle.style.cssText = `
          position: fixed;
          width: 10px;
          height: 10px;
          background: ${['#ffd93d', '#ff6b6b', '#4ecdc4', '#fff'][Math.floor(Math.random() * 4)]};
          border-radius: 50%;
          pointer-events: none;
          left: ${e.clientX + (Math.random() - 0.5) * 50}px;
          top: ${e.clientY + (Math.random() - 0.5) * 50}px;
        `;
        sparkle.animate([
          { transform: 'scale(0)', opacity: 1 },
          { transform: 'scale(2)', opacity: 0 }
        ], { duration: 1000 }).onfinish = () => sparkle.remove();
        document.body.appendChild(sparkle);
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const shootLaser = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const laser = document.createElement('div');
    laser.style.cssText = `
      position: fixed;
      height: 4px;
      background: linear-gradient(90deg, transparent, #00ff00, #00ff00, transparent);
      pointer-events: none;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height / 2}px;
      transform: rotate(${Math.random() * 360}deg);
    `;
    document.body.appendChild(laser);

    laser.animate([
      { width: '0', opacity: 1 },
      { width: '300px', opacity: 0 }
    ], { duration: 500 }).onfinish = () => laser.remove();

    e.currentTarget.style.filter = 'brightness(2) drop-shadow(0 0 30px #00ff00)';
    setTimeout(() => {
      if (e.currentTarget) {
        e.currentTarget.style.filter = 'drop-shadow(0 0 20px rgba(255,255,255,0.5))';
      }
    }, 200);
  };

  return (
    <div className="min-h-screen overflow-hidden" style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
    }}>
      <style jsx global>{`
        @keyframes glow {
          from { text-shadow: 0 0 20px #ff6b6b, 0 0 40px #ff6b6b; }
          to { text-shadow: 0 0 30px #4ecdc4, 0 0 60px #4ecdc4, 0 0 80px #4ecdc4; }
        }
        @keyframes battleBounce {
          from { transform: translateX(0) scale(1); }
          to { transform: translateX(20px) scale(1.1); }
        }
        @keyframes battleBounceRight {
          from { transform: translateX(0) scale(1); }
          to { transform: translateX(-20px) scale(1.1); }
        }
        @keyframes pulse {
          from { transform: scale(1); opacity: 0.8; }
          to { transform: scale(1.2); opacity: 1; }
        }
      `}</style>

      <h1
        className="fixed top-5 left-1/2 -translate-x-1/2 text-5xl font-black text-white z-50 text-center"
        style={{
          textShadow: '0 0 20px #ff6b6b, 0 0 40px #ff6b6b, 0 0 60px #ff6b6b',
          animation: 'glow 2s ease-in-out infinite alternate',
          fontFamily: 'Arial Black, sans-serif'
        }}
      >
        OPTIMUS CHIME
      </h1>

      <p
        className="fixed top-24 left-1/2 -translate-x-1/2 text-xl z-50"
        style={{
          color: '#ffd93d',
          textShadow: '0 0 10px #ffd93d',
          fontFamily: 'Arial Black, sans-serif'
        }}
      >
        Our Fearless Leader & CEO
      </p>

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8 md:gap-16">
        <img
          src="https://igaqhhu6xiolnmsh.public.blob.vercel-storage.com/images/1773363194597-optimuschime.png"
          alt="Optimus Chime"
          onClick={shootLaser}
          className="w-40 md:w-64 cursor-pointer transition-transform hover:scale-110"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))',
            animation: 'battleBounce 0.5s ease-in-out infinite alternate'
          }}
        />

        <span
          className="text-6xl md:text-8xl font-black"
          style={{
            color: '#ff6b6b',
            textShadow: '0 0 30px #ff6b6b',
            animation: 'pulse 0.5s ease-in-out infinite alternate'
          }}
        >
          VS
        </span>

        <img
          src="https://igaqhhu6xiolnmsh.public.blob.vercel-storage.com/images/1773407964880-prime-chime.png"
          alt="Prime Chime"
          onClick={shootLaser}
          className="w-40 md:w-64 cursor-pointer transition-transform hover:scale-110"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))',
            animation: 'battleBounceRight 0.5s ease-in-out infinite alternate',
            animationDelay: '0.25s'
          }}
        />
      </div>

      <p className="fixed bottom-5 left-1/2 -translate-x-1/2 text-zinc-500 text-sm text-center z-50 px-4">
        Click the chimes for laser action! This is satire - no affiliation with Axon Enterprise, Inc.
      </p>
    </div>
  );
}
