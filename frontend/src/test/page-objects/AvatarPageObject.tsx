import { fireEvent } from '@testing-library/react'
import { Avatar } from '../../components/Avatar'
import { renderWithProviders } from '../render'

interface AvatarProps {
	username: string
	avatarUrl?: string | null
	size?: number
}

export class AvatarPageObject {
	private container: HTMLElement

	constructor(props: AvatarProps) {
		const { container } = renderWithProviders(<Avatar {...props} />, {
			withAuth: false,
		})
		this.container = container
	}

	get image(): HTMLImageElement | null {
		return this.container.querySelector('img')
	}

	private get initialsElement(): HTMLElement | null {
		return this.container.querySelector('.avatar--initials')
	}

	get initialsText(): string | null {
		return this.initialsElement?.textContent ?? null
	}

	get backgroundColor(): string | null {
		return this.initialsElement?.style.backgroundColor || null
	}

	simulateImageError() {
		if (this.image) fireEvent.error(this.image)
	}
}
