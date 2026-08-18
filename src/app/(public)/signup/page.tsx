'use client';

import { RegistrationFormBody } from '@/features/auth/forms/registration-form-body';
import { RedirectIfAuthed } from '@/features/auth/guards/redirect-if-authed';

export default function SignupPage() {
return (
<>
<RedirectIfAuthed />
<RegistrationFormBody />
</>
  );
}
