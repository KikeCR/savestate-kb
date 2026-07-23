import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
	it('renders the title and children', () => {
		render(
			<Modal title="Delete review?" onClose={vi.fn()}>
				<p>Are you sure?</p>
			</Modal>,
		)

		expect(screen.getByRole('dialog', { name: 'Delete review?' })).toBeTruthy()
		expect(screen.getByText('Are you sure?')).toBeTruthy()
	})

	it('calls onClose when the close button is clicked', () => {
		const onClose = vi.fn()
		render(
			<Modal title="Edit review" onClose={onClose}>
				<p>content</p>
			</Modal>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Close' }))

		expect(onClose).toHaveBeenCalled()
	})

	it('calls onClose when clicking the overlay', () => {
		const onClose = vi.fn()
		const { container } = render(
			<Modal title="Edit review" onClose={onClose}>
				<p>content</p>
			</Modal>,
		)

		fireEvent.click(container.querySelector('.modal-overlay')!)

		expect(onClose).toHaveBeenCalled()
	})

	it('does not call onClose when clicking inside the modal panel', () => {
		const onClose = vi.fn()
		render(
			<Modal title="Edit review" onClose={onClose}>
				<p>content</p>
			</Modal>,
		)

		fireEvent.click(screen.getByText('content'))

		expect(onClose).not.toHaveBeenCalled()
	})

	it('calls onClose when the Escape key is pressed', () => {
		const onClose = vi.fn()
		render(
			<Modal title="Edit review" onClose={onClose}>
				<p>content</p>
			</Modal>,
		)

		fireEvent.keyDown(document, { key: 'Escape' })

		expect(onClose).toHaveBeenCalled()
	})
})
