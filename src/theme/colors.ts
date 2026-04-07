/**
 * Κουμπιά (PrimaryButton): κίτρινο φόντο → σκούρο κείμενο (`buttonTextOnYellow`).
 * Όλα τα άλλα variants (μπλε, κόκκινο, πράσινο) → λευκό κείμενο (`buttonTextOnTint`).
 */
export const colors = {
  red: '#E11D48',
  blue: '#2563EB',
  yellow: '#FACC15',
  green: '#22C55E',
  background: '#FDF2F8',
  /** Φόντο οθόνης ερώτησης — ελαφρύ μπλε-γαλαζίο */
  questionScreenBg: '#E0F2FE',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#0F172A',
  overlayBlue: '#3B82F6',
  buttonTextOnTint: '#FFFFFF',
  buttonTextOnYellow: '#0F172A',
} as const;
