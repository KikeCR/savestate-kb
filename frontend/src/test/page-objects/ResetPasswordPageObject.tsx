import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { ResetPassword } from '../../pages/ResetPassword'
import { renderWithProviders } from '../render'

export class ResetPasswordPageObject {
	private user = userEvent.setup()
	private container: HTMLElement

	constructor(token = 'test-token') {
		const result = renderWithProviders(
			<Routes>
				<Route path="/reset-password/:token" element={<ResetPassword />} />
				<Route path="/dashboard" element={<p>Dashboard page</p>} />
				<Route path="/forgot-password" element={<p>Forgot password page</p>} />
			</Routes>,
			{ route: `/reset-password/${token}` },
		)
		this.container = result.container
	}

	get passwordInput() {
		return screen.getByLabelText('New password') as HTMLInputElement
	}

	get confirmPasswordInput() {
		return screen.getByLabelText('Confirm new password') as HTMLInputElement
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

	get isOnDashboard(): boolean {
		return this.container.textContent?.includes('Dashboard page') ?? false
	}

	async fillPassword(value: string) {
		await this.user.type(this.passwordInput, value)
	}

	async fillConfirmPassword(value: string) {
		await this.user.type(this.confirmPasswordInput, value)
	}

	async submit() {
		await this.user.click(this.submitButton)
	}
}
