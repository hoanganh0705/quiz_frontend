

import {
IRREVERSIBLE_OPERATIONS,
} from '../admin-capabilities';

export const RANKING_RECALCULATE_CONFIRM_KEY = 'ranking.recalculate' as const;

export const RANKING_RESET_CONFIRM_KEY = 'ranking.reset' as const;

export type RankingConfirmKey =
| typeof RANKING_RECALCULATE_CONFIRM_KEY
  | typeof RANKING_RESET_CONFIRM_KEY;

export const RANKING_RECALCULATE_CONFIRM_STRING: string = (() => {
const entry = IRREVERSIBLE_OPERATIONS.find(
(op) => op.operation === 'ranking.recalculate',
  );
if (!entry) {
throw new Error(
'[ranking-confirm-strings] `ranking.recalculate` not found in IRREVERSIBLE_OPERATIONS. ' +
'Ensure TKT-7.1.A5 has been completed.',
    );
  }
return entry.confirmString;
})();

export const RANKING_RESET_CONFIRM_STRING: string = (() => {
const entry = IRREVERSIBLE_OPERATIONS.find(
(op) => op.operation === 'ranking.reset',
  );
if (!entry) {
throw new Error(
'[ranking-confirm-strings] `ranking.reset` not found in IRREVERSIBLE_OPERATIONS. ' +
'Ensure TKT-7.1.A5 has been completed.',
    );
  }
return entry.confirmString;
})();

export const RANKING_RECALCULATE_LABEL = 'Recalculate rankings';

export const RANKING_RESET_LABEL = 'Reset ranking period';

export const RANKING_RECALCULATE_IRREVERSIBILITY_NOTICE =
'Recalculating rankings will re-compute all scores based on the latest ' +
'quiz attempts. This operation may take several minutes and affects every ' +
'user on the leaderboard.';

export const RANKING_RESET_IRREVERSIBILITY_NOTICE =
'Resetting the ranking period will clear all rankings and XP for the ' +
'selected period. This affects every user and cannot be undone. All ' +
'leaderboard positions for this period will be cleared.';

export interface RankingConfirmMetadata {

key: RankingConfirmKey;

label: string;

confirmString: string;

irreversibilityNotice: string;
}

export function getRankingConfirmMetadata(
action: 'recalculate' | 'reset',
): RankingConfirmMetadata {
if (action === 'recalculate') {
return {
key: RANKING_RECALCULATE_CONFIRM_KEY,
label: RANKING_RECALCULATE_LABEL,
confirmString: RANKING_RECALCULATE_CONFIRM_STRING,
irreversibilityNotice: RANKING_RECALCULATE_IRREVERSIBILITY_NOTICE,
    };
  }
return {
key: RANKING_RESET_CONFIRM_KEY,
label: RANKING_RESET_LABEL,
confirmString: RANKING_RESET_CONFIRM_STRING,
irreversibilityNotice: RANKING_RESET_IRREVERSIBILITY_NOTICE,
  };
}
