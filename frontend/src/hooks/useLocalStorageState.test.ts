import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLocalStorageState } from './useLocalStorageState'

describe('useLocalStorageState', () => {
	it('falls back to the initial value when the key is absent', () => {
		const { result } = renderHook(() =>
			useLocalStorageState('missing', 'default'),
		)

		expect(result.current[0]).toBe('default')
	})

	it('reads an existing JSON value from localStorage on init', () => {
		localStorage.setItem('count', JSON.stringify(5))

		const { result } = renderHook(() => useLocalStorageState('count', 0))

		expect(result.current[0]).toBe(5)
	})

	it('falls back to the initial value when the stored value is corrupt JSON', () => {
		localStorage.setItem('count', '{not-json')

		const { result } = renderHook(() => useLocalStorageState('count', 42))

		expect(result.current[0]).toBe(42)
	})

	it('persists every setState call to localStorage as JSON', () => {
		const { result } = renderHook(() => useLocalStorageState('count', 0))

		act(() => {
			result.current[1](7)
		})

		expect(result.current[0]).toBe(7)
		expect(localStorage.getItem('count')).toBe(JSON.stringify(7))
	})
})
