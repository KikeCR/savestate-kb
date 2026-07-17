import { useEffect, useMemo, useState } from 'react'
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from '@dnd-kit/core'
import { api } from '../api/client'
import { GameCard } from '../components/GameCard'
import { KanbanColumn } from '../components/kanban/KanbanColumn'
import { ENTRY_STATUSES, type Entry, type EntryStatus } from '../types'

export const Board = () => {
	const [entries, setEntries] = useState<Entry[]>([])
	const [error, setError] = useState<string | null>(null)
	const [activeEntry, setActiveEntry] = useState<Entry | null>(null)
	const [yearFilter, setYearFilter] = useState('all')
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
	)

	const loadEntries = async () => {
		const data = await api.get<{ results: Entry[] }>('/api/entries')
		setEntries(data.results)
	}

	useEffect(() => {
		loadEntries().catch((err) =>
			setError(err instanceof Error ? err.message : String(err)),
		)
	}, [])

	const availableYears = useMemo(
		() =>
			Array.from(
				new Set(
					entries
						.map((entry) => entry.year_played)
						.filter((year): year is number => year != null),
				),
			).sort((a, b) => b - a),
		[entries],
	)

	// Backlog games haven't been played yet, so a "year played" filter never
	// hides them — it only narrows the columns that represent actual play.
	const columnEntries = (status: EntryStatus) => {
		const statusEntries = entries.filter((e) => e.status === status)
		if (status === 'backlog' || yearFilter === 'all') return statusEntries
		return statusEntries.filter((e) => String(e.year_played) === yearFilter)
	}

	const handleDragStart = (event: DragStartEvent) => {
		const entry = entries.find((e) => e.id === event.active.id)
		setActiveEntry(entry ?? null)
	}

	const handleDragEnd = async (event: DragEndEvent) => {
		setActiveEntry(null)
		const { active, over } = event
		if (!over) return

		const entryId = active.id as number
		const newStatus = over.id as EntryStatus
		const entry = entries.find((e) => e.id === entryId)
		if (!entry || entry.status === newStatus) return

		const previous = entries
		setEntries((prev) =>
			prev.map((e) => (e.id === entryId ? { ...e, status: newStatus } : e)),
		)

		try {
			await api.patch(`/api/entries/${entryId}`, { status: newStatus })
		} catch (err) {
			setEntries(previous)
			setError(err instanceof Error ? err.message : String(err))
		}
	}

	return (
		<div>
			<div className="page-header-row">
				<h1>Board</h1>
				{availableYears.length > 0 && (
					<label className="year-filter">
						Year played
						<select
							value={yearFilter}
							onChange={(e) => setYearFilter(e.target.value)}
						>
							<option value="all">All years</option>
							{availableYears.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					</label>
				)}
			</div>
			{error && <p className="error">{error}</p>}
			<DndContext
				sensors={sensors}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div className="kanban-board">
					{ENTRY_STATUSES.map((status) => (
						<KanbanColumn
							key={status}
							status={status}
							entries={columnEntries(status)}
						/>
					))}
				</div>
				<DragOverlay>
					{activeEntry && <GameCard entry={activeEntry} dragging />}
				</DragOverlay>
			</DndContext>
		</div>
	)
}
