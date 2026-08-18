

export interface UserPercentileResponseDto {

rank?: number | null;

totalUsers: number;

percentile?: number | null;

percentileLabel?: string | null;

betterThanUsers?: number | null;

worseThanUsers?: number | null;
}
