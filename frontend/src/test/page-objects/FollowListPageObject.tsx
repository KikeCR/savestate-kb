import userEvent from '@testing-library/user-event'
import type { ComponentType } from 'react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../render'

export class FollowListPageObject {
	private user = userEvent.setup()
	private container: HTMLElement

	constructor(Component: ComponentType, username = 'sam') {
		const result = renderWithProviders(
			<Routes>
				<Route path="/profile/:username/followers" element={<Component />} />
			</Routes>,
			{ route: `/profile/${username}/followers` },
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

	get backLinkHref(): string | null {
		return (
			this.container
				.querySelector('.follow-list__back')
				?.getAttribute('href') ?? null
		)
	}

	get emptyText(): string | null {
		return this.container.querySelector('p:not(.error)')?.textContent ?? null
	}

	get rows(): HTMLElement[] {
		return Array.from(this.container.querySelectorAll('.follow-list li'))
	}

	usernameAt(i: number): string | null {
		return (
			this.rows[i]?.querySelector('.follow-list__user')?.textContent?.trim() ??
			null
		)
	}

	followButtonAt(i: number): HTMLButtonElement | null {
		return this.rows[i]?.querySelector('button') ?? null
	}

	async clickFollowButtonAt(i: number) {
		const button = this.followButtonAt(i)
		if (button) await this.user.click(button)
	}
}
