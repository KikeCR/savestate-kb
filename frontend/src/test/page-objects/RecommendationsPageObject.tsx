import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Recommendations } from '../../pages/Recommendations'
import { renderWithProviders } from '../render'

export class RecommendationsPageObject {
	private user = userEvent.setup()
	private container: HTMLElement

	constructor() {
		const result = renderWithProviders(<Recommendations />)
		this.container = result.container
	}

	get errorText(): string | null {
		return this.container.querySelector('.error')?.textContent ?? null
	}

	get emptyText(): string | null {
		return (
			this.container.querySelector('.recommendations__empty')?.textContent ??
			null
		)
	}

	get sourceText(): string | null {
		return (
			this.container.querySelector('.recommendations__source')?.textContent ??
			null
		)
	}

	get cardCount(): number {
		return this.container.querySelectorAll('.recommendation-card').length
	}

	get cardTitles(): string[] {
		return Array.from(
			this.container.querySelectorAll('.recommendation-card__title'),
		).map((el) => el.textContent ?? '')
	}

	get cardStaggerIndexes(): string[] {
		return Array.from(
			this.container.querySelectorAll<HTMLElement>('.recommendation-card'),
		).map((el) => el.style.getPropertyValue('--stagger-index'))
	}

	get refreshButton() {
		return screen.getByRole('button', { name: /refresh/i })
	}

	get isThinking(): boolean {
		return this.container.querySelector('.thinking-indicator') !== null
	}

	get thinkingText(): string | null {
		return (
			this.container.querySelector('.thinking-indicator__text')?.textContent ??
			null
		)
	}

	async clickRefresh() {
		await this.user.click(this.refreshButton)
	}
}
