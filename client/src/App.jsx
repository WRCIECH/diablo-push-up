import React from 'react';
import { GameProvider, useGame } from './context/GameContext.jsx';
import CharacterSelect  from './screens/CharacterSelect.jsx';
import Tristram         from './screens/Tristram.jsx';
import CharacterScreen  from './screens/CharacterScreen.jsx';
import CainScreen       from './screens/CainScreen.jsx';
import GriswoldScreen   from './screens/GriswoldScreen.jsx';
import PepinScreen      from './screens/PepinScreen.jsx';
import SettingsScreen   from './screens/SettingsScreen.jsx';
import DungeonScreen    from './screens/DungeonScreen.jsx';
import FightPreScreen   from './screens/FightPreScreen.jsx';
import LootScreen       from './screens/LootScreen.jsx';
import ChestScreen      from './screens/ChestScreen.jsx';

function GameRouter() {
  const { screen, loading, error, state } = useGame();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-sigil" />
        <span className="text-gold" style={{ fontFamily: 'var(--font-ui)', letterSpacing: '0.06em' }}>
          ENTERING TRISTRAM...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-screen">
        <span className="text-red" style={{ textAlign: 'center', padding: '20px', fontFamily: 'var(--font-body)' }}>
          Failed to connect to server.<br />
          <small className="text-dim">Make sure the server is running on port 3001.</small>
        </span>
      </div>
    );
  }

  // NPC screens require an active player
  const needsPlayer = ['tristram', 'character', 'cain', 'griswold', 'pepin', 'settings'];
  if (needsPlayer.includes(screen) && !state?.player) {
    return <CharacterSelect />;
  }

  switch (screen) {
    case 'character_select': return <CharacterSelect />;
    case 'tristram':         return <Tristram />;
    case 'character':        return <CharacterScreen />;
    case 'cain':             return <CainScreen />;
    case 'griswold':         return <GriswoldScreen />;
    case 'pepin':            return <PepinScreen />;
    case 'settings':         return <SettingsScreen />;
    case 'dungeon':    return <DungeonScreen />;
    case 'fight_pre':  return <FightPreScreen />;
    case 'loot':       return <LootScreen />;
    case 'chest':      return <ChestScreen />;
    default:           return <Tristram />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
