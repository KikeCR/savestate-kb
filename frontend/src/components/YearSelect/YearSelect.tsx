import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import './YearSelect.css'

interface YearSelectOption {
	value: string
	label: string
}

interface YearSelectProps {
	value: string
	onValueChange: (value: string) => void
	options: YearSelectOption[]
	includeAllOption?: boolean
	ariaLabel?: string
}

export const YearSelect = ({
	value,
	onValueChange,
	options,
	includeAllOption = false,
	ariaLabel = 'Year',
}: YearSelectProps) => {
	return (
		<Select.Root value={value} onValueChange={onValueChange}>
			<Select.Trigger className="year-select__trigger" aria-label={ariaLabel}>
				<Select.Value />
				<Select.Icon className="year-select__icon">
					<ChevronDown size={14} />
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content
					className="year-select__content"
					position="popper"
					sideOffset={4}
				>
					<Select.Viewport className="year-select__viewport">
						{includeAllOption && (
							<Select.Item value="all" className="year-select__item">
								<Select.ItemText>All years</Select.ItemText>
								<Select.ItemIndicator className="year-select__item-indicator">
									<Check size={14} />
								</Select.ItemIndicator>
							</Select.Item>
						)}
						{options.map((option) => (
							<Select.Item
								key={option.value}
								value={option.value}
								className="year-select__item"
							>
								<Select.ItemText>{option.label}</Select.ItemText>
								<Select.ItemIndicator className="year-select__item-indicator">
									<Check size={14} />
								</Select.ItemIndicator>
							</Select.Item>
						))}
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	)
}
