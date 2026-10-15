'use client';

/**
 * UniQR — Malaysian super-wallet & expense aggregator (single-file Next.js app)
 *
 * Everything lives in this one file: UI, modals, QR scanner, AI support chat,
 * admin panel and Supabase sync.
 *
 *  • Supabase env vars present  -> live data + realtime updates
 *  • Env vars missing / tables missing -> automatic fallback to local state (no crashes)
 *
 * Needs (package.json): next, react, react-dom, @supabase/supabase-js, html5-qrcode
 * Styling: Tailwind via CDN (injected below) — no config files required.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

/* ------------------------------------------------------------------ */
/*  Supabase (inline init, null when env vars are absent)              */
/* ------------------------------------------------------------------ */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const DEMO_ID = '00000000-0000-4000-8000-000000000001'; // same id as supabase_setup.sql

/* ------------------------------------------------------------------ */
/*  Seed data (mirrors the original UniQR prototype)                   */
/* ------------------------------------------------------------------ */
const SEED_USER = {
  name: 'Amirul Zulkifli',
  occupation: 'Junior Data Analyst (Subang Jaya)',
  cashback: 42.8,
  points: 1250,
  isPro: false,
};

const SEED_WALLETS = [
  { id: 'TnG', code: 'TnG', name: "Touch 'n Go eWallet", balance: 245.5, color: '#1f5fff', isDefault: true },
  { id: 'GP', code: 'GP', name: 'GrabPay', balance: 112.2, color: '#00a35a', isDefault: false },
  { id: 'SP', code: 'SP', name: 'ShopeePay', balance: 84.1, color: '#ee4d2d', isDefault: false },
  { id: 'MAE', code: 'MAE', name: 'MAE by Maybank2u', balance: 650.0, color: '#f5b400', isDefault: false },
];

const HOUR = 3600 * 1000;
const seedTransactions = () => {
  const now = Date.now();
  return [
    { id: 's1', merchant: 'Zus Coffee Subang', amount: 14.5, wallet: "Touch 'n Go eWallet", category: 'F&B', item: 'Zus Signature Aren Latte & Butter Croissant', qty: 2, cashback: 0.36, createdAt: new Date(now - 2 * HOUR).toISOString() },
    { id: 's2', merchant: 'LRT RapidKL Pass', amount: 50.0, wallet: 'MAE by Maybank2u', category: 'Transport', item: 'RapidKL Monthly Commuter Pass', qty: 1, cashback: 1.25, createdAt: new Date(now - 20 * HOUR).toISOString() },
    { id: 's3', merchant: 'Village Grocer SS15', amount: 124.9, wallet: 'GrabPay', category: 'Groceries', item: 'Organic Milk, Avocados & Sourdough Bread', qty: 5, cashback: 3.12, createdAt: new Date(now - 96 * HOUR).toISOString() },
  ];
};

const seedDisputes = () => [
  { id: 'DSP-8821', user: 'Amirul Zulkifli', issue: 'Gateway settlement timeout during peak hour transaction at Zus Coffee (RM 14.50)', status: 'AI Handled & Refunded', createdAt: new Date().toISOString() },
];

const MERCHANTS = [
  { merchant: 'Zus Coffee Subang', amount: 14.5, category: 'F&B', item: 'Zus Signature Aren Latte & Butter Croissant', qty: 2, label: 'Zus Coffee Subang Jaya', mark: 'Z' },
  { merchant: 'Village Park Nasi Lemak', amount: 22.0, category: 'F&B', item: 'Nasi Lemak Ayam Goreng & Teh Tarik', qty: 2, label: 'Village Park Damansara', mark: 'V' },
  { merchant: 'LRT RapidKL Pass', amount: 50.0, category: 'Transport', item: 'RapidKL Monthly Commuter Pass', qty: 1, label: 'RapidKL Monthly Pass', mark: 'R' },
];

const REWARDS = [
  { title: 'Zus Coffee 1-for-1 Pass', cost: 350 },
  { title: 'RapidKL Free Weekend Pass', cost: 600 },
  { title: 'GSC / TGV Movie Ticket 50% Off', cost: 450 },
];

const PRO_FORMA = [
  { m: 'Month 1', users: '500', subs: '50', tx: 'RM 2,700', sub: 'RM 495', rev: 'RM 3,195', cost: 'RM 38,103', net: '-RM 34,908', pos: false },
  { m: 'Month 3', users: '845', subs: '84', tx: 'RM 4,563', sub: 'RM 832', rev: 'RM 5,395', cost: 'RM 38,172', net: '-RM 32,777', pos: false },
  { m: 'Month 6', users: '1,856', subs: '185', tx: 'RM 10,022', sub: 'RM 1,832', rev: 'RM 11,854', cost: 'RM 38,375', net: '-RM 26,521', pos: false },
  { m: 'Month 9', users: '4,078', subs: '407', tx: 'RM 22,021', sub: 'RM 4,029', rev: 'RM 26,051', cost: 'RM 38,818', net: '-RM 12,768', pos: false },
  { m: 'Month 11 (Break-Even)', users: '6,892', subs: '689', tx: 'RM 37,217', sub: 'RM 6,821', rev: 'RM 44,038', cost: 'RM 39,381', net: '+RM 4,657', pos: true, hi: true },
  { m: 'Month 12', users: '8,960', subs: '896', tx: 'RM 48,384', sub: 'RM 8,870', rev: 'RM 57,254', cost: 'RM 39,795', net: '+RM 17,459', pos: true, hi: true },
];

const SPEND = {
  day: { total: '46.50', needs: '30.00', wants: '16.50', save: '0.00' },
  month: { total: '1,245.50', needs: '622.75', wants: '373.65', save: '249.10' },
  year: { total: '14,946.00', needs: '7,473.00', wants: '4,483.80', save: '2,989.20' },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const rm = (n) =>
  'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'l' + Date.now() + Math.random().toString(16).slice(2);

function fmtWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60 * 1000) return 'Just now';
  const time = d.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' });
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  if (d >= startToday) return `Today, ${time}`;
  if (d >= new Date(startToday.getTime() - 24 * HOUR)) return `Yesterday, ${time}`;
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

const initials = (name) =>
  (name || 'U').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();

// DuitNow / EMVCo merchant QR payload parser (tag 59 = merchant, 54 = amount)
function parseTlv(s) {
  const out = {};
  let i = 0;
  while (i + 4 <= s.length) {
    const tag = s.slice(i, i + 2);
    const len = parseInt(s.slice(i + 2, i + 4), 10);
    if (Number.isNaN(len)) return null;
    const val = s.slice(i + 4, i + 4 + len);
    if (val.length < len) return null;
    out[tag] = val;
    i += 4 + len;
  }
  return out;
}
function guessCategory(text) {
  const t = text.toLowerCase();
  if (/(coffee|cafe|café|restaurant|nasi|mamak|kopi|food|bistro|bakery|tea)/.test(t)) return 'F&B';
  if (/(lrt|mrt|rapid|grab|toll|parking|petrol|shell|petronas|touch)/.test(t)) return 'Transport';
  if (/(grocer|mart|market|mall|jaya|aeon|lotus|tesco)/.test(t)) return 'Groceries';
  return 'Other';
}
function parseQr(text) {
  const t = (text || '').trim();
  if (t.startsWith('000201')) {
    const map = parseTlv(t);
    if (map && map['59']) {
      const amt = parseFloat(map['54']);
      return { merchant: map['59'], amount: Number.isFinite(amt) ? amt : 0, category: guessCategory(map['59']), item: 'DuitNow QR payment', qty: 1, fromQr: true };
    }
  }
  return { merchant: t.length > 42 ? t.slice(0, 42) + '…' : t || 'Unknown merchant', amount: 0, category: guessCategory(t), item: 'QR payment', qty: 1, fromQr: true, unknown: true };
}

/* ------------------------------------------------------------------ */
/*  Inline icons (no icon-font dependency, always crisp)               */
/* ------------------------------------------------------------------ */
const ICONS = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  scan: <><path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" /><path d="M8 12h8" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" /><path d="M16 4.5a3.5 3.5 0 010 7M18 14.8c2.4.6 4 2.3 4 5.2" /></>,
  headset: <><path d="M4 14v-2a8 8 0 0116 0v2" /><rect x="2" y="14" width="4" height="6" rx="1.5" /><rect x="18" y="14" width="4" height="6" rx="1.5" /><path d="M20 20c0 1.5-2 2-5 2" /></>,
  star: <path d="M12 2l3 7 7 .5-5.5 4.5L18 22l-6-4-6 4 1.5-8L2 9.5 9 9z" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12l5 5 9-10" />,
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  bell: <path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 004 0" />,
  camera: <><path d="M3 8h4l2-3h6l2 3h4v12H3z" /><circle cx="12" cy="13" r="3.5" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16l-5-5-8 8" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  bot: <><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4" /><circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" /></>,
  refresh: <path d="M20 11a8 8 0 00-14-4M4 4v4h4M4 13a8 8 0 0014 4M20 20v-4h-4" />,
  wallet: <><path d="M3 7a2 2 0 012-2h13v4" /><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="16.5" cy="13.5" r="1" /></>,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
};
function Icon({ name, className = 'w-5 h-5', strokeWidth = 1.8 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Small shared UI                                                    */
/* ------------------------------------------------------------------ */
function Sheet({ title, onClose, children, size = 'md' }) {
  const width = size === 'lg' ? 'sm:max-w-lg' : 'sm:max-w-sm';
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className={`w-full ${width} max-h-[90dvh] overflow-y-auto bg-white text-[#14161a] rounded-t-[28px] sm:rounded-[28px] p-5 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3">
          <h3 className="font-extrabold text-[15px]">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-[#f2f3f6] grid place-items-center text-[#14161a]">
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const Card = ({ className = '', children, ...rest }) => (
  <div className={`bg-white rounded-3xl shadow-[0_8px_30px_rgba(20,22,26,0.06)] ${className}`} {...rest}>
    {children}
  </div>
);

const PillButton = ({ className = '', children, ...rest }) => (
  <button
    className={`rounded-full bg-[#1c1d22] text-white font-bold text-[13px] py-3 px-5 active:scale-[0.98] transition disabled:opacity-40 ${className}`}
    {...rest}
  >
    {children}
  </button>
);

/* ------------------------------------------------------------------ */
/*  Stacked wallet cards (reference-style card stack)                  */
/* ------------------------------------------------------------------ */
function WalletStack({ wallets, idx, onNext, total }) {
  const n = wallets.length;
  if (!n) return null;
  const layers = [0, 1, 2].filter((i) => i < n).map((i) => ({ w: wallets[(idx + i) % n], i }));
  return (
    <div>
      <div className="relative h-[196px]">
        {[...layers].reverse().map(({ w, i }) => {
          const front = i === 0;
          return (
            <div
              key={w.id}
              onClick={front ? onNext : undefined}
              className={`absolute left-0 right-0 top-0 h-[152px] rounded-[26px] overflow-hidden text-white transition-all duration-300 ${front ? 'cursor-pointer shadow-[0_18px_40px_rgba(0,0,0,0.28)]' : ''}`}
              style={{
                transform: `translateY(${i * 16}px) scale(${1 - i * 0.05})`,
                zIndex: 10 - i,
                background: front
                  ? `radial-gradient(120% 120% at 100% 0%, ${w.color}55 0%, transparent 55%), linear-gradient(135deg,#34363d 0%,#15161a 100%)`
                  : `linear-gradient(135deg, ${w.color}, #1a1b1f 85%)`,
                opacity: front ? 1 : 0.9 - i * 0.12,
              }}
            >
              {front && (
                <div className="h-full p-5 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] text-white/60 font-semibold">Current Balance · {w.name}</div>
                      <div className="text-[30px] leading-tight font-extrabold tracking-tight mt-0.5">{rm(w.balance)}</div>
                    </div>
                    <div className="flex -space-x-2 shrink-0">
                      <span className="w-6 h-6 rounded-full opacity-90" style={{ background: w.color }} />
                      <span className="w-6 h-6 rounded-full bg-[#ffb000]/90" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] text-white/50">All wallets · {n}</div>
                      <div className="text-[13px] font-bold">{rm(total)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-white/50">{w.isDefault ? 'Primary' : 'Linked'}</div>
                      <div className="text-[12px] font-bold tracking-widest">{w.code}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-1.5 mt-1">
        {wallets.map((w, i) => (
          <span key={w.id} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-[#1c1d22]' : 'w-1.5 bg-[#c7c9d1]'}`} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Camera scanner (html5-qrcode, loaded on demand)                    */
/* ------------------------------------------------------------------ */
function ScannerPane({ onDecode }) {
  const [err, setErr] = useState('');
  const doneRef = useRef(false);
  const cbRef = useRef(onDecode);
  cbRef.current = onDecode;

  useEffect(() => {
    let cancelled = false;
    let scanner = null;
    let started = false;

    (async () => {
      try {
        if (typeof window !== 'undefined' && !window.isSecureContext) {
          throw Object.assign(new Error('insecure'), { name: 'InsecureContext' });
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw Object.assign(new Error('unsupported'), { name: 'NotSupportedError' });
        }
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        scanner = new Html5Qrcode('uniqr-reader', { verbose: false });
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (w, h) => {
              const s = Math.floor(Math.min(w, h) * 0.72);
              return { width: s, height: s };
            },
          },
          (text) => {
            if (doneRef.current || cancelled) return;
            doneRef.current = true;
            cbRef.current(text);
          },
          () => {}
        );
        started = true;
        if (cancelled) {
          await scanner.stop().catch(() => {});
          try { scanner.clear(); } catch (e) {}
        }
      } catch (e) {
        if (cancelled) return;
        const name = (e && e.name) || '';
        const msg = String((e && e.message) || e || '');
        if (name === 'InsecureContext') setErr('Camera needs a secure (https) connection. Open the Vercel link, or use a sample merchant below.');
        else if (name === 'NotAllowedError' || /permission|denied/i.test(msg)) setErr('Camera permission was blocked. Allow camera access in your browser settings and reopen the scanner — or use a sample merchant below.');
        else if (name === 'NotFoundError' || /no camera|not found|requested device/i.test(msg)) setErr('No camera was found on this device. Upload a QR image or use a sample merchant below.');
        else setErr('Could not start the camera. Upload a QR image or use a sample merchant below.');
      }
    })();

    return () => {
      cancelled = true;
      if (scanner && started) {
        scanner.stop().then(() => { try { scanner.clear(); } catch (e) {} }).catch(() => {});
      }
    };
  }, []);

  return (
    <div className="relative w-full h-64 rounded-3xl bg-black overflow-hidden">
      <div id="uniqr-reader" className="w-full h-full" />
      {err ? (
        <div className="absolute inset-0 grid place-items-center p-5 text-center bg-[#1c1d22] text-white">
          <div>
            <Icon name="camera" className="w-8 h-8 mx-auto mb-2 text-white/60" />
            <p className="text-[12px] leading-relaxed text-white/80">{err}</p>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="w-[62%] aspect-square rounded-3xl border-2 border-white/70" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main app                                                           */
/* ------------------------------------------------------------------ */
export default function UniQRApp() {
  /* ---- boot: Tailwind CDN + font ---- */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.title = 'UniQR — Malaysian Super-Wallet';
    const finish = () => setReady(true);
    if (!document.getElementById('uniqr-font')) {
      const l = document.createElement('link');
      l.id = 'uniqr-font';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(l);
    }
    if (window.tailwind) { finish(); return undefined; }
    const s = document.createElement('script');
    s.src = 'https://cdn.tailwindcss.com/3.4.17';
    s.async = true;
    s.onload = () => setTimeout(finish, 60);
    s.onerror = finish;
    document.head.appendChild(s);
    const t = setTimeout(finish, 4000);
    return () => clearTimeout(t);
  }, []);

  /* ---- app state ---- */
  const [mode, setMode] = useState(sb ? 'connecting' : 'local'); // connecting | live | local | error
  const [view, setView] = useState('consumer');
  const [tab, setTab] = useState('home');
  const [range, setRange] = useState('month');
  const [user, setUser] = useState(SEED_USER);
  const [wallets, setWallets] = useState(SEED_WALLETS);
  const [txs, setTxs] = useState(seedTransactions);
  const [disputes, setDisputes] = useState(seedDisputes);
  const [cardIdx, setCardIdx] = useState(0);
  const [toast, setToast] = useState(null);
  const [clock, setClock] = useState('');
  const [chased, setChased] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanStep, setScanStep] = useState('scan'); // scan | confirm | done
  const [scanData, setScanData] = useState(null);
  const [scanAmount, setScanAmount] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [paying, setPaying] = useState(false);

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState([{ from: 'ai', text: 'Hello Amirul! I am your 24/7 UniQR AI assistant. How can I help you with your wallets, DuitNow routing, or transaction disputes today? 😊' }]);
  const [chatInput, setChatInput] = useState('');
  const [typing, setTyping] = useState(false);
  const chatEnd = useRef(null);

  const [sheet, setSheet] = useState(null); // { type: 'topup' | 'transfer' }
  const [sheetAmount, setSheetAmount] = useState('');
  const [sheetWallet, setSheetWallet] = useState('');
  const [sheetTo, setSheetTo] = useState('');
  const [sheetError, setSheetError] = useState('');

  const live = useRef({});
  live.current = { user, wallets, txs, disputes };
  const refunded = useRef(new Set());
  const toastTimer = useRef(null);

  const notify = useCallback((text, kind = 'success') => {
    setToast({ text, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  /* ---- status-bar clock ---- */
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, []);

  /* ---- Supabase: load + realtime ---- */
  const load = useCallback(async () => {
    if (!sb) return;
    try {
      const [p, w, t, d] = await Promise.all([
        sb.from('profiles').select('*').eq('id', DEMO_ID).maybeSingle(),
        sb.from('wallets').select('*').eq('profile_id', DEMO_ID).order('sort_order', { ascending: true }),
        sb.from('transactions').select('*').eq('profile_id', DEMO_ID).order('created_at', { ascending: false }).limit(50),
        sb.from('disputes').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      const failed = [p, w, t, d].find((r) => r.error);
      if (failed) throw failed.error;
      if (!p.data || !w.data || !w.data.length) throw new Error('Demo profile not found — run supabase_setup.sql');

      setUser({ name: p.data.name, occupation: p.data.occupation || '', cashback: Number(p.data.cashback), points: p.data.points, isPro: !!p.data.is_pro });
      setWallets(w.data.map((r) => ({ id: r.id, code: r.code, name: r.name, balance: Number(r.balance), color: r.color, isDefault: !!r.is_default })));
      setTxs(t.data.map((r) => ({ id: r.id, merchant: r.merchant, amount: Number(r.amount), wallet: r.wallet_name, category: r.category, item: r.item, qty: r.qty, cashback: Number(r.cashback), createdAt: r.created_at })));
      setDisputes(d.data.map((r) => ({ id: r.id, user: r.user_name, issue: r.issue, status: r.status, createdAt: r.created_at })));
      setMode('live');
    } catch (e) {
      console.warn('[UniQR] Supabase unavailable, using local state:', e && e.message ? e.message : e);
      setMode('error');
    }
  }, []);

  useEffect(() => {
    if (!sb) return undefined;
    load();
    let timer = null;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 350);
    };
    let channel = null;
    try {
      channel = sb
        .channel('uniqr-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, refresh)
        .subscribe();
    } catch (e) {
      console.warn('[UniQR] realtime unavailable', e);
    }
    return () => {
      clearTimeout(timer);
      if (channel) sb.removeChannel(channel);
    };
  }, [load]);

  /* run a Supabase write; never throws */
  const sync = useCallback(
    async (fn) => {
      if (!sb || mode === 'error') return true;
      try {
        const res = await fn(sb);
        const list = Array.isArray(res) ? res : [res];
        const bad = list.find((r) => r && r.error);
        if (bad) throw bad.error;
        return true;
      } catch (e) {
        console.warn('[UniQR] Supabase write failed', e);
        notify('Saved on this device only — Supabase sync failed.', 'warning');
        return false;
      }
    },
    [mode, notify]
  );

  /* ---- derived ---- */
  const total = useMemo(() => round2(wallets.reduce((a, w) => a + w.balance, 0)), [wallets]);
  const openTickets = disputes.filter((d) => !/resolved|refunded/i.test(d.status)).length;

  /* ---- actions ---- */
  const persistProfile = (next) => sync((c) => c.from('profiles').update({ cashback: next.cashback, points: next.points, is_pro: next.isPro }).eq('id', DEMO_ID));

  const pay = async ({ merchant, amount, category, item, qty = 1, rewards = true }) => {
    const { user: u, wallets: ws } = live.current;
    const amt = round2(amount);
    if (!(amt > 0)) return { ok: false, error: 'Enter a valid amount.' };
    const w =
      ws.find((x) => x.isDefault && x.balance >= amt) ||
      [...ws].sort((a, b) => b.balance - a.balance).find((x) => x.balance >= amt);
    if (!w) return { ok: false, error: 'Insufficient balance across all linked wallets.' };

    const mult = u.isPro ? 2 : 1;
    const cashback = rewards ? round2(amt * 0.025 * mult) : 0;
    const points = rewards ? Math.floor(amt * 2 * mult) : 0;
    const newBal = round2(w.balance - amt);
    const nextUser = { ...u, cashback: round2(u.cashback + cashback), points: u.points + points };
    const tx = { id: uid(), merchant, amount: amt, wallet: w.name, category, item, qty, cashback, createdAt: new Date().toISOString() };

    setWallets((cur) => cur.map((x) => (x.id === w.id ? { ...x, balance: newBal } : x)));
    setUser(nextUser);
    setTxs((cur) => [tx, ...cur]);

    await sync((c) =>
      Promise.all([
        c.from('wallets').update({ balance: newBal }).eq('id', w.id),
        c.from('profiles').update({ cashback: nextUser.cashback, points: nextUser.points }).eq('id', DEMO_ID),
        c.from('transactions').insert({ profile_id: DEMO_ID, merchant, amount: amt, wallet_name: w.name, category, item, qty, cashback }),
      ])
    );
    return { ok: true, wallet: w, cashback, amount: amt, merchant };
  };

  const creditWallet = async (walletId, amount) => {
    const w = live.current.wallets.find((x) => x.id === walletId) || live.current.wallets.find((x) => x.isDefault) || live.current.wallets[0];
    if (!w) return null;
    const newBal = round2(w.balance + amount);
    setWallets((cur) => cur.map((x) => (x.id === w.id ? { ...x, balance: newBal } : x)));
    await sync((c) => c.from('wallets').update({ balance: newBal }).eq('id', w.id));
    return w;
  };

  const createDispute = async (issue, status) => {
    const d = { id: 'DSP-' + Math.floor(1000 + Math.random() * 9000), user: live.current.user.name, issue, status, createdAt: new Date().toISOString() };
    setDisputes((cur) => [d, ...cur]);
    await sync((c) => c.from('disputes').insert({ id: d.id, profile_id: DEMO_ID, user_name: d.user, issue: d.issue, status: d.status }));
    return d;
  };

  const setDisputeStatus = async (id, status) => {
    setDisputes((cur) => cur.map((d) => (d.id === id ? { ...d, status } : d)));
    await sync((c) => c.from('disputes').update({ status }).eq('id', id));
    notify(`${id} marked “${status}”.`);
  };

  const togglePro = async () => {
    const next = { ...live.current.user, isPro: !live.current.user.isPro };
    setUser(next);
    await persistProfile(next);
    notify(next.isPro ? 'Account upgraded to Pro successfully!' : 'Account switched to Standard.');
  };

  const withdrawCash = async () => {
    const u = live.current.user;
    const fee = u.isPro ? 0 : 0.5;
    if (u.cashback <= fee) return notify(u.cashback <= 0 ? 'No cashback available.' : 'Cashback must exceed the RM 0.50 fee.', 'warning');
    const amt = round2(u.cashback - fee);
    const next = { ...u, cashback: 0 };
    setUser(next);
    await persistProfile(next);
    notify(`Transferred ${rm(amt)} to your bank ${fee > 0 ? '(RM 0.50 fee)' : '(Pro zero fee)'}.`);
  };

  const redeemReward = async (title, cost) => {
    const u = live.current.user;
    if (u.points < cost) return notify('Insufficient reward points!', 'warning');
    const next = { ...u, points: u.points - cost };
    setUser(next);
    await persistProfile(next);
    notify(`Redeemed: ${title}!`);
  };

  const claimBirthday = async () => {
    const u = live.current.user;
    const next = { ...u, cashback: round2(u.cashback + 50) };
    setUser(next);
    await persistProfile(next);
    notify('RM 50.00 birthday cashback deposited!');
  };

  const resetDemo = async () => {
    const t = seedTransactions();
    const d = seedDisputes();
    setUser(SEED_USER);
    setWallets(SEED_WALLETS.map((w) => ({ ...w })));
    setTxs(t);
    setDisputes(d);
    setCardIdx(0);
    refunded.current = new Set();
    if (sb && mode !== 'error') {
      const ok = await sync(async (c) => {
        const out = [];
        out.push(await c.from('transactions').delete().eq('profile_id', DEMO_ID));
        out.push(await c.from('disputes').delete().eq('profile_id', DEMO_ID));
        out.push(await c.from('profiles').update({ cashback: SEED_USER.cashback, points: SEED_USER.points, is_pro: false }).eq('id', DEMO_ID));
        for (const w of SEED_WALLETS) out.push(await c.from('wallets').update({ balance: w.balance }).eq('profile_id', DEMO_ID).eq('code', w.code));
        out.push(await c.from('transactions').insert(t.map((x) => ({ profile_id: DEMO_ID, merchant: x.merchant, amount: x.amount, wallet_name: x.wallet, category: x.category, item: x.item, qty: x.qty, cashback: x.cashback, created_at: x.createdAt }))));
        out.push(await c.from('disputes').insert(d.map((x) => ({ id: x.id, profile_id: DEMO_ID, user_name: x.user, issue: x.issue, status: x.status }))));
        return out;
      });
      if (ok) load();
    }
    notify('Demo data reset to the original seed.');
  };

  /* ---- scanner flow ---- */
  const openScanner = () => {
    setScanStep('scan');
    setScanData(null);
    setScanAmount('');
    setScanError('');
    setScanResult(null);
    setScannerOpen(true);
  };
  const closeScanner = () => setScannerOpen(false);

  const handleDecoded = useCallback((text) => {
    const parsed = parseQr(text);
    setScanData(parsed);
    setScanAmount(parsed.amount ? String(parsed.amount) : '');
    setScanError('');
    setScanStep('confirm');
  }, []);

  const pickMerchant = (m) => {
    setScanData({ ...m, fromQr: false });
    setScanAmount(String(m.amount));
    setScanError('');
    setScanStep('confirm');
  };

  const scanFromFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const reader = new Html5Qrcode('uniqr-file-host', { verbose: false });
      const text = await reader.scanFile(file, false);
      try { reader.clear(); } catch (err) {}
      handleDecoded(text);
    } catch (err) {
      notify('No QR code found in that image.', 'warning');
    }
  };

  const confirmPayment = async () => {
    const amount = parseFloat(scanAmount);
    if (!(amount > 0)) return setScanError('Enter the amount to pay.');
    setPaying(true);
    const res = await pay({ merchant: scanData.merchant, amount, category: scanData.category, item: scanData.item, qty: scanData.qty });
    setPaying(false);
    if (!res.ok) return setScanError(res.error);
    setScanResult(res);
    setScanStep('done');
    notify(`Paid ${rm(res.amount)} to ${res.merchant}!`);
  };

  /* ---- quick-action sheet (top up / transfer) ---- */
  const openSheet = (type) => {
    const def = wallets.find((w) => w.isDefault) || wallets[0];
    setSheet({ type });
    setSheetAmount('');
    setSheetTo('');
    setSheetError('');
    setSheetWallet(def ? def.id : '');
  };
  const submitSheet = async () => {
    const amt = parseFloat(sheetAmount);
    if (!(amt > 0)) return setSheetError('Enter a valid amount.');
    if (sheet.type === 'topup') {
      const w = await creditWallet(sheetWallet, amt);
      setSheet(null);
      if (w) notify(`${rm(amt)} added to ${w.name}.`);
    } else {
      if (!sheetTo.trim()) return setSheetError('Enter a recipient name or DuitNow ID.');
      const res = await pay({ merchant: `Transfer to ${sheetTo.trim()}`, amount: amt, category: 'Transfer', item: 'DuitNow Transfer', qty: 1, rewards: false });
      if (!res.ok) return setSheetError(res.error);
      setSheet(null);
      notify(`Sent ${rm(amt)} to ${sheetTo.trim()}.`);
    }
  };

  /* ---- AI chat ---- */
  useEffect(() => {
    if (chatEnd.current) chatEnd.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat, typing, chatOpen]);

  const aiReply = async (text) => {
    const q = text.toLowerCase();
    const { txs: list, wallets: ws, user: u } = live.current;
    if (/(refund|double|dispute|charged|wrong|overcharg)/.test(q)) {
      const last = list.find((t) => t.category !== 'Transfer') || list[0];
      if (!last) return 'I could not find a recent transaction to dispute. Make a payment first and I will look into it.';
      if (refunded.current.has(last.id)) return `Your latest transaction at ${last.merchant} has already been refunded. Anything else I can check?`;
      refunded.current.add(last.id);
      const w = ws.find((x) => x.name === last.wallet) || ws.find((x) => x.isDefault) || ws[0];
      await creditWallet(w.id, last.amount);
      await createDispute(`Customer reported an issue with ${last.merchant} (${rm(last.amount)}) — auto-verified by AI`, 'AI Handled & Refunded');
      return `I have logged and verified your dispute. An immediate refund of ${rm(last.amount)} has been credited back to your ${w.name}!`;
    }
    if (/(balance|how much)/.test(q)) return `Your unified balance across ${ws.length} wallets is ${rm(ws.reduce((a, w) => a + w.balance, 0))}.`;
    if (/(cashback|points|reward)/.test(q)) return `You have ${rm(u.cashback)} cashback and ${u.points} reward points available.`;
    if (/(pro|upgrade|subscription)/.test(q)) return 'Pro (RM 9.90/month) unlocks the itemised ledger, 2x rewards, zero withdrawal fees and the Mamak vs Café index. You can switch it on from Profile.';
    if (/(wallet|sync|link)/.test(q)) return 'All four wallets are linked and syncing through OAuth. Tap a card on the dashboard to cycle through them.';
    return "I've checked your DuitNow routing and gateway status. Everything is running smoothly! Is there anything else about your expenses or wallet sync I can assist with?";
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || typing) return;
    setChat((c) => [...c, { from: 'me', text }]);
    setChatInput('');
    setTyping(true);
    await new Promise((r) => setTimeout(r, 700));
    let reply;
    try { reply = await aiReply(text); } catch (e) { reply = 'Sorry, something went wrong on my side. Please try again.'; }
    setTyping(false);
    setChat((c) => [...c, { from: 'ai', text: reply }]);
  };

  /* ------------------------------------------------------------------ */
  /*  Consumer tabs                                                      */
  /* ------------------------------------------------------------------ */
  const quick = [
    { label: 'Transfer', icon: 'send', on: () => openSheet('transfer') },
    { label: 'Payment', icon: 'card', on: openScanner },
    { label: 'Top Up', icon: 'plus', on: () => openSheet('topup') },
    { label: 'Rewards', icon: 'gift', on: () => setTab('rewards') },
    { label: 'Split Bill', icon: 'users', on: () => setTab('analytics') },
    { label: 'Analytics', icon: 'chart', on: () => setTab('analytics') },
    { label: 'Support', icon: 'headset', on: () => setChatOpen(true) },
    { label: user.isPro ? 'Pro Active' : 'Go Pro', icon: 'star', on: () => setTab('profile') },
  ];

  const openLedger = () => {
    if (!user.isPro) return notify('Upgrade to Pro in Profile to unlock the itemised ledger.', 'warning');
    setLedgerOpen(true);
  };

  const catColor = { 'F&B': '#ff8a3d', Transport: '#3d7bff', Groceries: '#27ae60', Transfer: '#8b5cf6', Other: '#64748b' };

  const renderHome = () => (
    <div className="px-5 pt-5 pb-32 space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => notify('No new notifications.')} className="w-10 h-10 rounded-full bg-white shadow-sm grid place-items-center" aria-label="Notifications">
          <Icon name="bell" className="w-[18px] h-[18px]" />
        </button>
        <div className="text-center">
          <div className="font-extrabold text-[15px] leading-tight">Dashboard</div>
          <div className="text-[10px] text-[#8a8d96] font-semibold">Hello, {user.name.split(' ')[0]} 👋</div>
        </div>
        <button onClick={() => setTab('profile')} className="relative w-10 h-10 rounded-full bg-[#1c1d22] text-white grid place-items-center text-xs font-extrabold" aria-label="Profile">
          {initials(user.name)}
          <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[#ff4d4f] border-2 border-[#f2f3f6]" />
        </button>
      </div>

      <WalletStack wallets={wallets} idx={cardIdx} onNext={() => setCardIdx((i) => (i + 1) % wallets.length)} total={total} />

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2ebd6b]" />
          <div>
            <div className="text-[10px] text-[#8a8d96] font-semibold">Cashback</div>
            <div className="text-[15px] font-extrabold">{rm(user.cashback)}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffb000]" />
          <div>
            <div className="text-[10px] text-[#8a8d96] font-semibold">Points</div>
            <div className="text-[15px] font-extrabold">{user.points.toLocaleString()} pts</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-y-4 gap-x-2">
        {quick.map((q) => (
          <button key={q.label} onClick={q.on} className="flex flex-col items-center gap-1.5 active:scale-95 transition">
            <span className="w-12 h-12 rounded-full bg-white shadow-[0_6px_18px_rgba(20,22,26,0.07)] grid place-items-center text-[#1c1d22]">
              <Icon name={q.icon} className="w-[19px] h-[19px]" />
            </span>
            <span className="text-[10px] font-semibold text-[#5b5e68]">{q.label}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a8d96]">Recent Transactions</h3>
          <button onClick={openLedger} className="text-[11px] font-bold text-[#1c1d22] flex items-center gap-1">
            {user.isPro ? 'Itemised' : 'Itemised'} <Icon name={user.isPro ? 'chevron' : 'lock'} className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {txs.slice(0, 6).map((t) => (
            <Card key={t.id} className="p-3.5 flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl grid place-items-center text-white text-xs font-extrabold shrink-0" style={{ background: catColor[t.category] || catColor.Other }}>
                {(t.merchant || '?')[0].toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-extrabold truncate">{t.merchant}</div>
                <div className="text-[10px] text-[#8a8d96] font-medium truncate">
                  {fmtWhen(t.createdAt)} · {t.wallet}{t.cashback > 0 ? ` · +${rm(t.cashback)}` : ''}
                </div>
              </div>
              <div className="text-[13px] font-extrabold">-{rm(t.amount)}</div>
            </Card>
          ))}
          {!txs.length && <Card className="p-6 text-center text-xs text-[#8a8d96]">No transactions yet — scan a QR to pay.</Card>}
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => {
    const s = SPEND[range];
    return (
      <div className="px-5 pt-5 pb-32 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-[18px]">Spending Analytics</h2>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${user.isPro ? 'bg-[#1c1d22] text-white' : 'bg-white text-[#5b5e68]'}`}>{user.isPro ? '★ Pro Ledger' : 'Standard'}</span>
        </div>

        <div className="flex bg-white p-1 rounded-full text-xs font-bold text-center shadow-sm">
          {['day', 'month', 'year'].map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`flex-1 py-2 rounded-full capitalize transition ${range === r ? 'bg-[#1c1d22] text-white' : 'text-[#8a8d96]'}`}>{r}</button>
          ))}
        </div>

        <Card className="p-5 space-y-3 cursor-pointer" onClick={openLedger}>
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-[#8a8d96]">Cash flow ({range})</div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#f2f3f6] flex items-center gap-1">
              <Icon name={user.isPro ? 'list' : 'lock'} className="w-3 h-3" />{user.isPro ? 'Open itemised ledger' : 'Category view'}
            </span>
          </div>
          <div className="text-[26px] font-extrabold tracking-tight">RM {s.total} <span className="text-xs font-semibold text-[#8a8d96]">spent</span></div>
          <div className="space-y-2 pt-1 text-[12px] font-bold">
            {[['🏠 Needs (F&B / Bills)', s.needs, 50], ['🛍️ Wants (Café / Leisure)', s.wants, 30], ['💰 Savings & Investments', s.save, 20]].map(([label, val, pct]) => (
              <div key={label}>
                <div className="flex justify-between"><span>{label}</span><span>RM {val}</span></div>
                <div className="h-1.5 rounded-full bg-[#eceef2] mt-1"><div className="h-full rounded-full bg-[#1c1d22]" style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between text-[13px] font-extrabold">
            <span>🤝 Group Pot & Auto-Chase</span>
            <span className="text-[10px] font-bold text-[#b07a00] bg-[#fff6dc] px-2 py-0.5 rounded-full">1 active pot</span>
          </div>
          <p className="text-[11px] text-[#5b5e68] leading-relaxed">You paid <b>RM 120.00</b> for SS15 Mamak Supper. 2 friends haven&apos;t paid yet.</p>
          <div className="rounded-2xl bg-[#f2f3f6] p-3 flex items-center justify-between">
            <div>
              <div className="text-[12px] font-extrabold">Kevin Tan</div>
              <div className={`text-[10px] font-semibold ${chased ? 'text-[#2ebd6b]' : 'text-[#e5484d]'}`}>{chased ? 'Reminder sent ✓' : 'Owes RM 40.00 (pending)'}</div>
            </div>
            <button
              onClick={() => { setChased(true); notify('Gentle DuitNow reminder sent to Kevin!'); }}
              className="px-3 py-1.5 rounded-full bg-[#1c1d22] text-white text-[10px] font-bold"
            >
              🔔 Auto-Chase
            </button>
          </div>
          <PillButton className="w-full" onClick={() => notify('New group pot created! DuitNow links dispatched.')}>+ Create bill-split pot</PillButton>
        </Card>

        {user.isPro ? (
          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between text-[13px] font-extrabold"><span>☕ Mamak vs. Café Index</span><span className="text-[#8a8d96] text-[11px]">1 : 2.4</span></div>
            <p className="text-[11px] text-[#5b5e68] leading-relaxed">You spent <b>RM 45</b> at local mamaks vs <b>RM 108</b> at artisan cafés this week.</p>
            <div className="rounded-2xl bg-[#fff6dc] text-[#7a5200] p-3 text-[11px] font-bold">💡 Swapping 2 café lattes for teh tarik saves you RM 24!</div>
          </Card>
        ) : (
          <Card className="p-5 space-y-1 opacity-70">
            <div className="flex items-center justify-between text-[13px] font-extrabold"><span>☕ Mamak vs. Café Index</span><span className="text-[10px] text-[#e5484d] flex items-center gap-1"><Icon name="lock" className="w-3 h-3" />Pro</span></div>
            <p className="text-[11px] text-[#5b5e68]">Upgrade to Pro in Profile to unlock lifestyle comparisons and savings tips.</p>
          </Card>
        )}
      </div>
    );
  };

  const renderRewards = () => (
    <div className="px-5 pt-5 pb-32 space-y-4">
      <h2 className="font-extrabold text-[18px]">Rewards & Perks 🎁</h2>
      <div className="rounded-[26px] p-5 text-white space-y-3 bg-[linear-gradient(135deg,#34363d,#15161a)] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="text-[11px] text-white/60 font-semibold">Available cashback vault</div>
        <div className="text-[30px] font-extrabold tracking-tight">{rm(user.cashback)}</div>
        <button onClick={withdrawCash} className="w-full rounded-full bg-white text-[#14161a] font-bold text-[13px] py-3 active:scale-[0.98] transition">Transfer to bank account</button>
        <div className="text-[10px] text-white/50">{user.isPro ? 'Pro: zero withdrawal fee' : 'RM 0.50 withdrawal fee on Standard'} · {user.points.toLocaleString()} pts</div>
      </div>

      {user.isPro && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between text-[13px] font-extrabold"><span>🎂 Pro Birthday Vault</span><span className="text-[9px] bg-[#1c1d22] text-white px-2 py-0.5 rounded-full font-bold">VIP</span></div>
          {[['🎁 Free Birthday Month Sundae & Pastry', 'At any partner café in KL / Selangor', 'Claim', () => notify('Birthday voucher QR code generated!')], ['🎉 RM 50 Birthday Cashback', 'Deposited straight into your vault', 'Deposit', claimBirthday]].map(([t, d, b, fn]) => (
            <div key={t} className="rounded-2xl bg-[#f2f3f6] p-3 flex items-center justify-between gap-3">
              <div><div className="text-[12px] font-extrabold">{t}</div><div className="text-[10px] text-[#8a8d96]">{d}</div></div>
              <button onClick={fn} className="px-3 py-1.5 rounded-full bg-[#1c1d22] text-white text-[10px] font-bold shrink-0">{b}</button>
            </div>
          ))}
        </Card>
      )}

      <div>
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a8d96] mb-2.5">Top perks & vouchers</h3>
        <div className="space-y-2">
          {REWARDS.map((r) => (
            <Card key={r.title} className="p-4 flex items-center justify-between gap-3">
              <div><div className="text-[13px] font-extrabold">{r.title}</div><div className="text-[10px] text-[#8a8d96]">{r.cost} reward points</div></div>
              <button onClick={() => redeemReward(r.title, r.cost)} disabled={user.points < r.cost} className="px-4 py-2 rounded-full bg-[#1c1d22] text-white text-[11px] font-bold disabled:opacity-35">Redeem</button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="px-5 pt-5 pb-32 space-y-4">
      <h2 className="font-extrabold text-[18px]">Profile & Support</h2>
      <Card className="p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#1c1d22] text-white grid place-items-center font-extrabold">{initials(user.name)}</div>
        <div className="min-w-0">
          <div className="font-extrabold text-[15px]">{user.name}</div>
          <div className="text-[11px] text-[#8a8d96] truncate">{user.occupation}</div>
          <div className="text-[10px] font-bold text-[#2ebd6b] mt-0.5">● KYC verified (BNM compliant)</div>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a8d96]">Account tier</h3>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${user.isPro ? 'bg-[#1c1d22] text-white' : 'bg-[#fff6dc] text-[#7a5200]'}`}>{user.isPro ? '★ Pro' : 'Standard'}</span>
        </div>
        <p className="text-[11px] text-[#5b5e68] leading-relaxed">
          {user.isPro ? 'You are on Pro: itemised ledgers, zero withdrawal fees and 2x reward points.' : 'Upgrade to Pro (RM 9.90/month) to unlock itemised ledgers, bill-split tools, zero withdrawal fees and 2x rewards.'}
        </p>
        <PillButton className={`w-full ${user.isPro ? '!bg-[#e5484d]' : ''}`} onClick={togglePro}>{user.isPro ? 'Switch back to Standard' : '✨ Upgrade to Pro'}</PillButton>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a8d96]">24/7 AI customer care</h3>
          <span className="w-2.5 h-2.5 rounded-full bg-[#2ebd6b] animate-pulse" />
        </div>
        <p className="text-[11px] text-[#5b5e68] leading-relaxed">Wallet sync, cashback questions or payment disputes — answered instantly.</p>
        <PillButton className="w-full" onClick={() => setChatOpen(true)}>Open AI support chat 🤖</PillButton>
      </Card>

      <Card className="p-5 space-y-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a8d96]">Data source</h3>
        <p className="text-[11px] text-[#5b5e68] leading-relaxed">
          {mode === 'live' && 'Connected to Supabase — changes sync in real time across devices.'}
          {mode === 'connecting' && 'Connecting to Supabase…'}
          {mode === 'local' && 'Running in local demo mode. Add the two Supabase env vars on Vercel to sync data.'}
          {mode === 'error' && 'Supabase is configured but its tables could not be read — run supabase_setup.sql. Using local data for now.'}
        </p>
      </Card>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /*  Admin panel                                                        */
  /* ------------------------------------------------------------------ */
  const renderAdmin = () => (
    <div className="w-full h-full overflow-y-auto bg-[#f2f3f6] text-[#14161a]">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-5 pb-16">
        <div className="rounded-3xl bg-[#1c1d22] text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold flex items-center gap-2"><Icon name="shield" className="w-5 h-5" /> Admin Executive Panel</h2>
            <p className="text-xs text-white/60 mt-1">PayNet DuitNow routing, live AI chat monitoring and the support resolution queue.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white/10">Admin Level 3 · Executive Founder</span>
            <button onClick={resetDemo} className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white text-[#14161a] flex items-center gap-1.5"><Icon name="refresh" className="w-3.5 h-3.5" /> Reset demo</button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            ['Active users', '8,960', '↑ +30% MoM growth'],
            ['Pro subscribers', `${896 + (user.isPro ? 1 : 0)} users`, '@ RM 9.90 / month'],
            ['Open support tickets', `${openTickets}`, '98.4% autonomous resolution'],
            ['Month 12 projection', '+RM 17,459', 'Break-even reached (Month 11)'],
          ].map(([a, b, c]) => (
            <Card key={a} className="p-4 md:p-5">
              <div className="text-[11px] font-bold text-[#8a8d96]">{a}</div>
              <div className="text-xl md:text-2xl font-extrabold mt-1 tracking-tight">{b}</div>
              <div className="text-[11px] font-semibold text-[#2ebd6b] mt-2">{c}</div>
            </Card>
          ))}
        </div>

        <Card className="p-5 md:p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-[#eceef2] pb-3">
            <h3 className="font-extrabold text-[15px]">💬 Live 24/7 AI support & dispute queue</h3>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#e6f7ee] text-[#1f8a4c]">{mode === 'live' ? '● Realtime' : 'AI online'}</span>
          </div>
          {disputes.length === 0 && <p className="text-xs text-[#8a8d96] py-4 text-center">Queue is empty 🎉</p>}
          {disputes.map((d) => {
            const done = /resolved|refunded/i.test(d.status);
            return (
              <div key={d.id} className="rounded-2xl bg-[#f7f8fa] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold">{d.id}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${done ? 'bg-[#e6f7ee] text-[#1f8a4c]' : d.status === 'Escalated' ? 'bg-[#fde8e8] text-[#c53030]' : 'bg-[#fff6dc] text-[#7a5200]'}`}>{d.status}</span>
                    <span className="text-[10px] text-[#8a8d96]">{fmtWhen(d.createdAt)}</span>
                  </div>
                  <div className="font-extrabold mt-1">User: {d.user}</div>
                  <p className="text-[#5b5e68] mt-0.5">{d.issue}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!/^resolved$/i.test(d.status) && <button onClick={() => setDisputeStatus(d.id, 'Resolved')} className="px-3 py-2 rounded-full bg-[#1c1d22] text-white font-bold">Mark resolved</button>}
                  {!done && d.status !== 'Escalated' && <button onClick={() => setDisputeStatus(d.id, 'Escalated')} className="px-3 py-2 rounded-full bg-white border border-[#dfe1e6] font-bold">Escalate</button>}
                  {done && <button onClick={() => notify('AI chat transcript exported.')} className="px-3 py-2 rounded-full bg-white border border-[#dfe1e6] font-bold">Transcript</button>}
                </div>
              </div>
            );
          })}
        </Card>

        <Card className="p-5 md:p-6 overflow-x-auto">
          <h3 className="font-extrabold text-[15px] mb-4">One-year pro forma income statement (consumer segment)</h3>
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#eceef2] text-[#8a8d96] font-extrabold">
                {['Month', 'Active users', 'Pro subs (10%)', 'Transaction rev.', 'Subscription rev.', 'Total revenue', 'Total costs'].map((h) => <th key={h} className="pb-3 pr-3">{h}</th>)}
                <th className="pb-3 text-right">Net profit / loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f1f4] font-medium">
              {PRO_FORMA.map((r) => (
                <tr key={r.m} className={r.hi ? 'bg-[#f7f8fa]' : ''}>
                  <td className="py-3 pr-3 font-bold">{r.m}</td>
                  <td className="pr-3">{r.users}</td><td className="pr-3">{r.subs}</td><td className="pr-3">{r.tx}</td><td className="pr-3">{r.sub}</td><td className="pr-3">{r.rev}</td><td className="pr-3">{r.cost}</td>
                  <td className={`text-right font-extrabold ${r.pos ? 'text-[#1f8a4c]' : 'text-[#e5484d]'}`}>{r.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  if (!ready) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#16171b', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fff', color: '#16171b', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20, margin: '0 auto 10px' }}>U</div>
          <div style={{ fontSize: 13, opacity: 0.6 }}>Loading UniQR…</div>
        </div>
      </div>
    );
  }

  const pill = {
    live: ['bg-[#2ebd6b]', 'Supabase · Live'],
    connecting: ['bg-[#ffb000] animate-pulse', 'Connecting…'],
    local: ['bg-[#ffb000]', 'Local demo'],
    error: ['bg-[#e5484d]', 'Setup needed · Local'],
  }[mode];

  const navItem = (key, icon, label) => (
    <button onClick={() => setTab(key)} className={`flex flex-col items-center gap-1 w-14 ${tab === key ? 'text-[#14161a]' : 'text-[#a0a3ad]'}`}>
      <Icon name={icon} className="w-[21px] h-[21px]" strokeWidth={tab === key ? 2.2 : 1.8} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-[#16171b] text-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{`
        #uniqr-reader video { object-fit: cover; width: 100% !important; height: 100% !important; }
        #uniqr-reader { border: 0 !important; }
        .uniqr-scroll::-webkit-scrollbar { width: 0; height: 0; }
        .uniqr-scroll { scrollbar-width: none; }
        button { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* Global header */}
      <header className="shrink-0 px-4 md:px-6 py-3 flex items-center justify-between gap-3 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white text-[#16171b] grid place-items-center font-extrabold">U</div>
          <div className="hidden sm:block min-w-0">
            <div className="font-extrabold tracking-tight leading-tight">UniQR <span className="text-[10px] font-bold text-white/60 ml-1">Malaysia 🇲🇾</span></div>
            <div className="text-[11px] text-white/45 truncate">Super-wallet & expense aggregator</div>
          </div>
        </div>

        <div className="flex bg-white/10 p-1 rounded-full text-xs font-bold">
          <button onClick={() => setView('consumer')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition ${view === 'consumer' ? 'bg-white text-[#16171b]' : 'text-white/70'}`}>
            <Icon name="phone" className="w-3.5 h-3.5" /> Consumer
          </button>
          <button onClick={() => setView('admin')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition ${view === 'admin' ? 'bg-white text-[#16171b]' : 'text-white/70'}`}>
            <Icon name="chart" className="w-3.5 h-3.5" /> Admin
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] font-semibold text-white/70 bg-white/10 rounded-full px-3 py-2">
          <span className={`w-2 h-2 rounded-full ${pill[0]}`} /> {pill[1]}
        </div>
        <span className={`md:hidden w-2.5 h-2.5 rounded-full ${pill[0]}`} title={pill[1]} />
      </header>

      <main className="flex-1 min-h-0 relative">
        {view === 'admin' ? (
          renderAdmin()
        ) : (
          <div className="h-full flex items-center justify-center md:p-5">
            <div className="relative flex flex-col w-full h-full md:w-[390px] md:max-h-[844px] md:rounded-[44px] md:border-[10px] md:border-[#2a2b31] bg-[#f2f3f6] text-[#14161a] overflow-hidden md:shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
              <div className="hidden md:flex shrink-0 justify-between items-center px-7 pt-3 pb-1 text-[11px] font-bold">
                <span>{clock}</span>
                <span className="w-24 h-5 rounded-full bg-[#14161a] absolute left-1/2 -translate-x-1/2 top-2" />
                <span className="tracking-wider">5G ▮▮▮</span>
              </div>

              <div className={`uniqr-scroll flex-1 overflow-y-auto transition-opacity ${mode === 'connecting' ? 'opacity-60' : ''}`}>
                {tab === 'home' && renderHome()}
                {tab === 'analytics' && renderAnalytics()}
                {tab === 'rewards' && renderRewards()}
                {tab === 'profile' && renderProfile()}
              </div>

              <nav className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl rounded-t-[28px] px-5 pt-3 pb-4 flex items-center justify-between shadow-[0_-10px_30px_rgba(20,22,26,0.08)]">
                {navItem('home', 'home', 'Home')}
                {navItem('analytics', 'chart', 'Analytics')}
                <button onClick={openScanner} aria-label="Scan to pay" className="-mt-9 w-[60px] h-[60px] rounded-full bg-[#1c1d22] text-white grid place-items-center border-[5px] border-[#f2f3f6] shadow-[0_10px_24px_rgba(0,0,0,0.3)] active:scale-95 transition">
                  <Icon name="scan" className="w-6 h-6" strokeWidth={2.1} />
                </button>
                {navItem('rewards', 'gift', 'Rewards')}
                {navItem('profile', 'user', 'Profile')}
              </nav>
            </div>
          </div>
        )}
      </main>

      {/* hidden host used for scanning QR images from file */}
      <div id="uniqr-file-host" className="hidden" />

      {/* Scanner */}
      {scannerOpen && (
        <Sheet title={scanStep === 'done' ? 'Payment complete' : scanStep === 'confirm' ? 'Confirm payment' : 'Scan DuitNow QR'} onClose={closeScanner}>
          {scanStep === 'scan' && (
            <div className="space-y-4">
              <ScannerPane onDecode={handleDecoded} />
              <label className="flex items-center justify-center gap-2 w-full rounded-full bg-[#f2f3f6] py-2.5 text-[12px] font-bold cursor-pointer">
                <Icon name="image" className="w-4 h-4" /> Upload a QR image
                <input type="file" accept="image/*" className="hidden" onChange={scanFromFile} />
              </label>
              <div className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a8d96]">Or pick a simulated merchant</p>
                {MERCHANTS.map((m) => (
                  <button key={m.merchant} onClick={() => pickMerchant(m)} className="w-full p-3 rounded-2xl bg-[#f7f8fa] hover:bg-[#eceef2] text-left flex items-center gap-3 transition">
                    <span className="w-9 h-9 rounded-xl bg-[#1c1d22] text-white grid place-items-center text-xs font-extrabold">{m.mark}</span>
                    <span className="flex-1">
                      <span className="block text-[12px] font-extrabold">{m.label}</span>
                      <span className="block text-[10px] text-[#8a8d96] font-semibold">DuitNow QR · {rm(m.amount)}</span>
                    </span>
                    <Icon name="chevron" className="w-4 h-4 text-[#a0a3ad]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {scanStep === 'confirm' && scanData && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#f7f8fa] p-4">
                <div className="text-[10px] font-bold text-[#8a8d96] uppercase tracking-wider">Pay to</div>
                <div className="text-[15px] font-extrabold mt-0.5">{scanData.merchant}</div>
                <div className="text-[10px] text-[#8a8d96] font-semibold mt-0.5">{scanData.category} · {scanData.unknown ? 'Unrecognised QR — check the merchant' : 'DuitNow QR'}</div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5b5e68]">Amount (RM)</label>
                <input
                  inputMode="decimal"
                  value={scanAmount}
                  onChange={(e) => setScanAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  className="mt-1 w-full rounded-2xl bg-[#f2f3f6] px-4 py-3 text-lg font-extrabold outline-none focus:ring-2 focus:ring-[#1c1d22]"
                />
              </div>
              <p className="text-[10px] text-[#8a8d96]">Auto-routed from your primary wallet; falls back to the wallet with the highest balance if needed. {user.isPro ? 'Pro: 5% cashback.' : '2.5% cashback.'}</p>
              {scanError && <p className="text-[12px] font-bold text-[#e5484d]">{scanError}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setScanStep('scan'); setScanError(''); }} className="flex-1 rounded-full bg-[#f2f3f6] font-bold text-[13px] py-3">Back</button>
                <PillButton className="flex-[2]" onClick={confirmPayment} disabled={paying}>{paying ? 'Paying…' : `Pay ${scanAmount ? rm(parseFloat(scanAmount) || 0) : ''}`}</PillButton>
              </div>
            </div>
          )}

          {scanStep === 'done' && scanResult && (
            <div className="text-center py-3 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#e6f7ee] text-[#1f8a4c] grid place-items-center mx-auto"><Icon name="check" className="w-8 h-8" strokeWidth={2.4} /></div>
              <div>
                <h4 className="text-lg font-extrabold">Payment successful!</h4>
                <p className="text-[12px] text-[#5b5e68] mt-1">Paid {rm(scanResult.amount)} to {scanResult.merchant} via DuitNow ({scanResult.wallet.name})</p>
                {scanResult.cashback > 0 && <p className="text-[11px] font-bold text-[#1f8a4c] mt-1">+{rm(scanResult.cashback)} cashback earned</p>}
              </div>
              <PillButton className="w-full" onClick={closeScanner}>Return to dashboard</PillButton>
            </div>
          )}
        </Sheet>
      )}

      {/* Top-up / transfer */}
      {sheet && (
        <Sheet title={sheet.type === 'topup' ? 'Top up wallet' : 'DuitNow transfer'} onClose={() => setSheet(null)}>
          <div className="space-y-4">
            {sheet.type === 'topup' ? (
              <div>
                <label className="text-[11px] font-bold text-[#5b5e68]">Wallet</label>
                <select value={sheetWallet} onChange={(e) => setSheetWallet(e.target.value)} className="mt-1 w-full rounded-2xl bg-[#f2f3f6] px-4 py-3 text-sm font-bold outline-none">
                  {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} — {rm(w.balance)}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-bold text-[#5b5e68]">Recipient (name, phone or DuitNow ID)</label>
                <input value={sheetTo} onChange={(e) => setSheetTo(e.target.value)} placeholder="e.g. Kevin Tan" className="mt-1 w-full rounded-2xl bg-[#f2f3f6] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#1c1d22]" />
              </div>
            )}
            <div>
              <label className="text-[11px] font-bold text-[#5b5e68]">Amount (RM)</label>
              <input inputMode="decimal" value={sheetAmount} onChange={(e) => setSheetAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" className="mt-1 w-full rounded-2xl bg-[#f2f3f6] px-4 py-3 text-lg font-extrabold outline-none focus:ring-2 focus:ring-[#1c1d22]" />
              <div className="flex gap-2 mt-2">
                {[10, 50, 100].map((v) => <button key={v} onClick={() => setSheetAmount(String(v))} className="px-3.5 py-1.5 rounded-full bg-[#f2f3f6] text-[11px] font-bold">RM {v}</button>)}
              </div>
            </div>
            {sheetError && <p className="text-[12px] font-bold text-[#e5484d]">{sheetError}</p>}
            <PillButton className="w-full" onClick={submitSheet}>{sheet.type === 'topup' ? 'Add funds' : 'Send money'}</PillButton>
          </div>
        </Sheet>
      )}

      {/* Pro itemised ledger */}
      {ledgerOpen && (
        <Sheet title="☕ Pro itemised ledger" onClose={() => setLedgerOpen(false)} size="lg">
          <p className="text-[11px] text-[#5b5e68] mb-3">Exact item names, quantities, categories and timestamps across merchants.</p>
          <div className="space-y-3">
            {txs.map((t) => (
              <div key={t.id} className="rounded-2xl bg-[#f7f8fa] p-4 space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-extrabold text-sm">{t.merchant}</div>
                    <div className="text-[11px] text-[#5b5e68] font-semibold mt-0.5">🛍️ Item: <b>{t.item}</b></div>
                  </div>
                  <div className="font-extrabold text-[#e5484d] text-sm shrink-0">-{rm(t.amount)}</div>
                </div>
                <div className="pt-2 border-t border-[#eceef2] flex flex-wrap justify-between gap-x-3 text-[10px] text-[#5b5e68] font-bold">
                  <span>Category: {t.category}</span><span>Qty: {t.qty}</span><span>{fmtWhen(t.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
          <PillButton className="w-full mt-4" onClick={() => setLedgerOpen(false)}>Close ledger</PillButton>
        </Sheet>
      )}

      {/* AI support chat */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm sm:p-4" onClick={() => setChatOpen(false)}>
          <div className="w-full sm:max-w-sm h-[80dvh] sm:h-[540px] bg-white text-[#14161a] rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-[#eceef2] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#1c1d22] text-white grid place-items-center"><Icon name="bot" className="w-[18px] h-[18px]" /></div>
                <div>
                  <div className="font-extrabold text-[13px]">UniQR 24/7 AI Support</div>
                  <div className="text-[10px] font-bold text-[#2ebd6b]">● Active & ready</div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-[#f2f3f6] grid place-items-center"><Icon name="x" className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-[12px] uniqr-scroll">
              {chat.map((m, i) => (
                <div key={i} className={`max-w-[85%] px-3.5 py-2.5 leading-relaxed font-medium ${m.from === 'me' ? 'ml-auto bg-[#1c1d22] text-white rounded-2xl rounded-tr-md' : 'bg-[#f2f3f6] rounded-2xl rounded-tl-md'}`}>{m.text}</div>
              ))}
              {typing && <div className="bg-[#f2f3f6] rounded-2xl rounded-tl-md px-3.5 py-2.5 w-14 text-[#8a8d96] tracking-widest animate-pulse">•••</div>}
              <div ref={chatEnd} />
            </div>
            <div className="flex gap-2 pt-3 border-t border-[#eceef2] shrink-0">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="Ask anything… try “double charge refund”" className="flex-1 rounded-full bg-[#f2f3f6] px-4 py-2.5 text-[12px] outline-none focus:ring-2 focus:ring-[#1c1d22]" />
              <button onClick={sendChat} disabled={typing || !chatInput.trim()} className="px-4 rounded-full bg-[#1c1d22] text-white text-[12px] font-bold disabled:opacity-40">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw]">
          <div className={`flex items-center gap-2.5 rounded-full pl-3 pr-4 py-2.5 shadow-2xl text-[12px] font-bold ${toast.kind === 'warning' ? 'bg-[#fff6dc] text-[#7a5200]' : 'bg-white text-[#14161a]'}`}>
            <span className={`w-6 h-6 rounded-full grid place-items-center text-white shrink-0 ${toast.kind === 'warning' ? 'bg-[#ffb000]' : 'bg-[#2ebd6b]'}`}>
              <Icon name={toast.kind === 'warning' ? 'bell' : 'check'} className="w-3.5 h-3.5" strokeWidth={2.4} />
            </span>
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}
