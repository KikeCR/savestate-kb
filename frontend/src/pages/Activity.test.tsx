import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { ActivityPageObject } from '../test/page-objects/ActivityPageObject'
import type { ActivityEvent } from '../types'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const makeEvent = (overrides: Partial<ActivityEvent> = {}): ActivityEvent => ({
	user_id: 1,
	username: 'jane',
	game_id: 1,
	game_title: 'Celeste',
	game_cover_image_url: null,
	action: 'added',
	created_at: '2024-01-01T00:00:00.000Z',
	...overrides,
})

beforeEach(() => {
	mockedApi.get.mockReset()
})

describe('Activity', () => {
	it('shows an error message when the fetch fails', async () => {
		mockedApi.get.mockRejectedValueOnce(new Error('Network error'))
		const activity = new ActivityPageObject()

		await waitFor(() => expect(activity.errorText).toBe('Network error'))
	})

	it('shows the empty-state copy when there is no activity', async () => {
		mockedApi.get.mockResolvedValueOnce({ results: [] })
		const activity = new ActivityPageObject()

		await waitFor(() => expect(activity.emptyText).toBe(true))
	})

	it('renders one item per event with a placeholder when there is no cover image', async () => {
		mockedApi.get.mockResolvedValueOnce({ results: [makeEvent()] })
		const activity = new ActivityPageObject()

		await waitFor(() => expect(activity.items).toHaveLength(1))
		expect(activity.hasCoverPlaceholder(0)).toBe(true)
		expect(activity.hasCoverImage(0)).toBe(false)
	})

	it('renders the cover image when the event has one', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [makeEvent({ game_cover_image_url: 'https://x/c.png' })],
		})
		const activity = new ActivityPageObject()

		await waitFor(() => expect(activity.hasCoverImage(0)).toBe(true))
	})
})
