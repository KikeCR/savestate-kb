import { ThinkingIndicator } from '../../components/ThinkingIndicator'
import { renderWithProviders } from '../render'

export class ThinkingIndicatorPageObject {
	private container: HTMLElement

	constructor(props: { messages?: string[]; intervalMs?: number } = {}) {
		const { container } = renderWithProviders(
			<ThinkingIndicator {...props} />,
			{
				withAuth: false,
			},
		)
		this.container = container
	}

	get text(): string | null {
		return (
			this.container.querySelector('.thinking-indicator__text')?.textContent ??
			null
		)
	}
}
