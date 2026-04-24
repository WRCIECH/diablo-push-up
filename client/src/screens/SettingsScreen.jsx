import React, { useState } from 'react';
import { useGame, INITIAL_GAMESTATE } from '../context/GameContext.jsx';
import { deleteState } from '../api.js';

export default function SettingsScreen() {
  const { dispatch, setScreen } = useGame();
  const [step, setStep] = useState(0); // 0=idle, 1=confirm, 2=resetting

  async function handleReset() {
    if (step === 0) { setStep(1); return; }
    setStep(2);
    await deleteState();
    dispatch({ type: 'LOAD', payload: INITIAL_GAMESTATE });
    setScreen('character_select');
  }

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setScreen('tristram')}>
          ← Tristram
        </button>
        <span className="title-medium">Settings</span>
      </div>

      <div className="panel" style={{ padding: '16px', flexShrink: 0 }}>
        <div className="title-small" style={{ marginBottom: '8px' }}>New Game</div>
        <div className="divider" />
        <div className="text-flavor" style={{ fontSize: '12px', marginTop: '10px', marginBottom: '14px' }}>
          Starting a new game will permanently erase your current character, all progress, items, and history.
          This cannot be undone.
        </div>

        {step === 1 && (
          <div className="penalty-banner" style={{ marginBottom: '12px' }}>
            <div className="text-red" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
              Are you certain? Your character will be lost forever.
            </div>
          </div>
        )}

        <button
          className="btn btn-danger btn-full"
          onClick={handleReset}
          disabled={step === 2}
          style={{ fontSize: '13px' }}
        >
          {step === 0 && 'New Game'}
          {step === 1 && 'Yes — Erase everything and start over'}
          {step === 2 && 'Resetting...'}
        </button>

        {step === 1 && (
          <button
            className="btn btn-ghost btn-full"
            onClick={() => setStep(0)}
            style={{ marginTop: '6px', fontSize: '12px' }}
          >
            Cancel
          </button>
        )}
      </div>

      <div className="panel" style={{ padding: '16px' }}>
        <div className="title-small" style={{ marginBottom: '8px' }}>About</div>
        <div className="divider" />
        <div className="text-dim" style={{ fontSize: '12px', marginTop: '10px', lineHeight: 1.8 }}>
          Diablo Push-Up — A push-up training tool with a Diablo 1 theme.<br />
          Honor system: only you know if you completed the push-ups.<br />
          Train hard. The dungeon will wait.
        </div>
      </div>
    </div>
  );
}
