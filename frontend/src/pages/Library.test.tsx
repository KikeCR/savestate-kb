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

	it('shows a toast with Undo after adding, and Undo removes the new entry', async () => {
		mockedApi.get.mockResolvedValueOnce({ results: [] })
		const library = new LibraryPageObject()
		await waitFor(() => expect(library.emptyText).toBe(true))

		mockedApi.get.mockResolvedValueOnce({
			results: [makeGame({ id: 9, title: 'Hades' })],
		})
		await library.search('Hades')
		await waitFor(() => expect(library.searchResults).toHaveLength(1))

		mockedApi.post.mockResolvedValueOnce(
			makeEntry({ id: 9, game: makeGame({ id: 9, title: 'Hades' }) }),
		)
		mockedApi.get.mockResolvedValueOnce({
			results: [
				makeEntry({ id: 9, game: makeGame({ id: 9, title: 'Hades' }) }),
			],
		})
		await library.addResult(0)
		await waitFor(() => expect(library.entryRows).toHaveLength(1))

		await waitFor(() =>
			expect(library.toastText).toContain('Hades added to your library'),
		)

		mockedApi.del.mockResolvedValueOnce(undefined)
		mockedApi.get.mockResolvedValueOnce({ results: [] })
		await library.clickUndo()

		expect(mockedApi.del).toHaveBeenCalledWith('/api/entries/9')
		await waitFor(() => expect(library.emptyText).toBe(true))
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

		// The row plays a brief exit animation, so the actual delete request
		// only fires once that finishes rather than synchronously on click.
		await waitFor(() =>
			expect(mockedApi.del).toHaveBeenCalledWith('/api/entries/1'),
		)
		await waitFor(() => expect(library.emptyText).toBe(true))
	})

	it('marks the row as removing immediately, before the delete request fires', async () => {
		mockedApi.get.mockResolvedValueOnce({ results: [makeEntry({ id: 1 })] })
		const library = new LibraryPageObject()
		await waitFor(() => expect(library.entryRows).toHaveLength(1))

		mockedApi.del.mockResolvedValueOnce(undefined)
		mockedApi.get.mockResolvedValueOnce({ results: [] })
		await library.deleteAt(0)

		expect(library.isRemoving(0)).toBe(true)
		expect(mockedApi.del).not.toHaveBeenCalled()

		await waitFor(() => expect(library.emptyText).toBe(true))
	})

	it('shows a toast with Undo after removing, and Undo restores the entry', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [
				makeEntry({
					id: 1,
					game: makeGame({ id: 7, title: 'Celeste' }),
					status: 'completed',
					rating: 9,
				}),
			],
		})
		const library = new LibraryPageObject()
		await waitFor(() => expect(library.entryRows).toHaveLength(1))

		mockedApi.del.mockResolvedValueOnce(undefined)
		mockedApi.get.mockResolvedValueOnce({ results: [] })
		await library.deleteAt(0)
		await waitFor(() => expect(library.emptyText).toBe(true))

		await waitFor(() =>
			expect(library.toastText).toContain('Celeste removed from your library'),
		)

		mockedApi.post.mockResolvedValueOnce(
			makeEntry({ id: 2, game: makeGame({ id: 7, title: 'Celeste' }) }),
		)
		mockedApi.get.mockResolvedValueOnce({
			results: [
				makeEntry({ id: 2, game: makeGame({ id: 7, title: 'Celeste' }) }),
			],
		})
		await library.clickUndo()

		expect(mockedApi.post).toHaveBeenCalledWith('/api/entries', {
			game_id: 7,
			status: 'completed',
			rating: 9,
			start_date: null,
			completion_date: null,
			year_played: null,
			hours_played: 0,
			notes: null,
			favorite: false,
			replay_count: 0,
			platform_played: null,
			tags: [],
		})
		await waitFor(() => expect(library.entryRows).toHaveLength(1))
	})

	it('shows an error toast when undoing a removal conflicts with an existing entry', async () => {
		mockedApi.get.mockResolvedValueOnce({
			results: [
				makeEntry({ id: 1, game: makeGame({ id: 7, title: 'Celeste' }) }),
			],
		})
		const library = new LibraryPageObject()
		await waitFor(() => expect(library.entryRows).toHaveLength(1))

		mockedApi.del.mockResolvedValueOnce(undefined)
		mockedApi.get.mockResolvedValueOnce({ results: [] })
		await library.deleteAt(0)
		await waitFor(() =>
			expect(library.toastText).toContain('Celeste removed from your library'),
		)

		mockedApi.post.mockRejectedValueOnce(
			new Error('this game is already in your library'),
		)
		await library.clickUndo()

		await waitFor(() => expect(library.toastText).toContain('Could not undo'))
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
