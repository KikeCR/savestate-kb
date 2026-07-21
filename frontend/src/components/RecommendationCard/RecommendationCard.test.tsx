import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { makeGame, makeRecommendation } from '../../test/fixtures'
import { RecommendationCardPageObject } from '../../test/page-objects/RecommendationCardPageObject'

vi.mock('../../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.post.mockReset()
})

describe('RecommendationCard', () => {
	it('renders the game title and reason', () => {
		const card = new RecommendationCardPageObject({
			recommendation: makeRecommendation({
				game: makeGame({ title: 'Hollow Knight' }),
				reason: 'Because you loved similar metroidvanias',
			}),
		})

		expect(card.title).toBe('Hollow Knight')
		expect(card.reasonText).toBe('Because you loved similar metroidvanias')
	})

	it('shows a placeholder when the game has no cover image', () => {
		const card = new RecommendationCardPageObject({
			recommendation: makeRecommendation({
				game: makeGame({ cover_image_url: null }),
			}),
		})

		expect(card.hasCoverPlaceholder).toBe(true)
		expect(card.coverImage).toBeNull()
	})

	it('shows the cover image when the game has one', () => {
		const card = new RecommendationCardPageObject({
			recommendation: makeRecommendation({
				game: makeGame({ cover_image_url: 'https://x/cover.png' }),
			}),
		})

		expect(card.hasCoverPlaceholder).toBe(false)
		expect(card.coverImage?.src).toBe('https://x/cover.png')
	})

	it('shows the metacritic score only when present', () => {
		expect(
			new RecommendationCardPageObject({
				recommendation: makeRecommendation({
					game: makeGame({ metacritic: null }),
				}),
			}).scoreText,
		).toBeNull()
		expect(
			new RecommendationCardPageObject({
				recommendation: makeRecommendation({
					game: makeGame({ metacritic: 92 }),
				}),
			}).scoreText,
		).toContain('92')
	})

	it('shows up to two genre tags', () => {
		const card = new RecommendationCardPageObject({
			recommendation: makeRecommendation({
				game: makeGame({ genres: ['RPG', 'Strategy', 'Indie'] }),
			}),
		})

		expect(card.genreTexts).toEqual(['RPG', 'Strategy'])
	})

	it('adds the game to the library and shows Added once it succeeds', async () => {
		mockedApi.post.mockResolvedValueOnce({ id: 1 })
		const onAdded = vi.fn()
		const card = new RecommendationCardPageObject({
			recommendation: makeRecommendation({ game: makeGame({ id: 42 }) }),
			onAdded,
		})

		await card.clickAdd()

		expect(mockedApi.post).toHaveBeenCalledWith('/api/entries', {
			game_id: 42,
			status: 'backlog',
		})
		await waitFor(() => expect(card.addButtonText).toContain('Added'))
		expect(onAdded).toHaveBeenCalled()
	})

	it('disables the button while the request is pending', async () => {
		let resolveRequest!: (value: unknown) => void
		mockedApi.post.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveRequest = resolve
			}),
		)
		const card = new RecommendationCardPageObject({
			recommendation: makeRecommendation(),
		})

		await card.clickAdd()
		expect(card.addButton.disabled).toBe(true)

		resolveRequest({ id: 1 })
		await waitFor(() => expect(card.addButtonText).toContain('Added'))
	})

	it('calls onError and re-enables the button when adding fails', async () => {
		mockedApi.post.mockRejectedValueOnce(new Error('already in your library'))
		const onError = vi.fn()
		const card = new RecommendationCardPageObject({
			recommendation: makeRecommendation(),
			onError,
		})

		await card.clickAdd()

		await waitFor(() =>
			expect(onError).toHaveBeenCalledWith('already in your library'),
		)
		expect(card.addButton.disabled).toBe(false)
	})
})
