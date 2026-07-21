import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '../../components/ThemeToggle'
import { renderWithProviders } from '../render'

export class ThemeTogglePageObject {
	private user = userEvent.setup()

	constructor() {
		renderWithProviders(<ThemeToggle />, { withAuth: false })
	}

	get button() {
		return screen.getByRole('button')
	}

	get ariaLabel() {
		return this.button.getAttribute('aria-label')
	}

	async click() {
		await this.user.click(this.button)
	}
}
