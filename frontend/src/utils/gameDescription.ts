export interface DescriptionBlock {
	heading: string | null
	body: string
}

// RAWG's description_raw is lightly marked up (### section headers, blank
// lines between paragraphs) rather than plain prose or full markdown —
// parse just enough of that to render readable sections instead of dumping
// literal "###" text into a single run-on paragraph.
export const parseGameDescription = (text: string): DescriptionBlock[] => {
	return text
		.trim()
		.split(/\n\s*\n/)
		.map((block) => {
			const match = block.match(/^#{1,6}\s*(.+?)(?:\n([\s\S]*))?$/)
			if (!match) return { heading: null, body: block.trim() }
			return { heading: (match[1] ?? '').trim(), body: (match[2] ?? '').trim() }
		})
		.filter((block) => block.heading || block.body)
}
