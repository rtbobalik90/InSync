/* Shared product contracts. Phase 2 keeps domain names, AI skill boundaries
   and privacy rules stable while the Intelligence layer attaches real policy,
   context and prompt contracts behind them. */
(function () {
  'use strict';

  var AI_SKILLS = {
    daily:       { id: 'daily',       context: ['user', 'today', 'recent', 'journey', 'partner-shared'] },
    trainer:     { id: 'trainer',     context: ['user', 'today', 'recent', 'training'] },
    nutrition:   { id: 'nutrition',   context: ['user', 'today', 'recent', 'nutrition'] },
    faith:       { id: 'faith',       context: ['user', 'faith'] },
    weekly:      { id: 'weekly',      context: ['user', 'recent', 'training', 'nutrition', 'journey', 'faith', 'partner-shared'] },
    expedition:  { id: 'expedition',  context: ['user', 'journey', 'partner-shared'] },
    encouragement:{ id: 'encouragement', context: ['user', 'partner-shared'] }
  };

  var PRIVACY = {
    privateOnly: ['exact-weight', 'exact-meals', 'lift-loads', 'photos', 'prayer-journal', 'reflection-text'],
    shareableBySetting: ['calories', 'workouts', 'steps'],
    pairCore: ['display-name', 'points', 'streak', 'earned-badges', 'messages', 'expedition']
  };

  var EVENTS = {
    DAY_CLOSED: 'day.closed',
    WORKOUT_COMPLETED: 'training.completed',
    WALK_RECORDED: 'walk.recorded',
    PROTEIN_TARGET: 'nutrition.protein-target',
    EXPEDITION_LEG: 'journey.leg-completed',
    EXPEDITION_COMPLETED: 'journey.expedition-completed',
    BADGE_EARNED: 'achievement.earned',
    DUO_MISSION: 'together.duo-mission',
    FAITH_MILESTONE: 'faith.milestone'
  };

  window.InSyncContracts = {
    version: 2,
    aiSkills: AI_SKILLS,
    privacy: PRIVACY,
    events: EVENTS
  };
})();
