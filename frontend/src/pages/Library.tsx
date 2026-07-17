import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import {
	ENTRY_STATUSES,
	type Entry,
	type EntryStatus,
	type Game,
} from '../types'

export const Library = () => {
	const [entries, setEntries] = useState<Entry[]>([])
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<Game[]>([])
	const [searching, setSearching] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const loadEntries = async () => {
		const data = await api.get<{ results: Entry[] }>('/api/entries')
		setEntries(data.results)
	}

	useEffect(() => {
		loadEntries().catch((err) =>
			setError(err instanceof Error ? err.message : String(err)),
		)
	}, [])

	const handleSearch = async (e: FormEvent) => {
		e.preventDefault()
		if (!query.trim()) return
		setSearching(true)
		setError(null)
		try {
			const data = await api.get<{ results: Game[] }>(
				`/api/games/search?q=${encodeURIComponent(query)}`,
			)
			setResults(data.results)
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSearching(false)
		}
	}

	const handleAdd = async (game: Game) => {
		setError(null)
		try {
			await api.post('/api/entries', { game_id: game.id, status: 'backlog' })
			setResults([])
			setQuery('')
			await loadEntries()
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		}
	}

	const handleStatusChange = async (entry: Entry, status: EntryStatus) => {
		await api.patch(`/api/entries/${entry.id}`, { status })
		await loadEntries()
	}

	const handleDelete = async (entry: Entry) => {
		await api.del(`/api/entries/${entry.id}`)
		await loadEntries()
	}

	return (
		<div>
			<h1>My Library</h1>

			<form onSubmit={handleSearch} className="search-form">
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search for a game..."
				/>
				<button type="submit" disabled={searching}>
					{searching ? 'Searching...' : 'Search'}
				</button>
			</form>

			{error && <p className="error">{error}</p>}

			{results.length > 0 && (
				<ul className="search-results">
					{results.map((game) => (
						<li key={game.id}>
							{game.cover_image_url && (
								<img src={game.cover_image_url} alt={game.title} width={40} />
							)}
							<span>{game.title}</span>
							<button onClick={() => handleAdd(game)}>Add to library</button>
						</li>
					))}
				</ul>
			)}

			<h2>Tracked games ({entries.length})</h2>
			{entries.length === 0 ? (
				<p>Nothing tracked yet — search for a game above to get started.</p>
			) : (
				<ul className="entry-list">
					{entries.map((entry) => (
						<li key={entry.id}>
							{entry.game.cover_image_url && (
								<img
									src={entry.game.cover_image_url}
									alt={entry.game.title}
									width={40}
								/>
							)}
							<span>{entry.game.title}</span>
							<select
								value={entry.status}
								onChange={(e) =>
									handleStatusChange(entry, e.target.value as EntryStatus)
								}
							>
								{ENTRY_STATUSES.map((status) => (
									<option key={status} value={status}>
										{status}
									</option>
								))}
							</select>
							<span>{entry.rating ? `${entry.rating}/10` : 'unrated'}</span>
							<button onClick={() => handleDelete(entry)}>Remove</button>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
