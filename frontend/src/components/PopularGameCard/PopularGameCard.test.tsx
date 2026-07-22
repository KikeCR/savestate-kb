import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { makeGame } from '../../test/fixtures'
import { mockAuthMe, mockUser } from '../../test/mockApi'
import { PopularGameCardPageObject } from '../../test/page-objects/PopularGameCardPageObject'

vi.mock('../../api/client', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		del: vi.fn(),
	},
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.post.mockReset()
	mockedApi.del.mockReset()
})

describe('PopularGameCard', () => {
	it('renders the game title, score, and genres', async () => {
		mockAuthMe(mockedApi, mockUser)
		const card = new PopularGameCardPageObject({
			game: makeGame({
				title: 'Hollow Knight',
				metacritic: 90,
				genres: ['Metroidvania', 'Indie', 'Platformer'],
			}),
		})

		await waitFor(() => expect(card.title).toBe('Hollow Knight'))
		expect(card.scoreText).toContain('90')
		expect(card.genreTexts).toEqual(['Metroidvania', 'Indie'])
	})

	it('shows an Add to Library button when logged in and adds the game', async () => {
		mockAuthMe(mockedApi, mockUser)
		mockedApi.post.mockResolvedValueOnce({ id: 1 })
		const onAdded = vi.fn()
		const card = new PopularGameCardPageObject({
			game: makeGame({ id: 42 }),
			onAdded,
		})

		await waitFor(() => expect(card.isLoginLink).toBe(false))
		await card.clickAdd()

		expect(mockedApi.post).toHaveBeenCalledWith('/api/entries', {
			game_id: 42,
			status: 'backlog',
		})
		await waitFor(() => expect(card.addButtonText).toContain('Added'))
		expect(onAdded).toHaveBeenCalledWith(42)
	})

	it('shows a login link instead of the Add button when logged out', async () => {
		mockAuthMe(mockedApi, null)
		const card = new PopularGameCardPageObject({ game: makeGame() })

		await waitFor(() => expect(card.isLoginLink).toBe(true))
		expect(card.addButtonText).toContain('Log in to add')
	})

	it('calls onError when adding fails', async () => {
		mockAuthMe(mockedApi, mockUser)
		mockedApi.post.mockRejectedValueOnce(new Error('already in your library'))
		const onError = vi.fn()
		const card = new PopularGameCardPageObject({
			game: makeGame(),
			onError,
		})

		await waitFor(() => expect(card.isLoginLink).toBe(false))
		await card.clickAdd()

		await waitFor(() =>
			expect(onError).toHaveBeenCalledWith('already in your library'),
		)
	})
})
