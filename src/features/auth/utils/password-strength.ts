export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4

export type PasswordStrengthResult = {
score: PasswordStrengthScore
label: string
checks: {
minLength: boolean
uppercase: boolean
number: boolean
symbol: boolean
  }
}

const LABELS: Record<PasswordStrengthScore, string> = {
0: 'Too weak',
1: 'Weak',
2: 'Fair',
3: 'Good',
4: 'Strong'
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
if (!password) {
return {
score: 0,
label: LABELS[0],
checks: {
minLength: false,
uppercase: false,
number: false,
symbol: false
      }
    }
  }

const checks = {
minLength: password.length >= 8,
uppercase: /[A-Z]/.test(password),
number: /\d/.test(password),
symbol: /[^A-Za-z0-9]/.test(password)
  }

const score = Object.values(checks).filter(Boolean).length as PasswordStrengthScore

return {
score,
label: LABELS[score],
checks
  }
}
