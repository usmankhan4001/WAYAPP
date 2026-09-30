/**
 * Renders the human-readable text of a WhatsApp template message.
 *
 * The inbox used to store template sends as the literal string "[Template: name]",
 * so a conversation showed a tag instead of what the customer actually received.
 * Templates carry their text in Meta's `components` JSON (a BODY component with
 * positional `{{1}}`, `{{2}}` placeholders); this fills those in.
 *
 * Never throws: an unparsable or body-less template falls back to the old tag so a
 * send is never blocked by a rendering problem.
 */
export function renderTemplateBody(
  components: string | unknown[] | null | undefined,
  variables: string[] = [],
  templateName?: string,
): string {
  const fallback = templateName ? `[Template: ${templateName}]` : '[Template]'
  try {
    const list: any[] = typeof components === 'string' ? JSON.parse(components) : Array.isArray(components) ? components : []
    const pick = (type: string) => list.find((c) => String(c?.type || '').toUpperCase() === type)
    const fill = (text: string) => text.replace(/\{\{\s*(\d+)\s*\}\}/g, (m, n) => variables[Number(n) - 1] ?? m)

    const body = pick('BODY')?.text
    if (typeof body !== 'string' || !body.trim()) return fallback

    const header = pick('HEADER')
    const headerText = header?.format === 'TEXT' && typeof header.text === 'string' ? fill(header.text).trim() : ''
    return (headerText ? `${headerText}\n\n` : '') + fill(body).trim()
  } catch {
    return fallback
  }
}
