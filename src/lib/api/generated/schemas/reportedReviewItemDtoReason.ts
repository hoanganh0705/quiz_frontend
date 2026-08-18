

export type ReportedReviewItemDtoReason = typeof ReportedReviewItemDtoReason[keyof typeof ReportedReviewItemDtoReason];

export const ReportedReviewItemDtoReason = {
spam: 'spam',
harassment: 'harassment',
inappropriate_content: 'inappropriate_content',
misinformation: 'misinformation',
other: 'other',
} as const;
