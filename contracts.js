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

  /* Cookbook records move through independent culinary and nutrition gates.
     A record may be displayed while it is a draft, but only approved records
     may be represented as verified content. */
  var COOKBOOK = {
    schemaVersion: 1,
    measurementModes: ['standard', 'weight'],
    mealSlots: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    recipeStatuses: ['draft-calculated', 'culinary-reviewed', 'nutrition-reviewed', 'production-approved'],
    dinerCount: { minimum: 1, maximum: 20 },
    approvalRequires: ['culinary-review', 'nutrition-review', 'release-approval']
  };

  window.InSyncContracts = {
    version: 3,
    aiSkills: AI_SKILLS,
    privacy: PRIVACY,
    events: EVENTS,
    cookbook: COOKBOOK
  };
})();
