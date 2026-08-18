

export type PlatformReportItemDtoReason = typeof PlatformReportItemDtoReason[keyof typeof PlatformReportItemDtoReason];

export const PlatformReportItemDtoReason = {
spam: 'spam',
harassment: 'harassment',
inappropriate_content: 'inappropriate_content',
misinformation: 'misinformation',
other: 'other',
} as const;
