import { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';

const API_URL = "https://psteamcamp-game.onrender.com"; 
const CHAT_LOGO_URL = "https://i.ibb.co/r8YMKqY/photo-2026-03-18-16-21-41-1.jpg"; // ЗАМЕНИ НА СВОЮ ССЫЛКУ

function App() {
  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('camp_user_data');
    return saved ? JSON.parse(saved) : null;
  });
  const [otherPlayers, setOtherPlayers] = useState([]);
  const [history, setHistory] = useState(["Костер тихо потрескивает...", "Добро пожаловать в лагерь!"]); 
  const [loading, setLoading] = useState(!userData);
  const [view, setView] = useState('camp');
  const [isDead, setIsDead] = useState(false);
  const serverLock = useRef(false);

  const getStats = (xp) => ({
    lvl: Math.floor((xp || 0) / 100) + 1,
    progress: (xp || 0) % 100
  });

  useEffect(() => {
    if (userData) {
      localStorage.setItem('camp_user_data', JSON.stringify(userData));
      if (userData.hp <= 0) setIsDead(true);
    }
  }, [userData]);

  const addLog = (msg) => setHistory(prev => [msg, ...prev].slice(0, 4));

  const syncWithServer = useCallback(async (userToSync) => {
    if (!userToSync || serverLock.current) return;
    serverLock.current = true;
    try {
      const response = await fetch(`${API_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userToSync }),
      });
      const data = await response.json();
      if (data.others) {
        const players = data.others
          .filter(p => p.id !== userToSync.id)
          .map(p => ({ ...p, ...getStats(p.xp) }));
        setOtherPlayers(players);
      }
    } catch (e) { console.error("Sync error:", e); } 
    finally { serverLock.current = false; setLoading(false); }
  }, []);

  useEffect(() => {
    const tgApp = window.Telegram?.WebApp;
    const user = tgApp?.initDataUnsafe?.user;
    const initial = userData || { 
      id: user?.id || 'dev_user', 
      name: user?.first_name || 'Странник', 
      hp: 100, mp: 50, xp: 0, wood: 0 
    };
    if (!userData) setUserData({ ...initial, ...getStats(initial.xp) });
    syncWithServer(initial);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (userData && view === 'camp') syncWithServer(userData);
    }, 5000);
    return () => clearInterval(interval);
  }, [userData, view, syncWithServer]);

  const doAction = (type) => {
    if (!userData || isDead) return;

    setUserData(prev => {
      let next = { ...prev };
      const oldLvl = getStats(prev.xp).lvl;
      let logMsg = "";

      next.mp = Math.min(50, (prev.mp || 0) + 1);

      if (type === 'gather') {
        next.hp = Math.max(0, prev.hp - 5);
        next.xp = (prev.xp || 0) + 5;
        next.wood = (prev.wood || 0) + 1;
        logMsg = "Вы нашли хворост. (-5 HP, +5 XP)";
        
        if (Math.random() < 0.15) {
          const events = [
            { m: "Нашли сладкие ягоды! (+10 HP)", h: 10, x: 0 },
            { m: "Старая метка следопыта. (+20 XP)", h: 0, x: 20 },
            { m: "Острый шип в кустах! (-10 HP)", h: -10, x: 0 }
          ];
          const ev = events[Math.floor(Math.random() * events.length)];
          next.hp = Math.min(100, Math.max(0, next.hp + ev.h));
          next.xp += ev.x;
          logMsg = ev.m;
        }
      } 
      else if (type === 'meditate' && prev.mp >= 15) {
        next.hp = Math.min(100, prev.hp + 20);
        next.mp -= 15;
        logMsg = "Магия огня исцеляет тело. (+20 HP)";
      } 
      else if (type === 'wood' && prev.wood > 0) {
        next.hp = Math.min(100, prev.hp + 5);
        next.xp = (prev.xp || 0) + 2; 
        next.wood -= 1;
        logMsg = "Костер греет душу. (+5 HP, +2 XP)";
      }

      if (logMsg) addLog(logMsg);
      const newStats = getStats(next.xp);
      if (newStats.lvl > oldLvl) {
        next.mp = Math.min(50, next.mp + 10);
        addLog(`УРОВЕНЬ ПОВЫШЕН: ${newStats.lvl}!`);
      }
      return { ...next, ...newStats };
    });
  };

  const handleRestart = () => {
    const reset = { ...userData, hp: 100, mp: 50, xp: 0, wood: 0, lvl: 1, progress: 0 };
    setIsDead(false);
    setUserData(reset);
    setHistory(["Свет костра дает новый шанс..."]);
    syncWithServer(reset);
  };

  if (loading) return <div className="loading">ЗАГРУЗКА ЛАГЕРЯ...</div>;

  return (
    <div className="app-container">
      {/* ФОНОВОЕ ЛОГО */}
      <div className="chat-bg-logo">
        <img src={CHAT_LOGO_URL} alt="chat-logo" />
      </div>

      <header className={`stats-grid ${isDead ? 'blur' : ''}`}>
        <StatCard label="💖 HP" val={userData?.hp} color="#ff4757" />
        <StatCard label="🔷 MP" val={userData?.mp} color="#3742fa" max={50} />
        <StatCard label="🎖 LVL" val={userData?.lvl} sub={`${userData?.progress}%`} color="#ffa502" percent={userData?.progress} />
      </header>

      {view === 'camp' ? (
        <main className="game-area">
          <div className="visual">
            {isDead ? (
              <div className="death-box">
                <div className="skull">💀</div>
                <h2>ПОГИБЕЛЬ</h2>
                <button className="btn restart-btn" onClick={handleRestart}>ВОЗРОДИТЬСЯ</button>
              </div>
            ) : (
              <div className="fire-wrap">
                <div className="fire-icon">🔥</div>
                <div className="wood-pill">
                  <span className="emoji">🪵</span>
                  <span className="txt">ДРОВА: {userData?.wood || 0}</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-log">
            {history.map((line, i) => <div key={i} className="log-line">{line}</div>)}
          </div>

          {!isDead && (
            <div className="controls">
              <div className="btn-grid">
                <button className="btn act orange" onClick={()=>doAction('wood')} disabled={!userData?.wood}>
                  <span className="b-top">🪵 ПОДКИНУТЬ</span>
                  <span className="b-bot">+5 HP | +2 XP</span>
                </button>
                <button className="btn act green" onClick={()=>doAction('gather')}>
                  <span className="b-top">🌲 В ЛЕС</span>
                  <span className="b-bot">-5 HP | +5 XP</span>
                </button>
                <button className="btn act purple full" onClick={()=>doAction('meditate')} disabled={userData?.mp < 15}>
                  <span className="b-top">🔮 МАГИЯ ОГНЯ</span>
                  <span className="b-bot">-15 MP | +20 HP</span>
                </button>
              </div>
              <button className="btn big gray" onClick={()=>setView('leaderboard')}>🏆 РЕЙТИНГ ЧАТА</button>
            </div>
          )}
        </main>
      ) : (
        <div className="leader-view">
          <div className="l-head"><h2>ТОП ВЫЖИВШИХ</h2><button onClick={()=>setView('camp')}>❌</button></div>
          <div className="l-scroll">
            {[userData, ...otherPlayers]
              .sort((a,b) => (b.xp || 0) - (a.xp || 0))
              .map((p, i) => (
                <div key={p.id} className={`l-row ${p.id === userData?.id ? 'me' : ''}`}>
                  <div className="l-name"><b>#{i+1}</b> {p.name || "Странник"}</div>
                  <div className="l-vals"><b>Lvl {p.lvl || 1}</b> <span>{p.xp} XP</span></div>
                </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({ label, val, color, max = 100, percent, sub }) => (
  <div className="s-card">
    <div className="s-info"><span>{label}</span><b>{val}{sub ? ` (${sub})` : ''}</b></div>
    <div className="s-bar"><div className="s-fill" style={{width:`${percent !== undefined ? percent : (val/max)*100}%`, background: color}}></div></div>
  </div>
);

export default App;