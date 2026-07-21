import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThinkingIndicatorPageObject } from '../../test/page-objects/ThinkingIndicatorPageObject'
import { DEFAULT_THINKING_MESSAGES } from './ThinkingIndicator'

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()
})

describe('ThinkingIndicator', () => {
	it('shows the first message immediately', () => {
		const indicator = new ThinkingIndicatorPageObject({
			messages: ['One', 'Two'],
			intervalMs: 1000,
		})

		expect(indicator.text).toBe('One')
	})

	it('cycles to the next message after the interval elapses', () => {
		const indicator = new ThinkingIndicatorPageObject({
			messages: ['One', 'Two'],
			intervalMs: 1000,
		})

		act(() => {
			vi.advanceTimersByTime(1000)
		})

		expect(indicator.text).toBe('Two')
	})

	it('wraps back to the first message after the last one', () => {
		const indicator = new ThinkingIndicatorPageObject({
			messages: ['One', 'Two'],
			intervalMs: 1000,
		})

		act(() => {
			vi.advanceTimersByTime(2000)
		})

		expect(indicator.text).toBe('One')
	})

	it('uses the default message list when none is provided', () => {
		const indicator = new ThinkingIndicatorPageObject()

		expect(indicator.text).toBe(DEFAULT_THINKING_MESSAGES[0])
	})
})
