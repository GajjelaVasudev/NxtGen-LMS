import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SECRET = '2431';

function PetalsBackground() {
  const petals = Array.from({ length: 12 }).map((_, i) => ({ id: i, left: Math.random() * 100, delay: Math.random() * 5, spin: Math.random() * 360 }));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {petals.map(p => (
        <div key={p.id} className="petal" style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, transform: `rotate(${p.spin}deg)` }} />
      ))}
    </div>
  );
}

export default function Surprise() {
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();

  // Note: do not auto-unlock based on route state. The surprise screen
  // should open the keypad and require the secret code (2431).

  useEffect(() => {
    if (code.length === SECRET.length) {
      if (code === SECRET) {
        setUnlocked(true);
        setError('');
      } else {
        setError('Wrong code — try again');
      }
      setCode('');
    }
  }, [code]);

  function press(d: string) {
    if (unlocked) return;
    setError('');
    setCode((c) => (c + d).slice(0, SECRET.length));
  }

  function backspace() {
    if (unlocked) return;
    setCode((c) => c.slice(0, -1));
    setError('');
  }

  // enable keyboard input for digits and backspace
  useKeypadKeyboard(press, backspace);

  const message = `You are my bangaram Kannu , Love You so much ra 💖\nNijanga I Love You So Much Kannamaaaa !!!`;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-pink-50 via-white to-rose-50 p-6 relative overflow-hidden">
      <PetalsBackground />

      <div className="max-w-3xl w-full bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-10 text-center">
        {!unlocked ? (
          <div>
            <h2 className="text-3xl font-bold text-rose-600">A little secret…</h2>
            <p className="mt-2 text-sm text-gray-600">Enter the secret code to reveal a surprise made just for you 💖</p>

            <div className="mt-6 inline-block px-6 py-4 bg-rose-50 rounded-xl shadow-inner">
              <div className="flex items-center justify-center gap-3">
                {Array.from({ length: SECRET.length }).map((_, i) => (
                  <div key={i} className="w-12 h-12 rounded-lg bg-white border border-rose-100 flex items-center justify-center text-lg font-semibold text-rose-600">
                    {code[i] || '•'}
                  </div>
                ))}
              </div>
              {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 max-w-xs mx-auto md:mx-0" role="group" aria-label="keypad">
              {[1,2,3,4,5,6,7,8,9,'',0,'←'].map((d, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => (d === '←' ? backspace() : d === '' ? null : press(String(d)))}
                  className="bg-rose-100 hover:bg-rose-200 active:scale-95 transition rounded-lg py-3 text-xl font-medium text-rose-700"
                  aria-label={`key-${d}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-extrabold text-rose-600">For My Princess <span aria-hidden>❤️</span></h1>

            <div className="mt-4 p-6 bg-white rounded-xl shadow-sm">
              <p className="love-message text-lg md:text-2xl leading-relaxed mx-auto max-w-2xl">{message}</p>
            </div>

            <div className="mt-4">
              <img src="https://via.placeholder.com/900x600?text=Romantic+Photo" alt="Romantic" className="w-full max-w-xl mx-auto rounded-lg shadow-lg fade-in-image" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

  // add keyboard support at module-level to improve UX
  function useKeypadKeyboard(handler: (k: string) => void, backHandler: () => void) {
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (/^[0-9]$/.test(e.key)) {
          handler(e.key);
        } else if (e.key === 'Backspace') {
          backHandler();
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [handler, backHandler]);
  }
