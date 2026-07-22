import userEvent from '@testing-library/user-event'
import { RecommendationCard } from '../../components/RecommendationCard'
import { renderWithProviders } from '../render'
import type { Recommendation } from '../../types'

export class RecommendationCardPageObject {
	private user = userEvent.setup()
	private container: HTMLElement

	constructor(props: {
		recommendation: Recommendation
		isExiting?: boolean
		onAdded?: (gameId: number) => void
		onDisliked?: (gameId: number) => void
		onError?: (message: string) => void
	}) {
		const { container } = renderWithProviders(
			<RecommendationCard {...props} />,
			{
				withAuth: false,
			},
		)
		this.container = container
	}

	get title(): string | null {
		return (
			this.container.querySelector('.recommendation-card__title')
				?.textContent ?? null
		)
	}

	get reasonText(): string | null {
		return (
			this.container.querySelector('.recommendation-card__reason')
				?.textContent ?? null
		)
	}

	get coverImage(): HTMLImageElement | null {
		return this.container.querySelector('img')
	}

	get hasCoverPlaceholder(): boolean {
		return (
			this.container.querySelector(
				'.recommendation-card__cover-placeholder',
			) !== null
		)
	}

	get scoreText(): string | null {
		return (
			this.container.querySelector('.recommendation-card__score')
				?.textContent ?? null
		)
	}

	get genreTexts(): string[] {
		return Array.from(
			this.container.querySelectorAll('.recommendation-card__genre'),
		).map((el) => el.textContent ?? '')
	}

	get addButton(): HTMLButtonElement {
		return this.container.querySelector(
			'.recommendation-card__add',
		) as HTMLButtonElement
	}

	get addButtonText(): string | null {
		return this.addButton?.textContent ?? null
	}

	async clickAdd() {
		await this.user.click(this.addButton)
	}

	get likeButton(): HTMLButtonElement {
		return this.container.querySelector(
			'.recommendation-card__like',
		) as HTMLButtonElement
	}

	get dislikeButton(): HTMLButtonElement {
		return this.container.querySelector(
			'.recommendation-card__dislike',
		) as HTMLButtonElement
	}

	get isLiked(): boolean {
		return this.likeButton?.getAttribute('aria-pressed') === 'true'
	}

	get isExiting(): boolean {
		return (
			this.container
				.querySelector('.recommendation-card')
				?.classList.contains('recommendation-card--exiting') ?? false
		)
	}

	async clickLike() {
		await this.user.click(this.likeButton)
	}

	async clickDislike() {
		await this.user.click(this.dislikeButton)
	}

	get toastText(): string | null {
		return this.container.querySelector('.toast__message')?.textContent ?? null
	}

	get toastActionButton(): HTMLButtonElement | null {
		return this.container.querySelector('.toast__action')
	}

	async clickUndo() {
		if (this.toastActionButton) await this.user.click(this.toastActionButton)
	}
}
