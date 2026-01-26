;[
  /* =========================
     PROGRESS / MILESTONES (10)
     ========================= */
  {
    id: 'ach_first_quiz',
    name: 'First Steps',
    description: 'Complete your first quiz.',
    icon: 'trophy',
    condition: { type: 'QUIZ_COMPLETED_TOTAL', value: 1 }
  },
  {
    id: 'ach_quiz_5',
    name: 'Getting Started',
    description: 'Complete 5 quizzes.',
    icon: 'star',
    condition: { type: 'QUIZ_COMPLETED_TOTAL', value: 5 }
  },
  {
    id: 'ach_quiz_10',
    name: 'Quiz Rookie',
    description: 'Complete 10 quizzes.',
    icon: 'badge',
    condition: { type: 'QUIZ_COMPLETED_TOTAL', value: 10 }
  },
  {
    id: 'ach_quiz_25',
    name: 'Quiz Grinder',
    description: 'Complete 25 quizzes.',
    icon: 'medal',
    condition: { type: 'QUIZ_COMPLETED_TOTAL', value: 25 }
  },
  {
    id: 'ach_quiz_50',
    name: 'Quiz Veteran',
    description: 'Complete 50 quizzes.',
    icon: 'medal',
    condition: { type: 'QUIZ_COMPLETED_TOTAL', value: 50 }
  },
  {
    id: 'ach_quiz_100',
    name: 'Quiz Legend',
    description: 'Complete 100 quizzes.',
    icon: 'crown',
    condition: { type: 'QUIZ_COMPLETED_TOTAL', value: 100 }
  },
  {
    id: 'ach_categories_3',
    name: 'Category Explorer',
    description: 'Complete quizzes in 3 different categories.',
    icon: 'compass',
    condition: { type: 'CATEGORIES_PLAYED_UNIQUE', value: 3 }
  },
  {
    id: 'ach_categories_5',
    name: 'Master Explorer',
    description: 'Complete quizzes in 5 different categories.',
    icon: 'map',
    condition: { type: 'CATEGORIES_PLAYED_UNIQUE', value: 5 }
  },
  {
    id: 'ach_all_categories',
    name: 'World Explorer',
    description: 'Complete at least 1 quiz in all categories.',
    icon: 'globe',
    condition: { type: 'ALL_CATEGORIES_COMPLETED', value: true }
  },
  {
    id: 'ach_daily_quiz',
    name: 'Daily Learner',
    description: 'Complete at least 1 quiz today.',
    icon: 'calendar',
    condition: { type: 'QUIZ_COMPLETED_TODAY', value: 1 }
  },

  /* ===================
     SKILL / ACCURACY (10)
     =================== */
  {
    id: 'ach_perfect_score',
    name: 'Perfect Score',
    description: 'Get 100% on a quiz.',
    icon: 'sparkles',
    condition: { type: 'QUIZ_SCORE_PERCENT_MIN', value: 100 }
  },
  {
    id: 'ach_almost_perfect',
    name: 'Almost Perfect',
    description: 'Get 90% or higher on a quiz.',
    icon: 'diamond',
    condition: { type: 'QUIZ_SCORE_PERCENT_MIN', value: 90 }
  },
  {
    id: 'ach_great_score',
    name: 'Great Score',
    description: 'Get 80% or higher on a quiz.',
    icon: 'star',
    condition: { type: 'QUIZ_SCORE_PERCENT_MIN', value: 80 }
  },
  {
    id: 'ach_clean_run',
    name: 'Clean Run',
    description: 'Complete a quiz with 0 wrong answers.',
    icon: 'check',
    condition: { type: 'QUIZ_WRONG_ANSWERS_MAX', value: 0 }
  },
  {
    id: 'ach_correct_streak_10',
    name: 'No Mistakes',
    description: 'Answer 10 questions correctly in a row.',
    icon: 'check_circle',
    condition: { type: 'CORRECT_ANSWERS_STREAK', value: 10 }
  },
  {
    id: 'ach_correct_streak_25',
    name: 'Unstoppable',
    description: 'Answer 25 questions correctly in a row.',
    icon: 'shield',
    condition: { type: 'CORRECT_ANSWERS_STREAK', value: 25 }
  },
  {
    id: 'ach_consistent_5',
    name: 'Consistent Performer',
    description: 'Score 80%+ in 5 quizzes in a row.',
    icon: 'target',
    condition: { type: 'QUIZ_SCORE_STREAK_PERCENT_MIN', value: 80, count: 5 }
  },
  {
    id: 'ach_avg_10',
    name: 'Skilled Learner',
    description: 'Reach an average score of 75%+ across 10 quizzes.',
    icon: 'brain',
    condition: { type: 'QUIZ_AVG_SCORE_PERCENT_MIN', value: 75, count: 10 }
  },
  {
    id: 'ach_expert_30',
    name: 'Expert',
    description: 'Reach an average score of 85%+ across 30 quizzes.',
    icon: 'graduation_cap',
    condition: { type: 'QUIZ_AVG_SCORE_PERCENT_MIN', value: 85, count: 30 }
  },
  {
    id: 'ach_genius_5',
    name: 'Genius Mode',
    description: 'Get 100% score 5 times.',
    icon: 'crown',
    condition: { type: 'PERFECT_SCORE_TOTAL', value: 5 }
  },

  /* ======================
     STREAK / HABIT (10)
     ====================== */
  {
    id: 'ach_streak_2',
    name: '2-Day Streak',
    description: 'Complete quizzes 2 days in a row.',
    icon: 'flame',
    condition: { type: 'DAILY_STREAK', value: 2 }
  },
  {
    id: 'ach_streak_7',
    name: '7-Day Streak',
    description: 'Complete quizzes 7 days in a row.',
    icon: 'flame',
    condition: { type: 'DAILY_STREAK', value: 7 }
  },
  {
    id: 'ach_streak_14',
    name: '14-Day Streak',
    description: 'Complete quizzes 14 days in a row.',
    icon: 'fire',
    condition: { type: 'DAILY_STREAK', value: 14 }
  },
  {
    id: 'ach_streak_30',
    name: '30-Day Streak',
    description: 'Complete quizzes 30 days in a row.',
    icon: 'fire',
    condition: { type: 'DAILY_STREAK', value: 30 }
  },
  {
    id: 'ach_streak_60',
    name: '60-Day Streak',
    description: 'Complete quizzes 60 days in a row.',
    icon: 'fire',
    condition: { type: 'DAILY_STREAK', value: 60 }
  },
  {
    id: 'ach_weekly_warrior',
    name: 'Weekly Warrior',
    description: 'Complete 7 quizzes in one week.',
    icon: 'shield',
    condition: { type: 'QUIZ_COMPLETED_IN_WEEK_MIN', value: 7 }
  },
  {
    id: 'ach_weekly_master',
    name: 'Weekly Master',
    description: 'Complete 20 quizzes in one week.',
    icon: 'shield_star',
    condition: { type: 'QUIZ_COMPLETED_IN_WEEK_MIN', value: 20 }
  },
  {
    id: 'ach_never_miss_week',
    name: 'Never Missed a Week',
    description: 'Stay active 4 weeks in a row.',
    icon: 'calendar_check',
    condition: { type: 'WEEKLY_STREAK', value: 4 }
  },
  {
    id: 'ach_monthly_active',
    name: 'Monthly Regular',
    description: 'Complete quizzes in 20 different days in a month.',
    icon: 'calendar_clock',
    condition: { type: 'ACTIVE_DAYS_IN_MONTH_MIN', value: 20 }
  },
  {
    id: 'ach_long_session',
    name: 'Marathon Session',
    description: 'Complete 5 quizzes in a single session.',
    icon: 'infinity',
    condition: { type: 'QUIZ_COMPLETED_IN_SESSION_MIN', value: 5 }
  },

  /* ===================
     SPEED / TIME (10)
     =================== */
  {
    id: 'ach_fast_finisher',
    name: 'Fast Finisher',
    description: 'Finish a quiz under 2 minutes.',
    icon: 'bolt',
    condition: { type: 'QUIZ_FINISH_TIME_SEC_MAX', value: 120 }
  },
  {
    id: 'ach_ultra_fast',
    name: 'Speed Runner',
    description: 'Finish a quiz under 60 seconds.',
    icon: 'rocket',
    condition: { type: 'QUIZ_FINISH_TIME_SEC_MAX', value: 60 }
  },
  {
    id: 'ach_lightning_round',
    name: 'Lightning Round',
    description: 'Average answer time under 3 seconds.',
    icon: 'zap',
    condition: { type: 'AVG_ANSWER_TIME_SEC_MAX', value: 3 }
  },
  {
    id: 'ach_speed_accuracy',
    name: 'Speed + Accuracy',
    description: 'Score 90%+ while finishing under 2 minutes.',
    icon: 'rocket',
    condition: {
      type: 'COMBINED',
      all: [
        { type: 'QUIZ_SCORE_PERCENT_MIN', value: 90 },
        { type: 'QUIZ_FINISH_TIME_SEC_MAX', value: 120 }
      ]
    }
  },
  {
    id: 'ach_no_pause',
    name: 'No Time Wasted',
    description: 'Finish a quiz without pausing.',
    icon: 'clock',
    condition: { type: 'QUIZ_PAUSED', value: false }
  },
  {
    id: 'ach_quick_10',
    name: 'Quick Learner',
    description: 'Finish 10 timed quizzes.',
    icon: 'stopwatch',
    condition: { type: 'TIMED_QUIZ_COMPLETED_TOTAL', value: 10 }
  },
  {
    id: 'ach_quick_50',
    name: 'Time Master',
    description: 'Finish 50 timed quizzes.',
    icon: 'stopwatch_star',
    condition: { type: 'TIMED_QUIZ_COMPLETED_TOTAL', value: 50 }
  },
  {
    id: 'ach_under_pressure',
    name: 'Under Pressure',
    description: 'Finish a quiz with less than 5 seconds remaining.',
    icon: 'alarm',
    condition: { type: 'QUIZ_TIME_REMAINING_SEC_MAX', value: 5 }
  },
  {
    id: 'ach_consistent_speed',
    name: 'Steady Hands',
    description: 'Average answer time under 5 seconds for 5 quizzes in a row.',
    icon: 'hand',
    condition: { type: 'AVG_ANSWER_TIME_STREAK_SEC_MAX', value: 5, count: 5 }
  },
  {
    id: 'ach_one_shot',
    name: 'One Shot',
    description: 'Answer all questions without changing any answer.',
    icon: 'pin',
    condition: { type: 'QUIZ_CHANGED_ANSWERS_MAX', value: 0 }
  },

  /* ======================
     CHALLENGE / HARDCORE (10)
     ====================== */
  {
    id: 'ach_hard_mode',
    name: 'Hard Mode Winner',
    description: 'Complete a Hard difficulty quiz.',
    icon: 'skull',
    condition: { type: 'QUIZ_COMPLETED_DIFFICULTY', value: 'HARD' }
  },
  {
    id: 'ach_boss_quiz',
    name: 'Beat the Boss',
    description: 'Complete a Boss quiz.',
    icon: 'sword',
    condition: { type: 'QUIZ_COMPLETED_SPECIAL', value: 'BOSS' }
  },
  {
    id: 'ach_no_hint',
    name: 'No Hints',
    description: 'Finish a quiz without using hints.',
    icon: 'eye_off',
    condition: { type: 'QUIZ_USED_HINT', value: false }
  },
  {
    id: 'ach_no_skip',
    name: 'No Skips',
    description: 'Finish a quiz without skipping any question.',
    icon: 'lock',
    condition: { type: 'QUIZ_SKIPPED_QUESTIONS', value: 0 }
  },
  {
    id: 'ach_comeback_king',
    name: 'Comeback King',
    description: 'Improve from <50% to >80% on a retry.',
    icon: 'refresh',
    condition: {
      type: 'IMPROVEMENT_RETRY',
      fromPercentMax: 49,
      toPercentMin: 80
    }
  },
  {
    id: 'ach_redemption',
    name: 'Redemption Arc',
    description: 'Fail a quiz then pass the same quiz later.',
    icon: 'repeat',
    condition: { type: 'FAILED_THEN_PASSED_SAME_QUIZ', value: true }
  },
  {
    id: 'ach_three_wins',
    name: '3 Wins in a Row',
    description: 'Win 3 quizzes in a row.',
    icon: 'swords',
    condition: { type: 'QUIZ_WIN_STREAK', value: 3 }
  },
  {
    id: 'ach_ten_wins',
    name: '10 Wins in a Row',
    description: 'Win 10 quizzes in a row.',
    icon: 'crown',
    condition: { type: 'QUIZ_WIN_STREAK', value: 10 }
  },
  {
    id: 'ach_never_give_up',
    name: 'Never Give Up',
    description: 'Retry the same quiz 5 times.',
    icon: 'hammer',
    condition: { type: 'RETRY_SAME_QUIZ_MIN', value: 5 }
  },
  {
    id: 'ach_daily_boss',
    name: 'Daily Boss Slayer',
    description: 'Complete 7 Boss quizzes in total.',
    icon: 'crown_skull',
    condition: { type: 'BOSS_QUIZ_COMPLETED_TOTAL', value: 7 }
  }
]
