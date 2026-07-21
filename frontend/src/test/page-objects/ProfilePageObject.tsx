import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { Profile } from '../../pages/Profile'
import { renderWithProviders } from '../render'

export class ProfilePageObject {
	private container: HTMLElement

	constructor(username = 'sam') {
		const result = renderWithProviders(
			<Routes>
				<Route path="/profile/:username" element={<Profile />} />
			</Routes>,
			{ route: `/profile/${username}` },
		)
		this.container = result.container
	}

	get isLoading(): boolean {
		return this.container.textContent?.includes('Loading...') ?? false
	}

	get errorText(): string | null {
		return this.container.querySelector('.error')?.textContent ?? null
	}

	get heading(): string | null {
		return this.container.querySelector('h1')?.textContent ?? null
	}

	get isOwnerBanner(): boolean {
		return (
			this.container.textContent?.includes('This is your profile.') ?? false
		)
	}

	get followRowText(): string | null {
		return (
			this.container.querySelector('.profile-follow-row')?.textContent ?? null
		)
	}

	get hasFollowButton(): boolean {
		return screen.queryByRole('button') !== null
	}

	get emptyLibraryText(): boolean {
		return (
			this.container.textContent?.includes('No games tracked yet.') ?? false
		)
	}

	get gameCardCount(): number {
		return this.container.querySelectorAll('.game-card').length
	}
}
