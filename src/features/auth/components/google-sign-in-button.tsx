'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/Button';
import { COPY_KEYS, resolveCopy } from '@/features/auth/copy/login-copy';

export interface GoogleSignInButtonProps {

isAvailable: boolean;

disabled?: boolean;

isLoading?: boolean;

onClick?: () => void;

className?: string;
}

const GoogleLogo = memo(function GoogleLogo() {
return (
<svg
width="18"
height="18"
viewBox="0 0 18 18"
fill="none"
xmlns="http://www.w3.org/2000/svg"
aria-hidden="true"
    >
<path
d="M17.64 9.20454545c0-.638-.0573-1.2518-.1636-1.8409H9v3.48136h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7168v2.2582h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6155z"
fill="#4285F4"
      />
<path
d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1818l-2.9087-2.2582c-.8059.54-1.8368 1.862-1.8368 3.44 0 1.578.6432 2.9 1.8368 3.44l2.9087-2.2582C13.4673 17.1941 11.43 18 9 18z"
fill="#34A853"
      />
<path
d="M3.9645 10.7073C3.7841 10.3227 3.6818 9.9023 3.6818 9.4586c0-.4437.1023-.8641.2827-1.2491V5.9514H1.0559C.7068 6.6573.45 7.4614.45 8.3268c0 .8654.2568 1.6695.6059 2.3754l3.3186-2.9949z"
fill="#FBBC05"
      />
<path
d="M9 3.5818c1.3214 0 2.5077.4545 3.4405 1.3455l2.5813-2.5814C13.4632.8977 11.4259 0 9 0 5.5691 0 2.5327 2.0341 1.0559 5.9514l3.3187 2.9949C5.5327 4.3864 7.1082 3.5818 9 3.5818z"
fill="#EA4335"
      />
</svg>
  );
});

export const GoogleSignInButton = memo(function GoogleSignInButton({
isAvailable,
disabled = false,
isLoading = false,
onClick,
className,
}: GoogleSignInButtonProps) {

if (!isAvailable) {
return null;
  }

const isDisabled = disabled || isLoading;

return (
<Button
variant="outline"
size="lg"
className={className}
disabled={isDisabled}
onClick={onClick}
aria-label={resolveCopy(COPY_KEYS.button.continueWithGoogle)}
    >
{isLoading ? (
<>
<span
className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"
aria-hidden="true"
          />
<span>{resolveCopy(COPY_KEYS.button.signingInWithGoogle)}</span>
</>
      ) : (
<>
<GoogleLogo />
<span>{resolveCopy(COPY_KEYS.button.continueWithGoogle)}</span>
</>
      )}
</Button>
  );
});
