import userEvent from '@testing-library/user-event'
import { PopularGameCard } from '../../components/PopularGameCard'
import { renderWithProviders } from '../render'
import type { Game } from '../../types'

export class PopularGameCardPageObject {
	private user = userEvent.setup()
	private container: HTMLElement

	constructor(props: {
		game: Game
		onAdded?: (gameId: number) => void
		onError?: (message: string) => void
	}) {
		const { container } = renderWithProviders(<PopularGameCard {...props} />)
		this.container = container
	}

	get coverLinkHref(): string | null {
		return (
			this.container
				.querySelector('.popular-game-card__cover')
				?.getAttribute('href') ?? null
		)
	}

	get title(): string | null {
		return (
			this.container.querySelector('.popular-game-card__title')?.textContent ??
			null
		)
	}

	get scoreText(): string | null {
		return (
			this.container.querySelector('.popular-game-card__score')?.textContent ??
			null
		)
	}

	get genreTexts(): string[] {
		return Array.from(
			this.container.querySelectorAll('.popular-game-card__genre'),
		).map((el) => el.textContent ?? '')
	}

	get addButton(): HTMLButtonElement {
		return this.container.querySelector(
			'.popular-game-card__add',
		) as HTMLButtonElement
	}

	get addButtonText(): string | null {
		return this.addButton?.textContent ?? null
	}

	get isLoginLink(): boolean {
		return this.addButton?.tagName === 'A'
	}

	async clickAdd() {
		await this.user.click(this.addButton)
	}

	get toastText(): string | null {
		return this.container.querySelector('.toast__message')?.textContent ?? null
	}
}
