import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SECRET = '2431';

function FloatingHearts() {
  const hearts = Array.from({ length: 10 }).map((_, i) => ({ id: i, left: Math.random() * 100, delay: Math.random() * 5 }));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute text-pink-400 opacity-80 animate-float-heart"
          style={{ left: `${h.left}%`, bottom: '-10%', animationDelay: `${h.delay}s` }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-lg">
            <path d="M12 21s-7-4.35-10-7.12C-1.1 10.9 2 6 6 7.5 8.2 8.3 9 10 12 12c3-2 3.8-3.7 6-4.5 4-1.5 7.1 3.4 4 6.38C19 16.65 12 21 12 21z"/>
          </svg>
        </div>
      ))}
    </div>
  );
}

export default function Surprise() {
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [glow, setGlow] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const PHOTO_KEY = 'surprisePhoto';

  useEffect(() => {
    if (code.length >= SECRET.length) {
      if (code === SECRET) {
        setUnlocked(true);
        setError('');
      } else {
        setError('Wrong code — try again 💕');
      }
      setCode('');
    }
  }, [code]);

  // load saved photo from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PHOTO_KEY);
      if (saved) setPhoto(saved);
    } catch (e) {
      // ignore
    }
  }, []);

  // auto-unlock if navigated with state
  useEffect(() => {
    const anyState = (location as any).state;
    if (anyState && anyState.autoUnlock) {
      setUnlocked(true);
    }
  }, [location]);

  // allow typing digits / backspace when on page
  // Removed global on-page key listeners; keypad UI still works for entering code.

  // paste support (image paste)
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.type.startsWith('image/')) {
          const blob = it.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              const result = String(reader.result || '');
              setPhoto(result);
              try { localStorage.setItem(PHOTO_KEY, result); } catch (e) {}
            };
            reader.readAsDataURL(blob);
            e.preventDefault();
            break;
          }
        }
      }
    }

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error('Failed to read file'));
      r.onload = () => resolve(String(r.result || ''));
      r.readAsDataURL(file);
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = await readFileAsDataUrl(f);
      setPhoto(data);
      try { localStorage.setItem(PHOTO_KEY, data); } catch (err) {}
    } catch (err) {
      console.error('Failed to load image', err);
    }
    // reset input so same file can be picked again
    e.currentTarget.value = '';
  }

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

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-pink-50 via-white to-rose-50 p-6 relative overflow-hidden">
      <FloatingHearts />

      <div className="max-w-4xl w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-6 md:p-10">
        {!unlocked ? (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold text-pink-600">A little secret…</h2>
              <p className="mt-2 text-sm text-gray-600">Enter the secret code to reveal a surprise made just for you 💖</p>

              <div className="mt-6 inline-block px-6 py-4 bg-pink-50 rounded-xl shadow-inner">
                <div className="flex items-center justify-center gap-3">
                  {Array.from({ length: SECRET.length }).map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-lg bg-white border border-pink-200 flex items-center justify-center text-lg font-semibold text-pink-600">
                      {code[i] || '•'}
                    </div>
                  ))}
                </div>
                {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 max-w-xs mx-auto md:mx-0">
                {[1,2,3,4,5,6,7,8,9,'',0,'←'].map((d, idx) => (
                  <button
                    key={idx}
                    onClick={() => (d === '←' ? backspace() : d === '' ? null : press(String(d)))}
                    className="bg-pink-100 hover:bg-pink-200 active:scale-95 transition rounded-lg py-3 text-xl font-medium text-pink-700"
                    aria-label={`key-${d}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full md:w-80 text-center">
              <div className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-gradient-to-tr from-pink-300 to-rose-400 shadow-xl">
                <svg className="w-20 h-20 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-10-7.12C-1.1 10.9 2 6 6 7.5 8.2 8.3 9 10 12 12c3-2 3.8-3.7 6-4.5 4-1.5 7.1 3.4 4 6.38C19 16.65 12 21 12 21z"/></svg>
              </div>
              <p className="mt-4 text-sm text-gray-600">Tap the hearts while you wait 💞</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-4xl font-extrabold text-rose-600">For My Princess <span className="text-xl">❤️</span></h1>
              <div className="flex gap-3">
                <button onClick={() => setGlow((g) => !g)} className={`px-4 py-2 rounded-full text-white ${glow ? 'bg-rose-500 shadow-glow' : 'bg-pink-500 hover:bg-pink-600'}`}>
                  {glow ? 'Glowing ♥' : 'Glow ♥'}
                </button>
                <button onClick={() => navigate('/')} className="px-4 py-2 rounded-lg border border-pink-200 text-pink-600 bg-white">Close</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="rounded-xl overflow-hidden shadow-lg bg-white">
                <img src={photo || "https://via.placeholder.com/900x600?text=Our+Photo"} alt="Our special photo" className="w-full h-64 object-cover md:h-full"/>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-pink-50 rounded-xl border border-pink-100 relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-40 h-40 bg-gradient-to-br from-pink-200 to-rose-300 rounded-full opacity-40 filter blur-3xl"></div>
                  <h3 className="text-xl font-semibold text-rose-600">A love note</h3>
                  <p className="mt-3 text-gray-700">My dearest, every moment with you is a treasure. You make my heart race and my days brighter. Thank you for being my everything. Forever and always, yours.</p>

                  <div className="mt-4 flex gap-2">
                    <span className="text-2xl">✨</span>
                    <span className="text-2xl">💖</span>
                    <span className="text-2xl">🌸</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-rose-600 mb-2">Memory Cards</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white border border-pink-100 shadow-sm p-3 flex flex-col items-center justify-center h-28">
                      <div className="text-sm text-gray-500">Photo placeholder</div>
                    </div>
                    <div className="rounded-lg bg-white border border-pink-100 shadow-sm p-3 flex items-center justify-center h-28">
                      <button onClick={openFilePicker} className="text-pink-600 font-medium">Add photo</button>
                      <input ref={fileInputRef} onChange={handleFileChange} type="file" accept="image/*" className="hidden" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
