import { DndContext } from '@dnd-kit/core'
import { KanbanColumn } from '../../components/kanban/KanbanColumn'
import { renderWithProviders } from '../render'
import type { Entry, EntryStatus } from '../../types'

export class KanbanColumnPageObject {
	private container: HTMLElement

	constructor(props: { status: EntryStatus; entries: Entry[] }) {
		const { container } = renderWithProviders(
			<DndContext onDragEnd={() => {}}>
				<KanbanColumn {...props} />
			</DndContext>,
			{ withAuth: false },
		)
		this.container = container
	}

	get heading(): string | null {
		return this.container.querySelector('h2')?.textContent ?? null
	}

	get count(): string | null {
		return (
			this.container.querySelector('.kanban-column__count')?.textContent ?? null
		)
	}

	get cards(): NodeListOf<Element> {
		return this.container.querySelectorAll('.kanban-card-wrapper')
	}
}
