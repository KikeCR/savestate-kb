import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from '../../components/Select'
import { renderWithProviders } from '../render'

interface SelectProps {
	value: string
	onValueChange: (value: string) => void
	options: { value: string; label: string }[]
	ariaLabel: string
}

export class SelectPageObject {
	private user = userEvent.setup({ pointerEventsCheck: 0 })

	constructor(props: SelectProps) {
		renderWithProviders(<Select {...props} />, { withAuth: false })
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
}
