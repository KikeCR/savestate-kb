import { Route, Routes } from 'react-router-dom'
import { GameDetail } from '../../pages/GameDetail'
import { renderWithProviders } from '../render'

export class GameDetailPageObject {
	private container: HTMLElement

	constructor(id = '1') {
		const result = renderWithProviders(
			<Routes>
				<Route path="/games/:id" element={<GameDetail />} />
			</Routes>,
			{ route: `/games/${id}` },
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

	get coverImage(): HTMLImageElement | null {
		return this.container.querySelector('img')
	}

	get hasCoverPlaceholder(): boolean {
		return (
			this.container.querySelector('.game-detail__cover-placeholder') !== null
		)
	}

	get platformTags(): string[] {
		return Array.from(
			this.container.querySelectorAll(
				'.game-detail__tag:not(.game-detail__tag--genre)',
			),
		).map((el) => el.textContent ?? '')
	}

	get genreTags(): string[] {
		return Array.from(
			this.container.querySelectorAll('.game-detail__tag--genre'),
		).map((el) => el.textContent ?? '')
	}

	get scoresText(): string | null {
		return (
			this.container.querySelector('.game-detail__scores')?.textContent ?? null
		)
	}

	get description(): string | null {
		return (
			this.container.querySelector('.game-detail__description')?.textContent ??
			null
		)
	}

	get descriptionHeadings(): string[] {
		return Array.from(
			this.container.querySelectorAll('.game-detail__description h3'),
		).map((el) => el.textContent ?? '')
	}

	get addButtonText(): string | null {
		return (
			this.container.querySelector('.game-detail__add')?.textContent ?? null
		)
	}
}
