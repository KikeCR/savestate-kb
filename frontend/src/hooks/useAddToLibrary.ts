import { useState } from 'react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import type { Entry, Game } from '../types'

export const useAddToLibrary = (
	game: Game,
	onAdded?: (gameId: number) => void,
	onError?: (message: string) => void,
) => {
	const [adding, setAdding] = useState(false)
	const [added, setAdded] = useState(false)
	const { showToast } = useToast()

	const reportError = (err: unknown) =>
		onError?.(err instanceof Error ? err.message : String(err))

	const handleAdd = () => {
		setAdding(true)
		api
			.post<Entry>('/api/entries', { game_id: game.id, status: 'backlog' })
			.then((entry) => {
				setAdded(true)
				onAdded?.(game.id)
				showToast({
					message: `${game.title} added to your library`,
					iconUrl: game.cover_image_url,
					actionLabel: 'Undo',
					onAction: () => {
						api
							.del(`/api/entries/${entry.id}`)
							.then(() => setAdded(false))
							.catch(reportError)
					},
				})
			})
			.catch(reportError)
			.finally(() => setAdding(false))
	}

	return { adding, added, handleAdd }
}
