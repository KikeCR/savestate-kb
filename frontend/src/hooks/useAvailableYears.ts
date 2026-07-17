import { useMemo } from 'react'
import type { Entry } from '../types'

export const useAvailableYears = (entries: Entry[]): number[] =>
	useMemo(
		() =>
			Array.from(
				new Set(
					entries
						.map((entry) => entry.year_played)
						.filter((year): year is number => year != null),
				),
			).sort((a, b) => b - a),
		[entries],
	)
