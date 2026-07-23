import { Pencil, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import type { Entry, Review } from '../../types'
import { Modal } from '../Modal'
import './ReviewForm.css'

interface ReviewFormProps {
	gameId: number
	myEntry: Entry | null
	existingReview: Review | null
	onSaved: (review: Review) => void
	onDeleted: () => void
}

export const ReviewForm = ({
	gameId,
	myEntry,
	existingReview,
	onSaved,
	onDeleted,
}: ReviewFormProps) => {
	const [createBody, setCreateBody] = useState('')
	const [editBody, setEditBody] = useState('')
	const [editModalOpen, setEditModalOpen] = useState(false)
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
	const [saving, setSaving] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const { showToast } = useToast()

	const openEditModal = () => {
		setEditBody(existingReview?.body ?? '')
		setError(null)
		setEditModalOpen(true)
	}

	const closeEditModal = () => {
		setEditModalOpen(false)
		setError(null)
	}

	const closeConfirmDelete = () => {
		setConfirmDeleteOpen(false)
		setError(null)
	}

	const saveReview = (body: string, onDone: () => void) => {
		const trimmed = body.trim()
		if (!trimmed) return
		setSaving(true)
		setError(null)
		api
			.put<Review>(`/api/reviews/${gameId}`, { body: trimmed })
			.then((review) => {
				onSaved(review)
				onDone()
				showToast({ message: 'Review saved' })
			})
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
			.finally(() => setSaving(false))
	}

	const handleCreateSave = () => saveReview(createBody, () => setCreateBody(''))
	const handleEditSave = () =>
		saveReview(editBody, () => setEditModalOpen(false))

	const handleConfirmDelete = () => {
		setDeleting(true)
		setError(null)
		api
			.del(`/api/reviews/${gameId}`)
			.then(() => {
				onDeleted()
				setConfirmDeleteOpen(false)
				showToast({ message: 'Review removed' })
			})
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
			.finally(() => setDeleting(false))
	}

	return (
		<div className="review-form">
			<div className="review-form__header">
				<h2>Your review</h2>
				<div className="review-form__header-right">
					{myEntry?.rating != null && (
						<span className="review-form__rating">
							<Star size={14} /> {myEntry.rating}/10
						</span>
					)}
					{existingReview && (
						<>
							<button
								type="button"
								className="review-form__icon-btn"
								onClick={openEditModal}
								aria-label="Edit review"
							>
								<Pencil size={14} />
							</button>
							<button
								type="button"
								className="review-form__icon-btn"
								onClick={() => setConfirmDeleteOpen(true)}
								aria-label="Delete review"
							>
								<Trash2 size={14} />
							</button>
						</>
					)}
				</div>
			</div>

			{existingReview ? (
				<p className="review-form__body">{existingReview.body}</p>
			) : (
				<div className="review-form__create">
					{error && <p className="error">{error}</p>}
					<textarea
						className="review-form__textarea"
						value={createBody}
						onChange={(e) => setCreateBody(e.target.value)}
						maxLength={5000}
						placeholder="What did you think of this game?"
						rows={4}
						disabled={saving}
					/>
					<button
						type="button"
						className="review-form__save"
						onClick={handleCreateSave}
						disabled={saving || !createBody.trim()}
					>
						{saving ? 'Saving...' : 'Post review'}
					</button>
				</div>
			)}

			{editModalOpen && (
				<Modal title="Edit your review" onClose={closeEditModal}>
					{error && <p className="error">{error}</p>}
					<textarea
						className="review-form__textarea"
						value={editBody}
						onChange={(e) => setEditBody(e.target.value)}
						maxLength={5000}
						rows={6}
						autoFocus
						disabled={saving}
					/>
					<div className="review-form__modal-actions">
						<button type="button" onClick={closeEditModal} disabled={saving}>
							Cancel
						</button>
						<button
							type="button"
							className="review-form__save"
							onClick={handleEditSave}
							disabled={saving || !editBody.trim()}
						>
							{saving ? 'Saving...' : 'Save review'}
						</button>
					</div>
				</Modal>
			)}

			{confirmDeleteOpen && (
				<Modal title="Delete review?" onClose={closeConfirmDelete}>
					{error && <p className="error">{error}</p>}
					<p>
						Are you sure you want to delete your review? This can't be undone.
					</p>
					<div className="review-form__modal-actions">
						<button
							type="button"
							onClick={closeConfirmDelete}
							disabled={deleting}
						>
							Cancel
						</button>
						<button
							type="button"
							className="review-form__confirm-delete"
							onClick={handleConfirmDelete}
							disabled={deleting}
						>
							{deleting ? 'Deleting...' : 'Delete'}
						</button>
					</div>
				</Modal>
			)}
		</div>
	)
}
