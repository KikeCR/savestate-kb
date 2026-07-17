import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Entry } from '../../../types'
import { GameCard } from '../../GameCard'
import './DraggableGameCard.css'

export const DraggableGameCard = ({ entry }: { entry: Entry }) => {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: entry.id,
		})

	const style = {
		transform: CSS.Translate.toString(transform),
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...listeners}
			{...attributes}
			className={`kanban-card-wrapper${isDragging ? ' kanban-card-wrapper--dragging' : ''}`}
		>
			<GameCard entry={entry} />
		</div>
	)
}
