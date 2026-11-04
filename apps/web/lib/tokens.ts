// Design-handoff tokens for the web app. Imports colors.ts directly: the
// handoff's tokens/index.ts also re-exports spacing.ts, which imports
// react-native and must never reach a web bundle.
export { colors } from '../../../docs/design-handoff/tokens/colors';
export type { ColorToken } from '../../../docs/design-handoff/tokens/colors';
