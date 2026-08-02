# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bookmarks/bookmark.spec.ts >> Bookmark acceptance (Story 3.10 / TKT-3.10.G2) >> (f2) a 429 RATE_LIMITED on the add POST reverts the bookmark icon
- Location: e2e/bookmarks/bookmark.spec.ts:388:7

# Error details

```
Error: browserType.launch: Executable doesn't exist at /tmp/cursor-sandbox-cache/883ba12808167446714a5fce9caed620/playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```