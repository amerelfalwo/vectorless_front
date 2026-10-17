/**
 * Extracts citations the assistant wrote into its answer:
 * 1. PDF Document Citations:
 *    (Section: "Title", Page: 4)
 *    (Sections: "Title A", "Title B")
 * 2. Web Links & FastMCP Search Sources:
 *    [Title](https://example.com)
 *    ### 🌐 المصادر والروابط ذات الصلة:
 *
 * @param {string} text
 * @returns {Array<{ type: 'pdf' | 'web', title: string, page?: string | null, url?: string, domain?: string }>}
 */
export function extractSources(text) {
  if (!text) return []
  const out = []
  const seen = new Set()

  const pushPdf = (rawTitle, page) => {
    const title = rawTitle.trim().replace(/[:：]+$/, '').trim()
    if (!title) return
    const key = `pdf|${title.toLowerCase()}|${page ?? ''}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({
      type: 'pdf',
      title,
      page: page && page !== '?' ? page : null,
    })
  }

  const pushWeb = (rawTitle, rawUrl) => {
    const url = (rawUrl || '').trim()
    if (!url || !url.startsWith('http')) return
    // Ignore internal static media, extracted images or base64
    if (url.includes('/static/') || url.match(/\.(png|jpe?g|gif|svg|webp)$/i)) return

    const cleanTitle = (rawTitle || '').trim().replace(/^[-*•\s]+/, '')
    const key = `web|${url.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)

    let domain = ''
    try {
      domain = new URL(url).hostname.replace(/^www\./, '')
    } catch {
      domain = ''
    }

    out.push({
      type: 'web',
      title: cleanTitle || domain || url,
      url,
      domain,
    })
  }

  // 1. Match PDF Section & Page citations: (Section: "Title", Page: 4) or (Sections: ...)
  for (const m of text.matchAll(/\(\s*Sections?:\s*([^()]*)\)/gi)) {
    const body = m[1]
    const single = /^\s*["“'‘]?(.+?)["”'’]?\s*,\s*Page:?\s*(\d+|\?)\s*$/i.exec(body)
    if (single) {
      pushPdf(single[1], single[2])
      continue
    }
    for (const t of body.matchAll(/["“]([^"”]+)["”]/g)) {
      pushPdf(t[1], null)
    }
  }

  // 2. Match Markdown web links: [Title](https://...) (excluding images ![alt](...))
  const linkRegex = /(?:^|[^!])\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  for (const m of text.matchAll(linkRegex)) {
    pushWeb(m[1], m[2])
  }

  // 3. Match raw URLs in bullet lists (e.g., - https://...)
  const rawUrlRegex = /(?:^|\s)(https?:\/\/[^\s<>)"]+)/g
  for (const m of text.matchAll(rawUrlRegex)) {
    pushWeb('', m[1])
  }

  return out
}

