

'use client';

import { useMemo } from 'react';

import { useCheckEmail } from '@/features/auth/hooks/use-check-email';
import { useCheckUsername } from '@/features/auth/hooks/use-check-username';
import { EmailAvailabilityIndicator } from './fields/email-availability';
import { UsernameAvailabilityIndicator } from './fields/username-availability';

export type SignupAvailabilityStripProps = {
email: string;
username: string;
};

function deriveUsernameFromNames(
firstName: string,
lastName: string
): string {
const raw = `${firstName}.${lastName}`;
return raw.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 50);
}

export function SignupAvailabilityStrip({
email,
username,
}: SignupAvailabilityStripProps) {

const emailCheck = useCheckEmail({ email });

const usernameCheck = useCheckUsername({
username,
enabled: username.length > 0,
  });

const emailInput = useMemo(() => ({ email }), [email]);
const usernameInput = useMemo(
() => ({ username, enabled: username.length > 0 }),
[username]
  );

void emailInput;
void usernameInput;

return (
<>
<EmailAvailabilityIndicator status={emailCheck.status} />
<UsernameAvailabilityIndicator status={usernameCheck.status} />
</>
  );
}

export { deriveUsernameFromNames };
