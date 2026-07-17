import { STATUS_LABELS, type EntryStatus } from '../../types'
import './StatusBadge.css'

export const StatusBadge = ({ status }: { status: EntryStatus }) => {
	return (
		<span className={`status-badge status-badge--${status}`}>
			{STATUS_LABELS[status]}
		</span>
	)
}
