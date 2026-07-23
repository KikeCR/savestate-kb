import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import './Select.css'

export interface SelectOption {
	value: string
	label: string
}

interface SelectProps {
	value: string
	onValueChange: (value: string) => void
	options: SelectOption[]
	ariaLabel: string
	triggerClassName?: string
}

export const Select = ({
	value,
	onValueChange,
	options,
	ariaLabel,
	triggerClassName,
}: SelectProps) => {
	return (
		<RadixSelect.Root value={value} onValueChange={onValueChange}>
			<RadixSelect.Trigger
				className={`select__trigger${triggerClassName ? ` ${triggerClassName}` : ''}`}
				aria-label={ariaLabel}
			>
				<RadixSelect.Value />
				<RadixSelect.Icon className="select__icon">
					<ChevronDown size={14} />
				</RadixSelect.Icon>
			</RadixSelect.Trigger>
			<RadixSelect.Portal>
				<RadixSelect.Content
					className="select__content"
					position="popper"
					sideOffset={4}
				>
					<RadixSelect.Viewport className="select__viewport">
						{options.map((option) => (
							<RadixSelect.Item
								key={option.value}
								value={option.value}
								className="select__item"
							>
								<RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
								<RadixSelect.ItemIndicator className="select__item-indicator">
									<Check size={14} />
								</RadixSelect.ItemIndicator>
							</RadixSelect.Item>
						))}
					</RadixSelect.Viewport>
				</RadixSelect.Content>
			</RadixSelect.Portal>
		</RadixSelect.Root>
	)
}
