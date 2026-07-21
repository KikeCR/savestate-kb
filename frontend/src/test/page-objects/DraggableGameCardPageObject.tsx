import { DndContext } from '@dnd-kit/core'
import { DraggableGameCard } from '../../components/kanban/DraggableGameCard'
import { renderWithProviders } from '../render'
import type { Entry } from '../../types'

export class DraggableGameCardPageObject {
	private container: HTMLElement

	constructor(entry: Entry) {
		const { container } = renderWithProviders(
			<DndContext onDragEnd={() => {}}>
				<DraggableGameCard entry={entry} />
			</DndContext>,
			{ withAuth: false },
		)
		this.container = container
	}

	get wrapper(): HTMLElement | null {
		return this.container.querySelector('.kanban-card-wrapper')
	}

	get isDragging(): boolean {
		return (
			this.wrapper?.classList.contains('kanban-card-wrapper--dragging') ?? false
		)
	}

	get title(): string | null {
		return (
			this.container.querySelector('.game-card__title')?.textContent ?? null
		)
	}
}
