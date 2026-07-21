import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YearSelect } from '../../components/YearSelect'
import { renderWithProviders } from '../render'

interface YearSelectProps {
	value: string
	onValueChange: (value: string) => void
	options: { value: string; label: string }[]
	includeAllOption?: boolean
	ariaLabel?: string
}

export class YearSelectPageObject {
	// Radix sets `pointer-events: none` on <body> while the popover is open;
	// userEvent's default pointer-events check would otherwise block clicks
	// inside the (portal-rendered) content.
	private user = userEvent.setup({ pointerEventsCheck: 0 })

	constructor(props: YearSelectProps) {
		renderWithProviders(<YearSelect {...props} />, { withAuth: false })
	}

	get trigger() {
		return screen.getByRole('combobox')
	}

	get selectedLabel() {
		return this.trigger.textContent
	}

	async open() {
		await this.user.click(this.trigger)
	}

	async selectOption(label: string) {
		await this.open()
		await this.user.click(await screen.findByRole('option', { name: label }))
	}

	async hasOption(label: string) {
		await this.open()
		return screen.queryByRole('option', { name: label }) !== null
	}
}
