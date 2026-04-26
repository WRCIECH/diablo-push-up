import React from 'react';

function SwordContents() {
  return <>
    <polygon points="20,3 22.5,26 17.5,26" fill="#b0bac4"/>
    <line x1="20" y1="5" x2="20.5" y2="23" stroke="#dce4ec" strokeWidth="0.7"/>
    <rect x="9" y="24" width="22" height="4" rx="1.5" fill="#6a5030"/>
    <rect x="18" y="28" width="4" height="8" rx="1" fill="#4a2e18"/>
    {[29,31,33].map(y => <line key={y} x1="18.5" y1={y} x2="21.5" y2={y} stroke="#3a2010" strokeWidth="0.8"/>)}
    <ellipse cx="20" cy="37" rx="3.5" ry="2.5" fill="#7a6040"/>
  </>;
}

function DaggerContents() {
  return <>
    <polygon points="20,7 21.5,27 18.5,27" fill="#b0bac4"/>
    <line x1="20" y1="9" x2="20" y2="25" stroke="#dce4ec" strokeWidth="0.7"/>
    <rect x="13" y="25" width="14" height="3" rx="1" fill="#6a5030"/>
    <rect x="18.5" y="28" width="3" height="6" rx="0.5" fill="#4a2e18"/>
    <circle cx="20" cy="36" r="2.5" fill="#7a6040"/>
  </>;
}

function BowContents() {
  return <>
    <path d="M 18,4 Q 7,20 18,36" fill="none" stroke="#7a5030" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="18" y1="4" x2="18" y2="36" stroke="#c8b080" strokeWidth="0.8"/>
    <line x1="26" y1="9" x2="26" y2="31" stroke="#8a6040" strokeWidth="1.5"/>
    <polygon points="26,7 24,13 28,13" fill="#8a6040"/>
    <polygon points="24,30 26,34 28,30" fill="#bb4444"/>
    <line x1="18" y1="20" x2="26" y2="20" stroke="#c8b080" strokeWidth="0.6"/>
  </>;
}

function BluntContents() {
  return <>
    <ellipse cx="20" cy="11" rx="9" ry="8" fill="#6a6a72"/>
    <polygon points="20,2 22,7 18,7" fill="#9a9aa4"/>
    <polygon points="29,7 26,10 30,13" fill="#9a9aa4"/>
    <polygon points="11,7 14,10 10,13" fill="#9a9aa4"/>
    <ellipse cx="20" cy="11" rx="4" ry="3" fill="#4a4a52"/>
    <rect x="18.5" y="18" width="3" height="16" rx="1" fill="#4a2e18"/>
    {[21,24,27,30].map(y => <line key={y} x1="19" y1={y} x2="22" y2={y} stroke="#3a2010" strokeWidth="0.8"/>)}
    <circle cx="20" cy="36" r="3" fill="#5a5a62"/>
  </>;
}

function AxeContents() {
  return <>
    <rect x="19" y="10" width="3" height="24" rx="1" fill="#4a2e18"/>
    <path d="M 20,8 L 33,12 L 31,26 L 20,26 Z" fill="#8a9098" stroke="#b0b8c0" strokeWidth="0.8"/>
    <line x1="20" y1="8" x2="33" y2="12" stroke="#d0d8e0" strokeWidth="1.2"/>
    <circle cx="20" cy="36" r="2.5" fill="#5a4020"/>
  </>;
}

function ShieldContents() {
  return <>
    <path d="M 7,6 L 33,6 L 33,26 Q 20,40 20,40 Q 20,40 7,26 Z" fill="#5a3e20" stroke="#8a6a34" strokeWidth="1.5"/>
    <path d="M 9,8 L 31,8 L 31,24 Q 20,36 20,36 Q 20,36 9,24 Z" fill="#6a4e2a" opacity="0.5"/>
    <circle cx="20" cy="21" r="5" fill="#9a8050" stroke="#c0a060" strokeWidth="1"/>
    <line x1="20" y1="7" x2="20" y2="37" stroke="#7a5a28" strokeWidth="0.8"/>
    <line x1="7" y1="18" x2="33" y2="18" stroke="#7a5a28" strokeWidth="0.8"/>
  </>;
}

function HelmContents() {
  return <>
    <path d="M 7,24 Q 7,5 20,4 Q 33,5 33,24 Z" fill="#78787e" stroke="#9a9aa4" strokeWidth="1"/>
    <rect x="6" y="22" width="28" height="5" rx="1" fill="#54545a" stroke="#7a7a82" strokeWidth="1"/>
    <rect x="10" y="24" width="20" height="3" rx="0.5" fill="#1e1e24"/>
    <rect x="6" y="26" width="6" height="8" rx="1" fill="#54545a"/>
    <rect x="28" y="26" width="6" height="8" rx="1" fill="#54545a"/>
    <rect x="18.5" y="23" width="3" height="9" rx="0.5" fill="#44444a"/>
  </>;
}

function ArmorContents() {
  return <>
    <ellipse cx="9"  cy="12" rx="7" ry="6" fill="#68686e"/>
    <ellipse cx="31" cy="12" rx="7" ry="6" fill="#68686e"/>
    <path d="M 12,10 L 28,10 L 30,33 L 10,33 Z" fill="#74747c" stroke="#9696a0" strokeWidth="1"/>
    <line x1="20" y1="11" x2="20" y2="32" stroke="#54545c" strokeWidth="1"/>
    <ellipse cx="20" cy="21" rx="4" ry="5" fill="#64646c" stroke="#88889a" strokeWidth="0.8"/>
    <rect x="10" y="31" width="20" height="4" rx="1" fill="#5a3e1a" stroke="#7a5e2a" strokeWidth="0.5"/>
  </>;
}

function PotionContents({ full }) {
  const col = full ? '#c4991e' : '#cc2222';
  const hi  = full ? '#f0c040' : '#ee4444';
  const sh  = full ? '#8a6010' : '#881111';
  return <>
    <rect x="16" y="6" width="8" height="5" rx="1.5" fill="#7a5e38"/>
    <rect x="17.5" y="10" width="5" height="5" fill={col} opacity="0.8"/>
    <ellipse cx="20" cy="27" rx="11" ry="13" fill={col}/>
    <ellipse cx="16" cy="22" rx="3.5" ry="5" fill={hi} opacity="0.4"/>
    <ellipse cx="20" cy="37" rx="9" ry="2.5" fill={sh} opacity="0.5"/>
  </>;
}

export default function ItemIcon({ item, size = 40 }) {
  if (!item) return null;
  const id   = item.id   || '';
  const slot = item.slot || '';

  let contents;
  if (slot === 'potion')                   contents = <PotionContents full={item.heal === 'full'}/>;
  else if (slot === 'shield')              contents = <ShieldContents/>;
  else if (slot === 'helm')                contents = <HelmContents/>;
  else if (slot === 'armor')               contents = <ArmorContents/>;
  else if (id === 'short_bow')             contents = <BowContents/>;
  else if (id === 'hand_axe')              contents = <AxeContents/>;
  else if (id === 'mace' || id === 'club') contents = <BluntContents/>;
  else if (id === 'dagger')                contents = <DaggerContents/>;
  else                                     contents = <SwordContents/>;

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} xmlns="http://www.w3.org/2000/svg"
         style={{ display: 'block' }}>
      {contents}
    </svg>
  );
}
