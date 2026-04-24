const BASE = '/api';

export async function loadState() {
  const res = await fetch(`${BASE}/state`);
  if (!res.ok) throw new Error('Failed to load game state');
  return res.json();
}

export async function saveState(state) {
  const res = await fetch(`${BASE}/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) throw new Error('Failed to save game state');
  return res.json();
}

export async function deleteState() {
  const res = await fetch(`${BASE}/state`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to reset game state');
  return res.json();
}

export async function loadGameData(name) {
  const res = await fetch(`${BASE}/data/${name}`);
  if (!res.ok) throw new Error(`Failed to load ${name}`);
  return res.json();
}
