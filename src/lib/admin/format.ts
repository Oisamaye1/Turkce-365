/** "3 days ago" style times for the admin pages. */
export function relTime(iso: string | null, now = Date.now()): string {
  if (!iso) return "never";
  const t = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).getTime();
  const s = Math.round((now - t) / 1000);
  if (s < 90) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return d === 1 ? "yesterday" : `${d} days ago`;
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const ACTION_LABEL: Record<string, string> = {
  setup: "Created the admin account",
  signup: "Signed up",
  login: "Signed in",
  "password.change": "Changed their password",
  "signout.all": "Signed out on every device",
  "codes.create": "Made signup codes",
  "codes.revoke": "Revoked a signup code",
  "user.pause": "Paused the account",
  "user.resume": "Resumed the account",
  "user.promote": "Made admin",
  "user.demote": "Made a learner",
  "user.ai.on": "Turned Claude lessons on",
  "user.ai.off": "Switched to offline lessons",
  "user.password.reset": "Reset the password",
  "user.signout": "Signed out everywhere",
  "user.delete": "Deleted an account",
};
