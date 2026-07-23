import { Select } from '../Select'
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
	const allOptions = includeAllOption
		? [{ value: 'all', label: 'All years' }, ...options]
		: options

	return (
		<Select
			value={value}
			onValueChange={onValueChange}
			options={allOptions}
			ariaLabel={ariaLabel}
			triggerClassName="year-select__trigger"
		/>
	)
}
