

export type SocialSuggestionItemDtoReason = typeof SocialSuggestionItemDtoReason[keyof typeof SocialSuggestionItemDtoReason];

export const SocialSuggestionItemDtoReason = {
mutual_friends: 'mutual_friends',
shared_tags: 'shared_tags',
shared_activity: 'shared_activity',
popular: 'popular',
} as const;
