/* Shared product contracts. Phase 1 centralizes names and boundaries first;
   later phases can attach implementations without inventing incompatible
   shapes in individual screens. */
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
    version: 1,
    aiSkills: AI_SKILLS,
    privacy: PRIVACY,
    events: EVENTS
  };
})();
