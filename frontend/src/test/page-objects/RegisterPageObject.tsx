import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { Register } from '../../pages/Register'
import { renderWithProviders } from '../render'

export class RegisterPageObject {
	private user = userEvent.setup()
	private container: HTMLElement

	constructor() {
		const result = renderWithProviders(
			<Routes>
				<Route path="/register" element={<Register />} />
				<Route path="/dashboard" element={<p>Dashboard page</p>} />
			</Routes>,
			{ route: '/register' },
		)
		this.container = result.container
	}

	get emailInput() {
		return screen.getByLabelText('Email') as HTMLInputElement
	}

	get usernameInput() {
		return screen.getByLabelText('Username') as HTMLInputElement
	}

	get passwordInput() {
		return screen.getByLabelText('Password') as HTMLInputElement
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

	async fillEmail(value: string) {
		await this.user.type(this.emailInput, value)
	}

	async fillUsername(value: string) {
		await this.user.type(this.usernameInput, value)
	}

	async fillPassword(value: string) {
		await this.user.type(this.passwordInput, value)
	}

	async submit() {
		await this.user.click(this.submitButton)
	}
}
