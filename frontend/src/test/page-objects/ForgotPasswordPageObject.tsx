import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForgotPassword } from '../../pages/ForgotPassword'
import { renderWithProviders } from '../render'

export class ForgotPasswordPageObject {
	private user = userEvent.setup()
	private container: HTMLElement

	constructor() {
		const result = renderWithProviders(<ForgotPassword />, {
			route: '/forgot-password',
		})
		this.container = result.container
	}

	get emailInput() {
		return screen.getByLabelText('Email') as HTMLInputElement
	}

	get submitButton() {
		return screen.getByRole('button')
	}

	get submitButtonText() {
		return this.submitButton.textContent
	}

	get errorMessage(): string | null {
		return this.container.querySelector('.error')?.textContent ?? null
	}

	get confirmationText(): string | null {
		return this.container.textContent?.includes(
			'a reset link has been sent to it',
		)
			? this.container.textContent
			: null
	}

	async fillEmail(value: string) {
		await this.user.type(this.emailInput, value)
	}

	async submit() {
		await this.user.click(this.submitButton)
	}
}
