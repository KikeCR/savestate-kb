import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// jsdom doesn't implement ResizeObserver, which @dnd-kit/core reads
// internally for its droppable/draggable measuring logic (Board, KanbanColumn,
// DraggableGameCard).
class MockResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver =
	MockResizeObserver as unknown as typeof ResizeObserver

// jsdom doesn't implement the Pointer Capture APIs or scrollIntoView that
// @radix-ui/react-select (YearSelect) calls when opening/closing its popover.
Element.prototype.hasPointerCapture = () => false
Element.prototype.setPointerCapture = () => {}
Element.prototype.releasePointerCapture = () => {}
Element.prototype.scrollIntoView = () => {}

afterEach(() => {
	localStorage.clear()
})
