/**
 * Serialises structured data for an inline <script type="application/ld+json">.
 *
 * `JSON.stringify` does not escape `<`, so a product name containing
 * `</script>` would close the tag and let the rest execute — a stored XSS
 * reachable by anyone who can name a product. Escaping the three characters
 * that can start a tag or an HTML comment closes that off; the values stay
 * valid JSON because \u escapes are legal inside JSON strings.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
