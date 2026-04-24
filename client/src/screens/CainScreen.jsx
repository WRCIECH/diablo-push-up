import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { resolveItemName, qualityColor } from '../utils/items.js';
import { useMusic } from '../hooks/useMusic.js';

const IDENTIFY_COST = 100;

const DIALOGS = {
  idle: 'Stay a while and listen, adventurer. These are dark times. The evil that stirs beneath this cathedral has awakened forces I have not seen in a lifetime of study.',
  no_items: 'I see nothing upon your person that requires my expertise. Return when you have found items of a magical nature.',
  no_gold: 'I\'m afraid I cannot identify this without proper compensation. My fee is 100 gold pieces — not a copper less, I assure you.',
  identified: 'Ah yes, a most interesting item. The enchantments within are now revealed to you. Use it well, adventurer.',
};

function CainPortrait() {
  return (
    <svg viewBox="0 0 80 96" width="80" height="96" xmlns="http://www.w3.org/2000/svg">
      {/* Robe */}
      <path d="M24,48 Q20,60 18,90 L62,90 Q60,60 56,48 Z" fill="#2a1a08" stroke="#6b4f1a" strokeWidth="1.5"/>
      {/* Beard */}
      <path d="M32,34 Q28,46 30,56 L40,54 L50,56 Q52,46 48,34 Z" fill="#c8b78a" opacity="0.9"/>
      {/* Head */}
      <ellipse cx="40" cy="28" rx="14" ry="16" fill="#5a3a20" stroke="#6b4f1a" strokeWidth="1"/>
      {/* Hood */}
      <path d="M26,28 Q28,10 40,8 Q52,10 54,28 L52,32 Q40,22 28,32 Z" fill="#1e1208" stroke="#6b4f1a" strokeWidth="1.5"/>
      {/* Eyes */}
      <ellipse cx="35" cy="27" rx="2" ry="1.5" fill="#c8b78a"/>
      <ellipse cx="45" cy="27" rx="2" ry="1.5" fill="#c8b78a"/>
      {/* Eyebrows */}
      <path d="M33,24 Q35,22 37,24" fill="none" stroke="#c8b78a" strokeWidth="1"/>
      <path d="M43,24 Q45,22 47,24" fill="none" stroke="#c8b78a" strokeWidth="1"/>
      {/* Staff */}
      <rect x="58" y="20" width="4" height="70" rx="1" fill="#5a3a20"/>
      <circle cx="60" cy="18" r="5" fill="#c4991e" opacity="0.8"/>
      <circle cx="60" cy="18" r="3" fill="#f0c040"/>
      {/* Book */}
      <rect x="20" y="68" width="16" height="14" rx="2" fill="#3a2a0e" stroke="#6b4f1a" strokeWidth="1"/>
      <line x1="28" y1="68" x2="28" y2="82" stroke="#6b4f1a" strokeWidth="0.5"/>
    </svg>
  );
}

export default function CainScreen() {
  useMusic('/audio/tristram.mp3');   // continue Tristram music
  const { state, dispatchAndSave, setScreen } = useGame();
  const player = state.player;

  const unidentifiedItems = player.inventory.filter(
    i => (i.quality === 'magic' || i.quality === 'unique') && !i.identified
  );

  const [dialog, setDialog] = useState(
    unidentifiedItems.length === 0 ? 'no_items' : 'idle'
  );
  const [lastIdentified, setLastIdentified] = useState(null);

  function handleIdentify(item) {
    if (player.gold < IDENTIFY_COST) {
      setDialog('no_gold');
      return;
    }
    dispatchAndSave({ type: 'SPEND_GOLD', payload: IDENTIFY_COST });
    dispatchAndSave({ type: 'IDENTIFY_ITEM', payload: item.uid });
    setLastIdentified(item);
    setDialog('identified');
  }

  const remaining = player.inventory.filter(
    i => (i.quality === 'magic' || i.quality === 'unique') && !i.identified
  );

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setScreen('tristram')}>
          ← Tristram
        </button>
        <span className="title-medium">Deckard Cain</span>
      </div>

      {/* Portrait + dialog */}
      <div className="panel" style={{ padding: '14px', display: 'flex', gap: '14px', alignItems: 'flex-start', flexShrink: 0 }}>
        <div style={{ flexShrink: 0 }}>
          <CainPortrait />
        </div>
        <div style={{ flex: 1 }}>
          <div className="title-small" style={{ color: 'var(--text-gold)', marginBottom: '8px' }}>Deckard Cain</div>
          <div className="text-flavor" style={{ fontSize: '12px', lineHeight: 1.8 }}>
            "{DIALOGS[dialog]}"
          </div>
          {lastIdentified && dialog === 'identified' && (
            <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--bg-input)', borderRadius: '2px' }}>
              <span style={{ color: qualityColor(lastIdentified.quality), fontSize: '12px' }}>
                {lastIdentified.magic_name || lastIdentified.name}
              </span>
              <span className="text-dim" style={{ fontSize: '11px' }}> — revealed</span>
            </div>
          )}
        </div>
      </div>

      {/* Identify list */}
      <div className="panel scrollable" style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
        <div className="title-small" style={{ marginBottom: '4px' }}>
          Unidentified Items
          <span className="text-dim" style={{ marginLeft: '8px', fontSize: '11px', textTransform: 'none', letterSpacing: 0 }}>
            · {IDENTIFY_COST}g each
          </span>
        </div>

        {remaining.length === 0 && (
          <div className="text-dim" style={{ fontSize: '12px', fontStyle: 'italic', padding: '12px 0' }}>
            Nothing to identify
          </div>
        )}

        {remaining.map(item => (
          <div
            key={item.uid}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '2px' }}
          >
            <div>
              <div style={{ color: qualityColor(item.quality), fontSize: '13px' }}>
                Unidentified {item.name}
              </div>
              <div className="text-dim" style={{ fontSize: '11px' }}>
                {item.quality === 'magic' ? 'Magical' : 'Unique'} · {IDENTIFY_COST}g
              </div>
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: '11px' }}
              disabled={player.gold < IDENTIFY_COST}
              onClick={() => handleIdentify(item)}
            >
              Identify
            </button>
          </div>
        ))}
      </div>

      {/* Gold */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
        <span className="text-dim" style={{ fontSize: '12px' }}>Gold: </span>
        <span className="text-gold" style={{ fontSize: '14px', fontWeight: 700, marginLeft: '6px' }}>{player.gold}</span>
      </div>
    </div>
  );
}
