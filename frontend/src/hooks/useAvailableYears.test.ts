import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAvailableYears } from './useAvailableYears'
import type { Entry } from '../types'

const makeEntry = (year: number | null): Entry =>
	({
		year_played: year,
	}) as Entry

describe('useAvailableYears', () => {
	it('returns an empty array when there are no entries', () => {
		const { result } = renderHook(() => useAvailableYears([]))

		expect(result.current).toEqual([])
	})

	it('filters out entries with a null year_played', () => {
		const entries = [makeEntry(2023), makeEntry(null)]

		const { result } = renderHook(() => useAvailableYears(entries))

		expect(result.current).toEqual([2023])
	})

	it('dedupes repeated years and sorts them descending', () => {
		const entries = [
			makeEntry(2021),
			makeEntry(2023),
			makeEntry(2021),
			makeEntry(2022),
		]

		const { result } = renderHook(() => useAvailableYears(entries))

		expect(result.current).toEqual([2023, 2022, 2021])
	})
})
