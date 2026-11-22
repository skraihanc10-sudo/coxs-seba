/** Bangla vowel signs and independent vowels: a word ending in one takes "-র", otherwise "-ের". */
const VOWEL_END = /[অ-ঔা-ৌৗ]$/

/** Possessive form of a Bangla noun: "ঢাকা" → "ঢাকার", "কক্সবাজার সদর" → "কক্সবাজার সদরের". */
export function ofBn(word: string) {
  const w = word.trim()
  if (!w) return w
  return VOWEL_END.test(w) ? `${w}র` : `${w}ের`
}

/** English possessive-ish phrase used in the same spots: "Dhaka's". */
export function ofEn(word: string) {
  const w = word.trim()
  return w.endsWith("s") ? `${w}'` : `${w}'s`
}
