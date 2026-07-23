import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { GameDetail } from '../../pages/GameDetail'
import { renderWithProviders } from '../render'

export class GameDetailPageObject {
	private user = userEvent.setup()
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

	get hasReviewsSection(): boolean {
		return this.container.querySelector('.game-detail__reviews') !== null
	}

	get reviewCardBodies(): string[] {
		return Array.from(
			this.container.querySelectorAll('.review-card__body'),
		).map((el) => el.textContent ?? '')
	}

	get hasReviewForm(): boolean {
		return this.container.querySelector('.review-form') !== null
	}

	get myReviewBody(): string | null {
		return (
			this.container.querySelector('.review-form__body')?.textContent ?? null
		)
	}

	get hasCreateReviewBox(): boolean {
		return this.container.querySelector('.review-form__create') !== null
	}

	async clickEditReview() {
		await this.user.click(screen.getByRole('button', { name: 'Edit review' }))
	}

	async clickDeleteReview() {
		await this.user.click(screen.getByRole('button', { name: 'Delete review' }))
	}

	get editModal() {
		return screen.queryByRole('dialog', { name: 'Edit your review' })
	}

	get deleteConfirmModal() {
		return screen.queryByRole('dialog', { name: 'Delete review?' })
	}

	get reviewTextarea(): HTMLTextAreaElement | null {
		return this.container.querySelector('.review-form__textarea')
	}

	async typeReviewBody(value: string) {
		const textarea = this.reviewTextarea as HTMLTextAreaElement
		await this.user.clear(textarea)
		if (value) await this.user.type(textarea, value)
	}

	async clickPostReview() {
		await this.user.click(screen.getByRole('button', { name: /Post review/ }))
	}

	async clickSaveReview() {
		const modal = this.editModal as HTMLElement
		await this.user.click(
			within(modal).getByRole('button', { name: 'Save review' }),
		)
	}

	async clickConfirmDelete() {
		const modal = this.deleteConfirmModal as HTMLElement
		await this.user.click(within(modal).getByRole('button', { name: 'Delete' }))
	}

	async clickCancelModal() {
		const modal = (this.editModal ?? this.deleteConfirmModal) as HTMLElement
		await this.user.click(within(modal).getByRole('button', { name: 'Cancel' }))
	}

	closeModalViaEscape() {
		fireEvent.keyDown(document, { key: 'Escape' })
	}
}
