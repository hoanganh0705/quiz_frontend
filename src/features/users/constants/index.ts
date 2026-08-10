/**
 * Barrel for the users-domain static constants.
 *
 * Today this re-exports only the settings-related constants
 * (default values + UI choice lists). Friend-related mock constants
 * were removed in Phase 2 (F-05/F-21) when the localStorage `/friends`
 * shim was replaced by the live social hooks. Reintroduce them here
 * only if a non-mock surface requires them.
 */
export {
  defaultSettings,
  languages,
  timezones,
  dateFormats,
} from './settings'