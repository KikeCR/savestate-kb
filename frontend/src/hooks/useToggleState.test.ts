import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useToggleState } from './useToggleState'

describe('useToggleState', () => {
	it('defaults to the given initial value', () => {
		const { result } = renderHook(() => useToggleState('flag', true))

		expect(result.current[0]).toBe(true)
	})

	it('defaults to false when no initial value is given', () => {
		const { result } = renderHook(() => useToggleState('flag'))

		expect(result.current[0]).toBe(false)
	})

	it('flips the value and persists it to localStorage', () => {
		const { result } = renderHook(() => useToggleState('flag', false))

		act(() => {
			result.current[1]()
		})

		expect(result.current[0]).toBe(true)
		expect(localStorage.getItem('flag')).toBe(JSON.stringify(true))

		act(() => {
			result.current[1]()
		})

		expect(result.current[0]).toBe(false)
	})
})
