import { Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Select } from '../components/Select'
import { YearSelect } from '../components/YearSelect'
import { useToast } from '../context/ToastContext'
import { useAvailableYears } from '../hooks/useAvailableYears'
import './Library.css'
import {
	ENTRY_STATUSES,
	STATUS_LABELS,
	type Entry,
	type EntryStatus,
	type Game,
} from '../types'

const RATING_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1)

const STATUS_SELECT_OPTIONS = ENTRY_STATUSES.map((status) => ({
	value: status,
	label: STATUS_LABELS[status],
}))

const UNRATED = 'unrated'

const RATING_SELECT_OPTIONS = [
	{ value: UNRATED, label: 'Unrated' },
	...RATING_OPTIONS.map((rating) => ({
		value: String(rating),
		label: `${rating}/10`,
	})),
]

// Matches the .entry-list li exit transition duration in Library.css — the
// row is kept rendered (with a "removing" class) for this long so it can
// visually collapse before the delete request actually fires.
const ENTRY_EXIT_MS = 200

export const Library = () => {
	const [entries, setEntries] = useState<Entry[]>([])
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<Game[]>([])
	const [searching, setSearching] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [yearFilter, setYearFilter] = useState('all')
	const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())
	const { showToast } = useToast()

	const loadEntries = async () => {
		const data = await api.get<{ results: Entry[] }>('/api/entries')
		setEntries(data.results)
	}

	useEffect(() => {
		loadEntries().catch((err) =>
			setError(err instanceof Error ? err.message : String(err)),
		)
	}, [])

	const availableYears = useAvailableYears(entries)

	const visibleEntries =
		yearFilter === 'all'
			? entries
			: entries.filter((entry) => String(entry.year_played) === yearFilter)

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
			const entry = await api.post<Entry>('/api/entries', {
				game_id: game.id,
				status: 'backlog',
			})
			setResults([])
			setQuery('')
			await loadEntries()
			showToast({
				message: `${game.title} added to your library`,
				iconUrl: game.cover_image_url,
				actionLabel: 'Undo',
				onAction: () => {
					api
						.del(`/api/entries/${entry.id}`)
						.then(loadEntries)
						.catch((err) =>
							setError(err instanceof Error ? err.message : String(err)),
						)
				},
			})
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		}
	}

	const handleStatusChange = async (entry: Entry, status: EntryStatus) => {
		await api.patch(`/api/entries/${entry.id}`, { status })
		await loadEntries()
	}

	const handleRatingChange = async (entry: Entry, value: string) => {
		const rating = value === '' ? null : Number(value)
		await api.patch(`/api/entries/${entry.id}`, { rating })
		await loadEntries()
	}

	const handleYearPlayedChange = async (entry: Entry, value: string) => {
		const yearPlayed = value === '' ? null : Number(value)
		if (yearPlayed === entry.year_played) return
		await api.patch(`/api/entries/${entry.id}`, { year_played: yearPlayed })
		await loadEntries()
	}

	const restoreEntry = (entry: Entry) => {
		api
			.post('/api/entries', {
				game_id: entry.game.id,
				status: entry.status,
				rating: entry.rating,
				start_date: entry.start_date,
				completion_date: entry.completion_date,
				year_played: entry.year_played,
				hours_played: entry.hours_played,
				notes: entry.notes,
				favorite: entry.favorite,
				replay_count: entry.replay_count,
				platform_played: entry.platform_played,
				tags: entry.tags,
			})
			.then(loadEntries)
			.catch(() =>
				showToast({
					message: `Could not undo — ${entry.game.title} is already in your library`,
					variant: 'error',
				}),
			)
	}

	const handleDelete = (entry: Entry) => {
		setRemovingIds((current) => new Set(current).add(entry.id))
		setTimeout(async () => {
			try {
				await api.del(`/api/entries/${entry.id}`)
				await loadEntries()
				showToast({
					message: `${entry.game.title} removed from your library`,
					iconUrl: entry.game.cover_image_url,
					actionLabel: 'Undo',
					onAction: () => restoreEntry(entry),
				})
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err))
			} finally {
				setRemovingIds((current) => {
					const next = new Set(current)
					next.delete(entry.id)
					return next
				})
			}
		}, ENTRY_EXIT_MS)
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
					<Search size={14} /> {searching ? 'Searching...' : 'Search'}
				</button>
			</form>

			{error && <p className="error">{error}</p>}

			{results.length > 0 && (
				<ul className="search-results">
					{results.map((game) => (
						<li key={game.id}>
							<div className="search-results__info">
								{game.cover_image_url && (
									<img src={game.cover_image_url} alt={game.title} width={40} />
								)}
								<span>{game.title}</span>
							</div>
							<button onClick={() => handleAdd(game)}>
								<Plus size={14} /> Add to library
							</button>
						</li>
					))}
				</ul>
			)}

			<div className="page-header-row">
				<h2>Tracked games ({visibleEntries.length})</h2>
				{availableYears.length > 0 && (
					<label className="year-filter">
						Year played
						<YearSelect
							value={yearFilter}
							onValueChange={setYearFilter}
							options={availableYears.map((year) => ({
								value: String(year),
								label: String(year),
							}))}
							includeAllOption
							ariaLabel="Year played filter"
						/>
					</label>
				)}
			</div>

			{visibleEntries.length === 0 ? (
				<p>Nothing tracked yet — search for a game above to get started.</p>
			) : (
				<ul className="entry-list">
					{visibleEntries.map((entry) => (
						<li
							key={entry.id}
							className={removingIds.has(entry.id) ? 'removing' : undefined}
						>
							<Link to={`/games/${entry.game.id}`} className="entry-list__info">
								{entry.game.cover_image_url && (
									<img
										src={entry.game.cover_image_url}
										alt={entry.game.title}
										width={40}
									/>
								)}
								<span>{entry.game.title}</span>
							</Link>
							<div className="entry-list__controls">
								<Select
									value={entry.status}
									onValueChange={(value) =>
										handleStatusChange(entry, value as EntryStatus)
									}
									options={STATUS_SELECT_OPTIONS}
									ariaLabel="Status"
									triggerClassName="entry-list__status-select"
								/>
								<Select
									value={entry.rating != null ? String(entry.rating) : UNRATED}
									onValueChange={(value) =>
										handleRatingChange(entry, value === UNRATED ? '' : value)
									}
									options={RATING_SELECT_OPTIONS}
									ariaLabel="Rating"
									triggerClassName="entry-list__rating-select"
								/>
								<input
									type="number"
									className="entry-list__year-input"
									placeholder="Year played"
									aria-label="Year played"
									min={1970}
									max={new Date().getFullYear() + 1}
									defaultValue={entry.year_played ?? ''}
									onBlur={(e) => handleYearPlayedChange(entry, e.target.value)}
								/>
								<button
									type="button"
									className="entry-list__remove"
									onClick={() => handleDelete(entry)}
									aria-label={`Remove ${entry.game.title} from library`}
								>
									<Trash2 size={14} />
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
