import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false
})

const defaultLinkOpen = markdown.renderer.rules.link_open
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  tokens[index]?.attrSet('target', '_blank')
  tokens[index]?.attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen
    ? defaultLinkOpen(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options)
}

const defaultHeadingOpen = markdown.renderer.rules.heading_open
markdown.renderer.rules.heading_open = (tokens, index, options, env, self) => {
  const token = tokens[index]
  if (token?.tag === 'h2') {
    const headingIndex = tokens
      .slice(0, index)
      .filter(item => item.type === 'heading_open' && item.tag === 'h2')
      .length
    token.attrSet('id', `section-${headingIndex + 1}`)
  }

  return defaultHeadingOpen
    ? defaultHeadingOpen(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options)
}

export const renderMarkdown = (source: string): string => markdown.render(source || '')

export type MarkdownHeading = {
  id: string
  text: string
}

export const extractMarkdownHeadings = (source: string): MarkdownHeading[] => {
  const tokens = markdown.parse(source || '', {})
  const headings: MarkdownHeading[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token?.type !== 'heading_open' || token.tag !== 'h2') continue

    const inlineToken = tokens[index + 1]
    const text = (inlineToken?.children || [])
      .filter(child => child.type === 'text' || child.type === 'code_inline')
      .map(child => child.content)
      .join('')
      .trim()

    headings.push({
      id: `section-${headings.length + 1}`,
      text: text || `章节 ${headings.length + 1}`
    })
  }

  return headings
}

export const createMarkdownExcerpt = (source: string, maxLength = 120): string => {
  const tokens = markdown.parse(source || '', {})
  const chunks: string[] = []
  let inParagraph = false

  for (const token of tokens) {
    if (token.type === 'paragraph_open') {
      inParagraph = true
      continue
    }
    if (token.type === 'paragraph_close') {
      inParagraph = false
      if (chunks.join(' ').length >= maxLength) break
      continue
    }
    if (token.type !== 'inline' || !inParagraph) continue

    for (const child of token.children || []) {
      if (child.type === 'text' || child.type === 'code_inline') chunks.push(child.content)
      if (child.type === 'softbreak' || child.type === 'hardbreak') chunks.push(' ')
    }
  }

  const text = chunks.join(' ').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}…`
}
