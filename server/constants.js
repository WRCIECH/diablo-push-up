// Calibration constants — tune these during playtests
// See GDD section "Stałe wymagające kalibracji" for full descriptions

const CONSTANTS = {
  /* 
   Constants that can't be modified during whole game
  */
  // How many vitality points equal 1 push-up
  PUSH_UP_RATIO: 1.0,

  // Life points restored when player drinks a Healing Potion
  HEALING_POTION_LIFE_ADDITION: 30,

  // Skip chance added per 1 point of Dexterity (0.003 = 0.3% per DEX point)
  SKIP_CHANCE_PER_ONE_DEXTERITY: 0.003,

  // Life points per player level
  LIFE_PER_LEVEL: 2,

  // Life points per 1 point of Vitality
  LIFE_POINTS_PER_ONE_VITALITY: 5.0,

  // Life drain after buffer: minimum hit fraction when monster.toHit/100 − playerAC/100 ≤ 0
  MINIMAL_DAMAGE_CHANCE: 0.01,

  /* 
   Constants that can be modified during whole game
  */
  // Prep buffer: estimated seconds to complete one push-up
  SECONDS_PER_PUSH_UP: 1.5,

  // Prep buffer: fixed setup time before push-ups begin
  PUSH_UP_PREPARATION_TIME: 5.0,


  // Life drain after buffer: flat HP/s added on top of the hit-based component
  MINIMAL_DAMAGE_PER_SECOND: 1,

  // Penalty duration after a fight loss — 2 hours in milliseconds
  PENALTY_DURATION_MS: 2 * 60 * 60 * 1000,
};

module.exports = CONSTANTS;
