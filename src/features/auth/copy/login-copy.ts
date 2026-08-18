

const COPY = {
form: {
email: {
label: "Email address",
placeholder: "you@example.com",
    },
password: {
label: "Password",
placeholder: "Enter your password",
    },
rememberMe: "Keep me signed in",
forgotPassword: "Forgot password?",
noAccount: "New here?",
createAccount: "Create an account",
needVerification: "Need a new link?",
resendLink: "Request new link",
termsLabel: "By signing in, you agree to our",
terms: "Terms",
and: "&",
privacy: "Privacy Policy",
orContinueWith: "Or continue with",
  },
button: {
signIn: "Sign in",
signingIn: "Signing in...",
continueWithGoogle: "Continue with Google",
signingInWithGoogle: "Signing in with Google...",
  },
error: {
invalidCredentials: {
title: "Incorrect email or password",
body: "Please double-check your email and password, then try again.",
    },
rateLimited: {
title: "Too many attempts",
body: "Please wait a moment before trying again.",
    },
validation: {
title: "Something went wrong",
body: "Please check your input and try again.",
    },
server: {
title: "Unable to sign in",
body: "Something went wrong on our end. Please try again in a moment.",
    },

sessionExpired: {
title: "Session expired",
body: "Your session has expired. Please sign in again to continue.",
    },
securityAlert: {
title: "Security alert",
body: "We detected unusual activity and have secured your account. Please sign in again.",
    },
reloginRequired: {
title: "Please sign in again",
body: "For your security, please sign in again to continue.",
    },

google: {
invalidToken: {
title: "Sign-in session expired",
body: "Your Google sign-in session expired. Please try again.",
      },
accountConflict: {
title: "Account already exists",
body: "An account with this email already exists. Try signing in with your password instead.",
      },
linkingRequired: {
title: "Account linking required",
body: "This Google account needs to be linked to an existing account first. Please sign in with your password.",
      },
providerUnavailable: {
title: "Google sign-in unavailable",
body: "Google sign-in is currently unavailable. Please sign in with your email and password.",
      },
retryable: {
title: "Unable to sign in with Google",
body: "Something went wrong. Please try again in a moment.",
      },
    },
  },
title: "Welcome back!",
} as const;

export const COPY_KEYS = {
form: COPY.form,
button: COPY.button,
error: COPY.error,
title: COPY.title,
} as const;

export function resolveCopy(key: string): string {
return key;
}

export function loginInvalidCredentialsSnapshot(): string {
return COPY.error.invalidCredentials.body;
}

export function loginRateLimitedSnapshot(): string {
return COPY.error.rateLimited.body;
}

export function loginServerSnapshot(): string {
return COPY.error.server.body;
}
