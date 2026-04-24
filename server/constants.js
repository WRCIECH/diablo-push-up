// Calibration constants — tune these during playtests
// See GDD section "Stałe wymagające kalibracji" for full descriptions

const CONSTANTS = {
  // How many monster HP points equal 1 push-up
  // Zombie (HP 4-7) at 0.5 = 2-4 push-ups
  PUSH_UP_RATIO: 0.5,

  // Seconds of fight time removed per 1 point of monster Damage (per successful monster hit roll)
  DAMAGE_TO_SECONDS: 3,

  // Base fight time in seconds before monster damage reductions
  BASE_FIGHT_TIME: 120,

  // Seconds added to the vitality buffer per 1 point of player Vitality
  VITALITY_TO_SECONDS: 2,

  // Seconds added to base fight time when player drinks a Healing Potion during a fight
  HEALING_POTION_SECONDS: 30,

  // Hit chance clamp bounds (applied to both player ToHit% and monster ToHit%)
  HIT_CHANCE_MIN: 0.05,
  HIT_CHANCE_MAX: 0.95,

  // Penalty duration after a fight loss — 2 hours in milliseconds
  PENALTY_DURATION_MS: 2 * 60 * 60 * 1000,
};

module.exports = CONSTANTS;
