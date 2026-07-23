import { describe, expect, it } from 'vitest'
import { parseGameDescription } from './gameDescription'

describe('parseGameDescription', () => {
	it('returns a single bodyless-heading block for plain prose', () => {
		const blocks = parseGameDescription(
			'A challenging Metroidvania set in Hallownest.',
		)

		expect(blocks).toEqual([
			{ heading: null, body: 'A challenging Metroidvania set in Hallownest.' },
		])
	})

	it('splits ### headers into separate heading/body blocks', () => {
		const text =
			'Intro paragraph.\n\n###Key features\nFeature text here.\n\n###Plot\nPlot text here.'

		const blocks = parseGameDescription(text)

		expect(blocks).toEqual([
			{ heading: null, body: 'Intro paragraph.' },
			{ heading: 'Key features', body: 'Feature text here.' },
			{ heading: 'Plot', body: 'Plot text here.' },
		])
	})

	it('trims surrounding whitespace and drops empty blocks', () => {
		const blocks = parseGameDescription(
			'\n\n  Intro.  \n\n\n\n###Plot\nStory.\n\n',
		)

		expect(blocks).toEqual([
			{ heading: null, body: 'Intro.' },
			{ heading: 'Plot', body: 'Story.' },
		])
	})

	it('handles a heading with no body text', () => {
		const blocks = parseGameDescription('###Empty Section')

		expect(blocks).toEqual([{ heading: 'Empty Section', body: '' }])
	})
})
