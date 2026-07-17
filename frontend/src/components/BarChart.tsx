interface BarChartDatum {
	label: string
	value: number
}

interface BarChartProps {
	data: BarChartDatum[]
	emptyMessage?: string
}

export const BarChart = ({
	data,
	emptyMessage = 'No data yet.',
}: BarChartProps) => {
	if (data.length === 0) {
		return <p className="bar-chart__empty">{emptyMessage}</p>
	}

	const max = Math.max(...data.map((d) => d.value), 1)

	return (
		<div className="bar-chart">
			{data.map((d) => (
				<div
					className="bar-chart__row"
					key={d.label}
					title={`${d.label}: ${d.value}`}
				>
					<span className="bar-chart__label">{d.label}</span>
					<div className="bar-chart__track">
						<div
							className="bar-chart__bar"
							style={{ width: `${(d.value / max) * 100}%` }}
						/>
					</div>
					<span className="bar-chart__value">{d.value}</span>
				</div>
			))}
		</div>
	)
}
