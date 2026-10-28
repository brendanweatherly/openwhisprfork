/** UI-only configuration for the community fork.
 *
 * When enabled, hide OpenWhispr subscription sales, billing, account,
 * workspace and hosted-only controls without changing licensing,
 * entitlements, network behavior or the underlying feature code.
 *
 * Local transcription, meeting recording and bring-your-own-key providers
 * remain available. This is not a security/privacy/network policy.
 */
export const LOCAL_ONLY_UI = true;

export const isHiddenLocalOnlySettingsSection = (section: string | undefined): boolean =>
  LOCAL_ONLY_UI && (section === "account" || section === "plansBilling" || section === "workspace");
