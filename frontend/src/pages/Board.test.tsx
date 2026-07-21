import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { makeEntry } from '../test/fixtures'
import { BoardPageObject } from '../test/page-objects/BoardPageObject'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
})

describe('Board', () => {
	it('shows an error message when loading entries fails', async () => {
		mockedApi.get.mockRejectedValueOnce(new Error('Network error'))
		const board = new BoardPageObject()

		await waitFor(() => expect(board.errorText).toBe('Network error'))
	})

	it('routes entries into the column matching their status', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [
				makeEntry({ id: 1, status: 'backlog' }),
				makeEntry({ id: 2, status: 'playing' }),
				makeEntry({ id: 3, status: 'playing' }),
			],
		})
		const board = new BoardPageObject()

		await waitFor(() => expect(board.cardCountFor('playing')).toBe(2))
		expect(board.cardCountFor('backlog')).toBe(1)
		expect(board.cardCountFor('completed')).toBe(0)
	})

	it('hides the year filter when there are no available years', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [makeEntry({ id: 1, year_played: null })],
		})
		const board = new BoardPageObject()

		await waitFor(() => expect(board.cardCountFor('playing')).toBe(1))
		expect(board.yearFilterVisible).toBe(false)
	})

	it('always shows backlog entries regardless of the year filter', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [
				makeEntry({ id: 1, status: 'backlog', year_played: null }),
				makeEntry({ id: 2, status: 'playing', year_played: 2023 }),
				makeEntry({ id: 3, status: 'playing', year_played: 2022 }),
			],
		})
		const board = new BoardPageObject()

		await waitFor(() => expect(board.cardCountFor('playing')).toBe(2))
		expect(board.yearFilterVisible).toBe(true)

		await board.selectYearFilter('2023')

		await waitFor(() => expect(board.cardCountFor('playing')).toBe(1))
		expect(board.cardCountFor('backlog')).toBe(1)
	})
})
