import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../pages/Dashboard'
import { renderWithProviders } from '../render'

export class DashboardPageObject {
	private user = userEvent.setup()
	private container: HTMLElement

	constructor() {
		const result = renderWithProviders(<Dashboard />)
		this.container = result.container
	}

	get errorText(): string | null {
		return this.container.querySelector('.error')?.textContent ?? null
	}

	get statTileValues(): (string | null)[] {
		return Array.from(this.container.querySelectorAll('.stat-tile__value')).map(
			(el) => el.textContent,
		)
	}

	get currentlyPlayingEmptyText(): boolean {
		return this.container.textContent?.includes('Nothing in progress') ?? false
	}

	get gameCardCount(): number {
		return this.container.querySelectorAll('.game-card').length
	}

	get recentActivityEmptyText(): boolean {
		return this.container.textContent?.includes('No activity yet.') ?? false
	}

	get activityItems(): HTMLElement[] {
		return Array.from(this.container.querySelectorAll('.activity-feed li'))
	}

	get publicRadio() {
		return screen.getByRole('radio', { name: 'Public' }) as HTMLInputElement
	}

	get privateRadio() {
		return screen.getByRole('radio', { name: 'Private' }) as HTMLInputElement
	}

	async choosePublic() {
		await this.user.click(this.publicRadio)
	}

	async choosePrivate() {
		await this.user.click(this.privateRadio)
	}

	get avatarInput() {
		return screen.getByPlaceholderText(
			'https://example.com/avatar.png',
		) as HTMLInputElement
	}

	get saveButton() {
		return screen.getByRole('button', { name: 'Save' })
	}

	get clearButton() {
		return screen.getByRole('button', { name: 'Clear' })
	}

	async setAvatarUrl(value: string) {
		await this.user.clear(this.avatarInput)
		if (value) await this.user.type(this.avatarInput, value)
	}

	async clickSave() {
		await this.user.click(this.saveButton)
	}

	async clickClear() {
		await this.user.click(this.clearButton)
	}

	get changePasswordTab() {
		return screen.getByRole('tab', { name: 'Change Password' })
	}

	async openChangePasswordTab() {
		await this.user.click(this.changePasswordTab)
	}

	get currentPasswordInput() {
		return screen.getByLabelText('Current password') as HTMLInputElement
	}

	get newPasswordInput() {
		return screen.getByLabelText('New password') as HTMLInputElement
	}

	get confirmNewPasswordInput() {
		return screen.getByLabelText('Confirm new password') as HTMLInputElement
	}

	get updatePasswordButton() {
		return screen.getByRole('button', { name: /Update password|Updating/ })
	}

	async changePassword(current: string, next: string, confirm: string) {
		await this.openChangePasswordTab()
		await this.user.type(this.currentPasswordInput, current)
		await this.user.type(this.newPasswordInput, next)
		await this.user.type(this.confirmNewPasswordInput, confirm)
		await this.user.click(this.updatePasswordButton)
	}

	get toastText(): string | null {
		return this.container.querySelector('.toast__message')?.textContent ?? null
	}
}
