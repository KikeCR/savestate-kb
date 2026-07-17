import { useDroppable } from '@dnd-kit/core'
import { STATUS_LABELS, type Entry, type EntryStatus } from '../../types'
import { DraggableGameCard } from './DraggableGameCard'

interface KanbanColumnProps {
	status: EntryStatus
	entries: Entry[]
}

export const KanbanColumn = ({ status, entries }: KanbanColumnProps) => {
	const { setNodeRef, isOver } = useDroppable({ id: status })

	return (
		<div
			ref={setNodeRef}
			className={`kanban-column kanban-column--${status}${isOver ? ' kanban-column--over' : ''}`}
		>
			<div className="kanban-column__header">
				<h2>{STATUS_LABELS[status]}</h2>
				<span className="kanban-column__count">{entries.length}</span>
			</div>
			<div className="kanban-column__cards">
				{entries.map((entry) => (
					<DraggableGameCard key={entry.id} entry={entry} />
				))}
			</div>
		</div>
	)
}
