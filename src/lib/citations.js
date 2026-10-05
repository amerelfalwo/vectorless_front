/**
 * Extracts citations the assistant wrote into its answer, in the formats the
 * answer prompt requests:
 *   (Section: "Title", Page: 4)      (Page may be written without a colon)
 *   (Sections: "Title A", "Title B")
 *
 * Nothing is invented: if the text has no citation, no sources are returned.
 *
 * @param {string} text
 * @returns {{ title: string, page: string | null }[]}
 */
export function extractSources(text) {
  if (!text) return []
  const out = []
  const seen = new Set()

  const push = (rawTitle, page) => {
    const title = rawTitle.trim().replace(/[:：]+$/, '').trim()
    if (!title) return
    const key = `${title}|${page ?? ''}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ title, page: page && page !== '?' ? page : null })
  }

  for (const m of text.matchAll(/\(\s*Sections?:\s*([^()]*)\)/gi)) {
    const body = m[1]
    const single = /^\s*["“'‘]?(.+?)["”'’]?\s*,\s*Page:?\s*(\d+|\?)\s*$/i.exec(body)
    if (single) {
      push(single[1], single[2])
      continue
    }
    for (const t of body.matchAll(/["“]([^"”]+)["”]/g)) push(t[1], null)
  }
  return out
}
