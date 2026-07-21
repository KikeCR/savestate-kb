import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { makeEntry, makeGame } from '../test/fixtures'
import { LibraryPageObject } from '../test/page-objects/LibraryPageObject'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.post.mockReset()
	mockedApi.patch.mockReset()
	mockedApi.del.mockReset()
})

describe('Library', () => {
	it('shows the empty state when there are no tracked entries', async () => {
		mockedApi.get.mockResolvedValueOnce({ results: [] })
		const library = new LibraryPageObject()

		await waitFor(() => expect(library.emptyText).toBe(true))
	})

	it('renders tracked entries once loaded', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [makeEntry({ id: 1 }), makeEntry({ id: 2 })],
		})
		const library = new LibraryPageObject()

		await waitFor(() => expect(library.entryRows).toHaveLength(2))
	})

	it('searches, adds a result to the library, and refetches', async () => {
		mockedApi.get.mockResolvedValueOnce({ results: [] })
		const library = new LibraryPageObject()
		await waitFor(() => expect(library.emptyText).toBe(true))

		mockedApi.get.mockResolvedValueOnce({
			results: [makeGame({ id: 9, title: 'Hades' })],
		})
		await library.search('Hades')
		await waitFor(() => expect(library.searchResults).toHaveLength(1))

		mockedApi.post.mockResolvedValueOnce(undefined)
		mockedApi.get.mockResolvedValueOnce({
			results: [
				makeEntry({ id: 9, game: makeGame({ id: 9, title: 'Hades' }) }),
			],
		})
		await library.addResult(0)

		expect(mockedApi.post).toHaveBeenCalledWith('/api/entries', {
			game_id: 9,
			status: 'backlog',
		})
		await waitFor(() => expect(library.entryRows).toHaveLength(1))
		expect(library.searchResults).toHaveLength(0)
	})

	it('changes an entry status and refetches', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [makeEntry({ id: 1, status: 'backlog' })],
		})
		const library = new LibraryPageObject()
		await waitFor(() => expect(library.entryRows).toHaveLength(1))

		mockedApi.patch.mockResolvedValueOnce(undefined)
		mockedApi.get.mockResolvedValueOnce({
			results: [makeEntry({ id: 1, status: 'playing' })],
		})
		await library.changeStatus(0, 'playing')

		expect(mockedApi.patch).toHaveBeenCalledWith('/api/entries/1', {
			status: 'playing',
		})
		await waitFor(() => expect(mockedApi.get).toHaveBeenCalledTimes(2))
	})

	it('changes an entry rating and refetches', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [makeEntry({ id: 1, rating: null })],
		})
		const library = new LibraryPageObject()
		await waitFor(() => expect(library.entryRows).toHaveLength(1))

		mockedApi.patch.mockResolvedValueOnce(undefined)
		mockedApi.get.mockResolvedValueOnce({
			results: [makeEntry({ id: 1, rating: 8 })],
		})
		await library.changeRating(0, '8')

		expect(mockedApi.patch).toHaveBeenCalledWith('/api/entries/1', {
			rating: 8,
		})
	})

	it('only patches year_played when the value actually changes', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [makeEntry({ id: 1, year_played: 2023 })],
		})
		const library = new LibraryPageObject()
		await waitFor(() => expect(library.entryRows).toHaveLength(1))

		await library.changeYear(0, '2023')
		expect(mockedApi.patch).not.toHaveBeenCalled()

		mockedApi.patch.mockResolvedValueOnce(undefined)
		mockedApi.get.mockResolvedValueOnce({
			results: [makeEntry({ id: 1, year_played: 2024 })],
		})
		await library.changeYear(0, '2024')

		expect(mockedApi.patch).toHaveBeenCalledWith('/api/entries/1', {
			year_played: 2024,
		})
	})

	it('deletes an entry and refetches', async () => {
		mockedApi.get.mockResolvedValueOnce({ results: [makeEntry({ id: 1 })] })
		const library = new LibraryPageObject()
		await waitFor(() => expect(library.entryRows).toHaveLength(1))

		mockedApi.del.mockResolvedValueOnce(undefined)
		mockedApi.get.mockResolvedValueOnce({ results: [] })
		await library.deleteAt(0)

		expect(mockedApi.del).toHaveBeenCalledWith('/api/entries/1')
		await waitFor(() => expect(library.emptyText).toBe(true))
	})

	it('hides the year filter when no entry has a year played', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [makeEntry({ id: 1, year_played: null })],
		})
		const library = new LibraryPageObject()
		await waitFor(() => expect(library.entryRows).toHaveLength(1))

		expect(library.yearFilterVisible).toBe(false)
	})

	it('narrows the visible list using the year-played filter', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [
				makeEntry({ id: 1, year_played: 2023 }),
				makeEntry({ id: 2, year_played: 2022 }),
			],
		})
		const library = new LibraryPageObject()
		await waitFor(() => expect(library.entryRows).toHaveLength(2))
		expect(library.yearFilterVisible).toBe(true)

		await library.selectYearFilter('2023')

		await waitFor(() => expect(library.entryRows).toHaveLength(1))
	})
})
