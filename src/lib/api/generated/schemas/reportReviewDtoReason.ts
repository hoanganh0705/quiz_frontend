

export type ReportReviewDtoReason = typeof ReportReviewDtoReason[keyof typeof ReportReviewDtoReason];

export const ReportReviewDtoReason = {
spam: 'spam',
harassment: 'harassment',
inappropriate_content: 'inappropriate_content',
misinformation: 'misinformation',
other: 'other',
} as const;
