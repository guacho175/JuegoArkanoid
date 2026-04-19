/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState, useCallback, TouchEvent } from 'react';
import { Trophy, Play, RotateCcw, Volume2, VolumeX, Keyboard, MousePointer2, ListOrdered, Heart, Terminal } from 'lucide-react';
import { Ball, Paddle, Block, GameState, Particle } from './types.ts';
import NeonMusicPlayer from './components/NeonMusicPlayer';

interface ScoreEntry {
  name: string;
  score: number;
  difficulty?: string;
  date: string;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 120;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BLOCK_ROWS = 5;
const BLOCK_COLS = 10;
const BLOCK_PADDING = 10;
const BLOCK_OFFSET_TOP = 80;
const BLOCK_OFFSET_LEFT = 35;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    highScore: parseInt(localStorage.getItem('arkanoid_highscore') || '0', 10),
    lives: 3,
    level: 1,
    status: 'menu'
  });

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const [ranking, setRanking] = useState<ScoreEntry[]>([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);

  useEffect(() => {
    const loadRanking = async () => {
      const sheetUrl = "https://script.google.com/macros/s/AKfycbwk6I3OvEN4GL1zjBcDvarlN_LVGrKWHXYbFVIOgXOOC1_Us1gEnT0dHIEiEkZLApuV/exec";
      setIsLoadingRanking(true);
      if (sheetUrl) {
        try {
          const res = await fetch(`${sheetUrl}?juego=arkanoid`, { cache: 'no-store' });
          if (res.ok) {
            const data: any[] = await res.json();
            const parsed: ScoreEntry[] = data.map(row => ({
              name: String(row.nombre || 'ANON'),
              score: parseInt(row.puntos, 10) || 0,
              difficulty: '',
              date: String(row.fecha || '')
            }));
            const sorted = parsed.sort((a, b) => b.score - a.score).slice(0, 10);
            setRanking(sorted);
            setIsLoadingRanking(false);
            return;
          }
        } catch (error) {
          console.error("Fallo conectando a Apps Script", error);
        }
      }
      const saved = JSON.parse(localStorage.getItem('arkanoid_neon_ranking') || '[]');
      setRanking(saved);
      setIsLoadingRanking(false);
    };
    loadRanking();
    window.addEventListener('rankingUpdated', loadRanking);
    return () => window.removeEventListener('rankingUpdated', loadRanking);
  }, []);

  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Game Engine Refs
  const ballRef = useRef<Ball>({ x: 400, y: 550, dx: 4, dy: -4, radius: BALL_RADIUS });
  const paddleRef = useRef<Paddle>({ x: 340, y: 570, width: PADDLE_WIDTH, height: PADDLE_HEIGHT });
  const blocksRef = useRef<Block[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});

  const initLevel = useCallback((level: number) => {
    const blocks: Block[] = [];
    const colors = ['#22d3ee', '#e879f9', '#a78bfa', '#fb7185', '#34d399'];
    
    for (let r = 0; r < BLOCK_ROWS; r++) {
      for (let c = 0; c < BLOCK_COLS; c++) {
        blocks.push({
          x: c * (CANVAS_WIDTH / BLOCK_COLS) + BLOCK_PADDING,
          y: r * 30 + BLOCK_OFFSET_TOP,
          width: (CANVAS_WIDTH / BLOCK_COLS) - (BLOCK_PADDING * 2),
          height: 20,
          color: colors[r % colors.length],
          points: (BLOCK_ROWS - r) * 10,
          destroyed: false,
          type: 'standard'
        });
      }
    }
    blocksRef.current = blocks;
    ballRef.current = { x: 400, y: 550, dx: 4 + level, dy: -(4 + level), radius: BALL_RADIUS };
    paddleRef.current.x = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
  }, []);

  const startGame = () => {
    initLevel(1);
    setGameState(prev => ({ ...prev, score: 0, lives: 3, level: 1, status: 'playing' }));
  };

  const restartLevel = () => {
    initLevel(gameState.level);
    setGameState(prev => ({ ...prev, status: 'playing' }));
  };

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // BeforeUnload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameState.status === 'playing') {
        e.preventDefault();
        return (e.returnValue = '¿Estás seguro de que quieres salir? Perderás tu progreso actual.');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState.status]);

  // Audio Logic
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      if (!muted && gameState.status === 'playing') {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [muted, gameState.status]);

  // Particles
  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x,
        y,
        dx: (Math.random() - 0.5) * 6,
        dy: (Math.random() - 0.5) * 6,
        size: Math.random() * 4 + 2,
        color,
        life: 1,
        decay: Math.random() * 0.05 + 0.02
      });
    }
  };

  // Collision Logic
  const update = () => {
    if (gameStateRef.current.status !== 'playing') return;

    const ball = ballRef.current;
    const paddle = paddleRef.current;
    const blocks = blocksRef.current;

    // Paddle Movement
    if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A']) {
      paddle.x = Math.max(0, paddle.x - 8);
    }
    if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) {
      paddle.x = Math.min(CANVAS_WIDTH - paddle.width, paddle.x + 8);
    }

    // Ball Movement
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall Collisions
    if (ball.x + ball.radius > CANVAS_WIDTH || ball.x - ball.radius < 0) ball.dx *= -1;
    if (ball.y - ball.radius < 0) ball.dy *= -1;

    // Floor Collision (Life Loss)
    if (ball.y + ball.radius > CANVAS_HEIGHT) {
      setGameState(prev => {
        const newLives = prev.lives - 1;
        if (newLives <= 0) return { ...prev, status: 'gameover' };
        // Reset ball/paddle
        ballRef.current = { x: 400, y: 550, dx: 4 + prev.level, dy: -(4 + prev.level), radius: BALL_RADIUS };
        paddleRef.current.x = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
        return { ...prev, lives: newLives };
      });
    }

    // Paddle Collision
    if (
      ball.y + ball.radius > paddle.y &&
      ball.y - ball.radius < paddle.y + paddle.height &&
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width
    ) {
      // Logic for bouncing angle based on where it hit the paddle
      const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      ball.dy = -Math.abs(ball.dy);
      ball.dx = hitPos * 7;
      createParticles(ball.x, ball.y, '#ffffff');
    }

    // Block Collision
    let allDestroyed = true;
    for (const block of blocks) {
      if (!block.destroyed) {
        allDestroyed = false;
        if (
          ball.x + ball.radius > block.x &&
          ball.x - ball.radius < block.x + block.width &&
          ball.y + ball.radius > block.y &&
          ball.y - ball.radius < block.y + block.height
        ) {
          block.destroyed = true;
          ball.dy *= -1;
          createParticles(block.x + block.width/2, block.y + block.height/2, block.color);
          
          setGameState(prev => {
            const newScore = prev.score + block.points;
            if (newScore > prev.highScore) {
              localStorage.setItem('arkanoid_highscore', newScore.toString());
              return { ...prev, score: newScore, highScore: newScore };
            }
            return { ...prev, score: newScore };
          });
          break;
        }
      }
    }

    if (allDestroyed && blocks.length > 0) {
      setGameState(prev => {
        if (prev.status === 'victory') return prev;
        return { ...prev, level: prev.level + 1, status: 'victory' };
      });
    }

    // Particles Update
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.dx;
      p.y += p.dy;
      p.life -= p.decay;
      return p.life > 0;
    });
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Blocks
    blocksRef.current.forEach(block => {
      if (block.destroyed) return;
      ctx.shadowBlur = 10;
      ctx.shadowColor = block.color;
      ctx.fillStyle = block.color;
      ctx.fillRect(block.x, block.y, block.width, block.height);
      
      // Top gloss
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(block.x, block.y, block.width, 2);
      ctx.shadowBlur = 0;
    });

    // Draw Paddle
    const paddle = paddleRef.current;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;

    // Draw Ball
    const ball = ballRef.current;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#e879f9';
    ctx.fillStyle = '#e879f9';
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;

    // Grid Overlay (Cyberpunk feel)
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let j = 0; j < CANVAS_HEIGHT; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(CANVAS_WIDTH, j);
      ctx.stroke();
    }
  }, []);

  const loop = useCallback(() => {
    update();
    draw();
    animationFrameRef.current = requestAnimationFrame(loop);
  }, [draw]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [loop]);

  // Touch Handling
  const handleTouchMove = (e: TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touchX = e.touches[0].clientX - rect.left;
    const scale = CANVAS_WIDTH / rect.width;
    const gameX = touchX * scale;
    paddleRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, gameX - PADDLE_WIDTH / 2));
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0c0c0e] flex flex-col font-sans selection:bg-cyan-500/30 relative">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-magenta-500/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full pt-1.5 sm:pt-3 pb-1 px-4 flex flex-col items-center z-50 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-slate-900 flex-shrink-0"
      >
        <div className="flex items-baseline gap-2 sm:gap-3">
          <h1 className="text-lg sm:text-2xl font-black italic text-slate-100 tracking-tighter uppercase relative">
            Arkanoid
            <span className="text-cyan-400 mx-1">Neón</span>
            <span className="absolute -top-1 -right-4 sm:-top-1.5 sm:-right-5 text-[6px] sm:text-[8px] font-mono text-magenta-500 font-bold bg-magenta-500/10 px-0.5 py-0.2 rounded border border-magenta-500/20">V1.1</span>
          </h1>
        </div>
        <p className="text-slate-500 font-mono tracking-[0.3em] text-[6px] sm:text-[8px] uppercase text-center leading-none">
          Hecho por <span className="text-cyan-400 font-bold">Galindez</span>
        </p>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full z-10 relative min-h-0">
        {/* Ranking Sidebar */}
        <motion.aside
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full lg:absolute lg:left-0 lg:top-0 lg:bottom-0 z-20 lg:w-44 xl:w-52 p-2 sm:p-3 lg:border-r border-t lg:border-t-0 border-slate-800 bg-slate-900/40 backdrop-blur-xl flex flex-col flex-shrink-0"
        >
          <div className="flex items-center gap-2 mb-2">
            <ListOrdered className="w-3.5 h-3.5 text-magenta-500" />
            <h2 className="text-[10px] sm:text-xs font-bold text-slate-100 uppercase tracking-widest italic">Ranking</h2>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 max-h-[90px] lg:max-h-none">
            {isLoadingRanking ? (
              <div className="flex flex-col items-center justify-center py-4">
                <p className="text-[8px] font-mono text-cyan-400 uppercase tracking-widest animate-pulse">Sincronizando...</p>
              </div>
            ) : ranking.length > 0 ? (
              ranking.map((entry, index) => (
                <div
                  key={index}
                  className="group flex flex-col p-1 bg-slate-800/20 border border-slate-700/30 rounded hover:border-magenta-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className={`font-mono font-black italic text-[10px] ${index < 3 ? 'text-cyan-400' : 'text-slate-600'}`}>
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[8px] sm:text-[9px] font-bold text-slate-100 uppercase truncate max-w-[50px] sm:max-w-[70px]">{entry.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] sm:text-[10px] font-black text-magenta-500 leading-none">{entry.score}</p>
                    </div>
                  </div>
                  {entry.difficulty && (
                    <div className="flex justify-start ml-3">
                      <p className="text-[6px] sm:text-[7px] text-slate-500 uppercase tracking-wider">{entry.difficulty}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-2 border border-dashed border-slate-800 rounded">
                <p className="text-[7px] font-mono text-slate-600 uppercase">Vacío</p>
              </div>
            )}
          </div>
        </motion.aside>

        {/* Game Area */}
        <main className="flex-1 flex flex-col items-center justify-center w-full h-full p-1 sm:p-2 lg:p-4 overflow-hidden relative bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:40px_40px]">
          <div className="w-full max-w-[800px] flex justify-between items-end mb-2 px-2 z-10 glass rounded-xl p-2">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-widest text-white/40 font-mono">Current Logic</span>
              <div className="flex gap-4 text-xs font-mono font-bold text-cyan-400">
                <span>LEVEL: {gameState.level.toString().padStart(2, '0')}</span>
                <span className="text-yellow-400">{'★'.repeat(gameState.lives)}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-magenta-400 font-mono text-[10px] leading-none mb-1">
                <Trophy size={10} />
                <span>BEST: {gameState.highScore.toLocaleString()}</span>
              </div>
              <div className="text-lg font-bold font-mono text-cyan-400 leading-none">
                {gameState.score.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="relative group neon-border-cyan rounded-lg overflow-hidden glass z-10">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onTouchMove={handleTouchMove}
              className="max-w-full h-auto cursor-none touch-none"
            />

            {/* Menu Overlay */}
            <AnimatePresence>
              {gameState.status === 'menu' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10"
                >
                  <motion.h2 
                    initial={{ y: 20 }}
                    animate={{ y: 0 }}
                    className="text-6xl font-bold mb-8 text-cyan-400 text-center"
                    style={{ textShadow: '0 0 10px rgba(34,211,238,0.5)' }}
                  >
                    START ENGINE
                  </motion.h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startGame}
                    className="group relative px-8 py-4 bg-transparent border-2 border-cyan-400 text-cyan-400 font-bold text-xl rounded-full overflow-hidden transition-all hover:bg-cyan-400 hover:text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                  >
                    <div className="flex items-center gap-3">
                      <Play className="fill-current" />
                      EJECUTAR PROGRAMA
                    </div>
                  </motion.button>
                  
                  <div className="mt-12 flex gap-8 text-neutral-500 font-mono text-sm">
                    <div className="flex items-center gap-2 text-cyan-400/60">
                      <Keyboard size={16} />
                      <span>A/D · ARROWS</span>
                    </div>
                    <div className="flex items-center gap-2 text-magenta-400/60">
                      <MousePointer2 size={16} />
                      <span>TOUCH / SWIPE</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Game Over Overlay */}
              {gameState.status === 'gameover' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-10"
                >
                  <h2 className="text-7xl font-bold mb-2 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">CONEXIÓN PERDIDA</h2>
                  <p className="text-xl font-mono text-neutral-400 mb-12">PLAYER_ELIMINATED: SCORE_{gameState.score}</p>
                  <button
                    onClick={startGame}
                    className="flex items-center gap-3 px-10 py-5 bg-red-500 text-black font-bold text-2xl rounded-sm hover:bg-red-400 transition-colors shadow-none"
                  >
                    <RotateCcw /> REINICIALIZAR
                  </button>
                </motion.div>
              )}

              {/* victory Overlay */}
              {gameState.status === 'victory' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-10"
                >
                  <h2 className="text-7xl font-bold mb-2 text-cyan-400" style={{ textShadow: '0 0 10px rgba(34,211,238,0.5)' }}>NIVEL COMPLETADO</h2>
                  <p className="text-xl font-mono text-neutral-400 mb-12">ACCESO CONCEDIDO: SECTOR_{gameState.level}</p>
                  <button
                    onClick={restartLevel}
                    className="flex items-center gap-3 px-10 py-5 bg-cyan-400 text-black font-bold text-2xl rounded-sm hover:bg-cyan-300 transition-colors"
                  >
                    <Play className="fill-current" /> SIGUIENTE FASE
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Desktop & Mobile Music Player */}
      <div className="w-full flex-shrink-0 bg-[#0c0c0e]/95 backdrop-blur-md border-t border-slate-900 z-50 sm:fixed sm:bottom-4 sm:right-4 sm:w-72 lg:w-80 sm:bg-transparent sm:backdrop-blur-none sm:border-none sm:flex-shrink">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
           className="max-w-md mx-auto sm:max-w-none"
        >
          <NeonMusicPlayer playLoseTrack={gameState.status === 'gameover'} isGameStarted={gameState.status === 'playing'} />
        </motion.div>
      </div>

      {/* Noise Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
    </div>
  );
}
