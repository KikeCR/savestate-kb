import type { ReactNode } from 'react'
import './StatTile.css'

interface StatTileProps {
	label: string
	value: string | number
	icon?: ReactNode
}

export const StatTile = ({ label, value, icon }: StatTileProps) => {
	return (
		<div className="stat-tile">
			{icon && <div className="stat-tile__icon">{icon}</div>}
			<div className="stat-tile__value">{value}</div>
			<div className="stat-tile__label">{label}</div>
		</div>
	)
}
