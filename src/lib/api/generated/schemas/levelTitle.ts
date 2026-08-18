

export type LevelTitle = typeof LevelTitle[keyof typeof LevelTitle];

export const LevelTitle = {
novice: 'novice',
apprentice: 'apprentice',
competitor: 'competitor',
specialist: 'specialist',
expert: 'expert',
master: 'master',
grandmaster: 'grandmaster',
legend: 'legend',
} as const;
