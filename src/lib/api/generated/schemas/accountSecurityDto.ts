

export interface AccountSecurityDto {

emailVerified: boolean;

activeSessionCount: number;

lastSuccessfulLoginAt: string | null;

lastPasswordChangeAt: string | null;

passwordAgeDays: number | null;
}
