import type { ReactNode } from 'react'
import { StatTile } from '../../components/StatTile'
import { renderWithProviders } from '../render'

interface StatTileProps {
	label: string
	value: string | number
	icon?: ReactNode
}

export class StatTilePageObject {
	private container: HTMLElement

	constructor(props: StatTileProps) {
		const { container } = renderWithProviders(<StatTile {...props} />, {
			withAuth: false,
		})
		this.container = container
	}

	get label(): string | null {
		return (
			this.container.querySelector('.stat-tile__label')?.textContent ?? null
		)
	}

	get value(): string | null {
		return (
			this.container.querySelector('.stat-tile__value')?.textContent ?? null
		)
	}

	get hasIcon(): boolean {
		return this.container.querySelector('.stat-tile__icon') !== null
	}
}
