# Hydration Mismatch Fix

## Issue
The application was experiencing hydration mismatch errors caused by browser extensions (specifically Dark Reader) injecting attributes like `data-darkreader-inline-stroke` and `data-darkreader-inline-fill` into SVG elements.

## Solution
We added the `suppressHydrationWarning` prop to the affected SVG elements (`path`, `rect`) in `src/components/ui/icon/custom-icons.tsx`. This tells React to ignore attribute mismatches on these specific elements during hydration.

## Affected Components
- `AgnoIcon`: Added `suppressHydrationWarning` to the main `path` and the `rect` inside `clipPath`.
- `SheetIcon`: Added `suppressHydrationWarning` to the `path`.

## Future Considerations
If other icons start showing similar hydration errors, apply `suppressHydrationWarning` to their inner SVG elements (paths, rects, etc.) as well.
