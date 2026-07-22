import { act, fireEvent, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './ToastContext'

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()
})

describe('ToastContext', () => {
	it('throws when useToast is called outside a ToastProvider', () => {
		expect(() => renderHook(() => useToast())).toThrow(
			'useToast must be used within ToastProvider',
		)
	})

	it('renders a toast with the given message', () => {
		const { result } = renderHook(() => useToast(), { wrapper: ToastProvider })

		act(() => {
			result.current.showToast({ message: 'Hades added to your library' })
		})

		expect(screen.getByText('Hades added to your library')).toBeInTheDocument()
	})

	it('stacks multiple toasts independently', () => {
		const { result } = renderHook(() => useToast(), { wrapper: ToastProvider })

		act(() => {
			result.current.showToast({ message: 'First' })
			result.current.showToast({ message: 'Second' })
		})

		expect(screen.getByText('First')).toBeInTheDocument()
		expect(screen.getByText('Second')).toBeInTheDocument()
	})

	it('auto-dismisses after the default 5s duration', () => {
		const { result } = renderHook(() => useToast(), { wrapper: ToastProvider })

		act(() => {
			result.current.showToast({ message: 'Removed from library' })
		})
		expect(screen.getByText('Removed from library')).toBeInTheDocument()

		act(() => {
			vi.advanceTimersByTime(5000)
		})
		// Exit-animation window before the toast actually unmounts.
		act(() => {
			vi.advanceTimersByTime(200)
		})

		expect(screen.queryByText('Removed from library')).not.toBeInTheDocument()
	})

	it('respects a custom durationMs', () => {
		const { result } = renderHook(() => useToast(), { wrapper: ToastProvider })

		act(() => {
			result.current.showToast({ message: 'Quick toast', durationMs: 1000 })
		})

		act(() => {
			vi.advanceTimersByTime(1000)
			vi.advanceTimersByTime(200)
		})

		expect(screen.queryByText('Quick toast')).not.toBeInTheDocument()
	})

	it('invokes the action callback and dismisses right away when its button is clicked', () => {
		const onAction = vi.fn()
		const { result } = renderHook(() => useToast(), { wrapper: ToastProvider })

		act(() => {
			result.current.showToast({
				message: 'Game removed from your library',
				actionLabel: 'Undo',
				onAction,
			})
		})

		act(() => {
			fireEvent.click(screen.getByText('Undo'))
		})

		expect(onAction).toHaveBeenCalledTimes(1)

		act(() => {
			vi.advanceTimersByTime(200)
		})
		expect(
			screen.queryByText('Game removed from your library'),
		).not.toBeInTheDocument()
	})

	it('dismisses when the close button is clicked, without waiting for the timer', () => {
		const { result } = renderHook(() => useToast(), { wrapper: ToastProvider })

		act(() => {
			result.current.showToast({ message: 'Dismiss me' })
		})

		act(() => {
			fireEvent.click(screen.getByLabelText('Dismiss notification'))
		})
		act(() => {
			vi.advanceTimersByTime(200)
		})

		expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument()
	})
})
