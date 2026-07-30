declare module '*.css'

// Vite / vitest `?raw` query-string imports.
//
// `?raw` tells the bundler to import the file as a plain string. This
// is used in spec files to consume JSON fixtures without going through
// `resolveJsonModule` (which has inconsistent behaviour across vitest
// versions). Without these declarations, the TypeScript language server
// reports "Cannot find module" errors even though the runtime resolves
// them correctly via vite/rolldown.
declare module '*?raw' {
  const content: string
  export default content
}
