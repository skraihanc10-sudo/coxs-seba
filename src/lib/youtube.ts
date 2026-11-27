/** YouTube video id from any share form: watch?v=, youtu.be/, shorts/, embed/, live/. */
export function youtubeId(url: string): string | null {
  const s = url.trim()
  if (!s) return null
  if (/^[\w-]{11}$/.test(s)) return s
  const m = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/)
  return m ? m[1] : null
}

/** Setting value (one link per line) → unique video ids, in order. */
export function youtubeIds(setting: string): string[] {
  const ids = setting.split(/[\n,]/).map(youtubeId).filter((x): x is string => Boolean(x))
  return Array.from(new Set(ids))
}
