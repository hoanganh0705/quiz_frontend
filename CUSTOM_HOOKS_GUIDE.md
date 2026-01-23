# Custom React Hooks - Refactoring Guide

This document explains when to write custom React hooks and provides examples of code in your project that should be refactored to use them.

## When to Write Custom React Hooks

Create custom hooks when you have:

1. **Reusable stateful logic** - Logic that's used in multiple components
2. **Complex state management** - Multiple useState/useEffect that work together
3. **Side effects** - localStorage, API calls, timers used in multiple places
4. **Repeated patterns** - Similar code blocks across components
5. **Better abstraction** - Make component code cleaner and more focused

---

## 1. useLocalStorage Hook

### ❌ Before (Current Implementation)

**File:** `src/components/PlayQuizClient.tsx` (Lines 58-102)

```tsx
// Load saved progress from localStorage
useEffect(() => {
  const storageKey = getStorageKey(quiz.id)
  const savedProgress = localStorage.getItem(storageKey)

  if (savedProgress) {
    try {
      const progress: QuizProgress = JSON.parse(savedProgress)
      // ... set multiple states
    } catch {
      localStorage.removeItem(storageKey)
    }
  }
  setIsLoaded(true)
}, [quiz.id, quiz.duration])

// Save progress to localStorage whenever state changes
useEffect(() => {
  if (!isLoaded || isSubmittedRef.current) return

  const storageKey = getStorageKey(quiz.id)
  const progress: QuizProgress = {
    currentQuestion,
    answers,
    timeLeft
    // ... more fields
  }
  localStorage.setItem(storageKey, JSON.stringify(progress))
}, [quiz.id, currentQuestion, answers, timeLeft /* ... */])
```

**File:** `src/components/quiz-page/QuizResults.tsx` (Lines 65-78)

```tsx
useEffect(() => {
  const resultsKey = getResultsKey(quiz.id)
  const savedResults = localStorage.getItem(resultsKey)

  if (savedResults) {
    try {
      const parsedResults: QuizResult = JSON.parse(savedResults)
      setResult(parsedResults)
    } catch {
      generateMockResults()
    }
  } else {
    generateMockResults()
  }
  setIsLoaded(true)
}, [quiz.id, generateMockResults])
```

### ✅ After (Using Custom Hook)

```tsx
import { useQuizProgress, useQuizResults } from '@/hooks'

// In PlayQuizClient
const { progress, setProgress, clearProgress } = useQuizProgress(quiz.id, {
  currentQuestion: 0,
  answers: {},
  timeLeft: quiz.duration,
  timerStarted: false,
  startedAt: null,
  timePerQuestion: {},
  questionStartTime: null
})

// In QuizResults
const { results, setResults } = useQuizResults(quiz.id, null)
```

**Benefits:**

- ✅ Removes 40+ lines of boilerplate code
- ✅ Automatic serialization/deserialization
- ✅ Error handling built-in
- ✅ SSR-safe (checks for window)
- ✅ Reusable across components

---

## 2. useClipboard Hook

### ❌ Before (Current Implementation)

**File:** `src/components/quiz-page/QuizResults.tsx` (Lines 134-139)

```tsx
const [copied, setCopied] = useState(false)

const handleCopyLink = useCallback(() => {
  const url = `${window.location.origin}/quizzes/${quiz.id}`
  navigator.clipboard.writeText(url)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}, [quiz.id])
```

### ✅ After (Using Custom Hook)

```tsx
import { useClipboard } from '@/hooks'

const { copied, copy } = useClipboard()

const handleCopyLink = useCallback(() => {
  const url = `${window.location.origin}/quizzes/${quiz.id}`
  copy(url)
}, [quiz.id, copy])
```

**Benefits:**

- ✅ Error handling included
- ✅ API availability check
- ✅ Configurable timeout
- ✅ Reusable across all copy scenarios

---

## 3. useToggle Hook

### ❌ Before (Current Implementation)

**File:** `src/app/login/page.tsx` (Line 30)

```tsx
const [showPassword, setShowPassword] = useState(false)

// Later in JSX:
<button onClick={() => setShowPassword(!showPassword)}>
  {showPassword ? <EyeOff /> : <Eye />}
</button>
```

**File:** `src/app/signup/page.tsx` (Lines 38-39)

```tsx
const [showPassword, setShowPassword] = useState(false)
const [showConfirmPassword, setShowConfirmPassword] = useState(false)
```

### ✅ After (Using Custom Hook)

```tsx
import { useToggle } from '@/hooks'

const [showPassword, togglePassword] = useToggle(false)
const [showConfirmPassword, toggleConfirmPassword] = useToggle(false)

// Later in JSX:
<button onClick={togglePassword}>
  {showPassword ? <EyeOff /> : <Eye />}
</button>
```

**Benefits:**

- ✅ Cleaner toggle syntax
- ✅ Less verbose
- ✅ Standard pattern

---

## 4. useAsyncAction Hook

### ❌ Before (Current Implementation)

**File:** `src/app/login/page.tsx` (Lines 48-58)

```tsx
const [isLoading, setIsLoading] = useState(false)

const onSubmit = async (data: LoginFormData) => {
  setIsLoading(true)
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    console.log('Login attempt:', data)
  } catch {
    // Handle error
  } finally {
    setIsLoading(false)
  }
}
```

**Same pattern repeated in:**

- `src/app/signup/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/components/support/contact-form.tsx`

### ✅ After (Using Custom Hook)

```tsx
import { useAsyncAction } from '@/hooks'

const { execute: submitLogin, isLoading, error } = useAsyncAction()

const onSubmit = async (data: LoginFormData) => {
  await execute(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    console.log('Login attempt:', data)
  })
}
```

**Benefits:**

- ✅ Automatic loading state management
- ✅ Built-in error handling
- ✅ Consistent pattern across all forms
- ✅ Can easily add error display
- ✅ Prevents repeated try-catch-finally blocks

---

## 5. useCountdownTimer Hook

### ❌ Before (Current Implementation)

**File:** `src/components/PlayQuizClient.tsx` (Lines 196-208)

```tsx
const [timeLeft, setTimeLeft] = useState(quiz.duration)
const [timerStarted, setTimerStarted] = useState(false)

useEffect(() => {
  if (timerStarted && timeLeft > 0) {
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  } else if (timerStarted && timeLeft <= 0) {
    handleSubmit()
  }
}, [timerStarted, timeLeft, handleSubmit])
```

### ✅ After (Using Custom Hook)

```tsx
import { useCountdownTimer } from '@/hooks'

const { timeLeft, isRunning, start, pause, reset, setTime } = useCountdownTimer(
  {
    initialTime: quiz.duration,
    onComplete: handleSubmit,
    autoStart: false
  }
)

// Instead of setTimerStarted(true)
start()

// To pause
pause()
```

**Benefits:**

- ✅ Built-in pause/resume functionality
- ✅ Automatic cleanup
- ✅ Callback on completion
- ✅ Reset capability
- ✅ Prevents timer memory leaks

---

## Summary of Improvements

### Files That Should Be Refactored:

1. **src/components/PlayQuizClient.tsx**
   - Use `useQuizProgress` for localStorage
   - Use `useCountdownTimer` for timer logic

2. **src/components/quiz-page/QuizResults.tsx**
   - Use `useQuizResults` for localStorage
   - Use `useClipboard` for copy functionality

3. **src/app/login/page.tsx**
   - Use `useToggle` for password visibility
   - Use `useAsyncAction` for form submission

4. **src/app/signup/page.tsx**
   - Use `useToggle` for password visibility (2 instances)
   - Use `useAsyncAction` for form submission

5. **src/app/forgot-password/page.tsx**
   - Use `useAsyncAction` for form submission

6. **src/components/support/contact-form.tsx**
   - Use `useAsyncAction` for form submission

### Code Reduction Estimate:

- **Total lines removed:** ~150 lines
- **Reusability gained:** 6 components benefit from 5 hooks
- **Bug fixes included:** Error handling, SSR safety, memory leak prevention

### Next Steps:

1. Review the created hooks in `src/hooks/`
2. Start with one component (e.g., QuizResults) as a proof of concept
3. Test thoroughly before refactoring all components
4. Update tests to cover the new hooks

---

## Best Practices for Custom Hooks

1. **Name them with `use` prefix** - React convention
2. **Keep them focused** - One responsibility per hook
3. **Document parameters and returns** - Use JSDoc comments
4. **Handle edge cases** - SSR, errors, cleanup
5. **Make them testable** - Export for unit testing
6. **Avoid premature abstraction** - Wait until you have 2-3 uses

## Resources

- [React Docs: Building Your Own Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Patterns.dev: Custom Hooks](https://www.patterns.dev/react/custom-hooks/)
