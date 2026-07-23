import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderActivityMessage } from './activityMessage'
import type { ActivityEvent } from '../types'

const baseEvent: ActivityEvent = {
	user_id: 1,
	username: 'jane',
	game_id: 1,
	game_title: 'Celeste',
	game_cover_image_url: null,
	action: 'added',
	created_at: '2024-01-01T00:00:00.000Z',
}

const renderMessage = (event: ActivityEvent) => {
	const { container } = render(<>{renderActivityMessage(event)}</>)
	return container.textContent
}

describe('renderActivityMessage', () => {
	it('renders the added message', () => {
		expect(renderMessage({ ...baseEvent, action: 'added' })).toBe(
			'jane added Celeste',
		)
	})

	it('renders the completed message', () => {
		expect(renderMessage({ ...baseEvent, action: 'completed' })).toBe(
			'jane completed Celeste',
		)
	})

	it('renders the rated message including the rating', () => {
		expect(renderMessage({ ...baseEvent, action: 'rated', rating: 9 })).toBe(
			'jane rated Celeste — 9/10',
		)
	})

	it('renders the logged_year message including the year', () => {
		expect(
			renderMessage({ ...baseEvent, action: 'logged_year', year_played: 2023 }),
		).toBe('jane logged Celeste as played in 2023')
	})

	it('renders the reviewed message', () => {
		expect(renderMessage({ ...baseEvent, action: 'reviewed' })).toBe(
			'jane reviewed Celeste',
		)
	})
})
