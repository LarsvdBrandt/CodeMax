// Merges Tailwind class strings, filtering falsy values.
// Keeps the Button / Input components clean without a full clsx dependency.
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
