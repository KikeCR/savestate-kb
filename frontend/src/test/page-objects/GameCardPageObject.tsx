import { GameCard } from '../../components/GameCard'
import { renderWithProviders } from '../render'
import type { Entry } from '../../types'

export class GameCardPageObject {
	private container: HTMLElement

	constructor(props: { entry: Entry; dragging?: boolean }) {
		const { container } = renderWithProviders(<GameCard {...props} />, {
			withAuth: false,
		})
		this.container = container
	}

	get title(): string | null {
		return (
			this.container.querySelector('.game-card__title')?.textContent ?? null
		)
	}

	get coverImage(): HTMLImageElement | null {
		return this.container.querySelector('img')
	}

	get coverLinkHref(): string | null {
		return (
			this.container.querySelector('.game-card__cover')?.getAttribute('href') ??
			null
		)
	}

	get hasCoverPlaceholder(): boolean {
		return (
			this.container.querySelector('.game-card__cover-placeholder') !== null
		)
	}

	get ratingText(): string | null {
		return (
			this.container.querySelector('.game-card__rating')?.textContent ?? null
		)
	}

	get hasFavoriteIcon(): boolean {
		return this.container.querySelector('.game-card__favorite') !== null
	}

	get isDragging(): boolean {
		return this.container.querySelector('.game-card--dragging') !== null
	}

	get statusText(): string | null {
		return this.container.querySelector('.status-badge')?.textContent ?? null
	}
}
