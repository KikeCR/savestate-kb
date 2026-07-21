import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FollowButton } from '../../components/FollowButton'
import { renderWithProviders } from '../render'
import type { FollowActionResponse } from '../../types'

interface FollowButtonProps {
	username: string
	isFollowing: boolean
	onToggle: (result: FollowActionResponse) => void
	onError?: (message: string) => void
}

export class FollowButtonPageObject {
	private user = userEvent.setup()

	constructor(props: FollowButtonProps) {
		renderWithProviders(<FollowButton {...props} />, { withAuth: false })
	}

	get button() {
		return screen.getByRole('button')
	}

	get label() {
		return this.button.textContent
	}

	get isDisabled() {
		return this.button.hasAttribute('disabled')
	}

	async click() {
		await this.user.click(this.button)
	}
}
