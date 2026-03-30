import React, { useState, useEffect } from 'react';

const tg = window.Telegram.WebApp;
const API_URL = "https://psteamcamp-game.onrender.com"; // Поменяешь после деплоя бека

function App() {
  const [data, setData] = useState({ user: null, others: [] });
  const user = tg.initDataUnsafe?.user;

  const sync = async (actionType = null) => {
    const endpoint = actionType ? '/api/action' : '/api/sync';
    const body = actionType ? { id: user?.id, type: actionType } : { id: user?.id, name: user?.first_name || "Guest" };
    
    try {
      const res = await fetch(API_URL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      setData(result);
      if (actionType) tg.HapticFeedback.impactOccurred('light');
    } catch (e) { console.error("API Error", e); }
  };

  useEffect(() => {
    tg.ready();
    tg.expand();
    sync();
    const timer = setInterval(sync, 10000);
    return () => clearInterval(timer);
  }, []);

  if (!data.user) return <div style={{color: 'white', textAlign: 'center', marginTop: '50px'}}>Загрузка лагеря...</div>;

  return (
    <div style={s.container}>
      <h2 style={s.title}>PSTEAMCAMP</h2>
      
      <div style={s.stats}>
        <div style={s.stat}>HP: {data.user.hp}</div>
        <div style={s.stat}>MP: {data.user.mp}</div>
        <div style={s.stat}>LVL: {data.user.lvl} (XP: {data.user.xp})</div>
      </div>

      <div style={s.fireZone}>
        <div style={s.fire}>🔥</div>
        <div style={s.players}>
          {data.others.map(p => <div key={p.id} style={s.other}>👤 {p.name}</div>)}
        </div>
      </div>

      <div style={s.actions}>
        <button onClick={() => sync('wood')} style={s.btn}>🪵 Подкинуть дров</button>
        <button onClick={() => sync('story')} style={s.btn}>📖 История</button>
        <button onClick={() => sync('rest')} style={s.btn}>💤 Отдых</button>
      </div>
    </div>
  );
}

const s = {
  container: { background: '#26292e', color: 'white', height: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  title: { textAlign: 'center', color: '#3498db' },
  stats: { display: 'flex', justifyContent: 'space-around', background: '#1e1e1e', padding: '10px', borderRadius: '10px' },
  fireZone: { height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  fire: { fontSize: '60px', animation: 'pulse 1s infinite' },
  players: { display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' },
  other: { fontSize: '12px', background: '#333', padding: '4px 8px', borderRadius: '5px' },
  actions: { display: 'grid', gap: '10px', marginTop: '20px' },
  btn: { padding: '15px', border: 'none', borderRadius: '8px', background: '#e67e22', color: 'white', fontWeight: 'bold' }
};

export default App;