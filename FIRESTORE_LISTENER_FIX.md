# Firestore Listener Error Fix

## Problem
The application was experiencing Firestore internal assertion failures:
```
FIRESTORE (12.6.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9)
FIRESTORE (12.6.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)
```

## Root Cause
The errors were caused by **multiple simultaneous Firestore listeners** being created due to:

1. **Race conditions in cleanup logic**: The hooks stored the unsubscribe function in state (`currentUnsubscribe`), which caused timing issues where new listeners were created before old ones were properly cleaned up.

2. **Dependency array issues**: The `loadAuctions`/`loadProducts` callbacks were recreating on every render due to their dependencies, causing the `useEffect` to re-run and create new listeners.

3. **React Strict Mode**: In development, React Strict Mode intentionally double-invokes effects, which combined with the cleanup issues, resulted in 7+ simultaneous listeners for the same query.

## Solution
Fixed all three hooks (`useAuctions`, `useProducts`, `useBids`) by:

### 1. Using `useRef` instead of `useState` for unsubscribe function
```typescript
// Before (problematic)
const [currentUnsubscribe, setCurrentUnsubscribe] = useState<(() => void) | null>(null);

// After (fixed)
const unsubscribeRef = useRef<(() => void) | null>(null);
```

### 2. Simplified the effect structure
- Removed the nested `loadAuctions`/`loadProducts` callback
- Moved all logic directly into the `useEffect`
- Proper cleanup in the effect's return function

### 3. Fixed dependency arrays
```typescript
// Use JSON.stringify for array dependencies to prevent unnecessary re-renders
useEffect(() => {
  // ... setup listener
  return () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  };
}, [status, pageSize, JSON.stringify(fields)]);
```

### 4. Improved `loadMore` function
- Made it self-contained without relying on a callback
- Properly handles pagination without creating persistent listeners

## Files Modified
- [`web/app/hooks/useAuctions.ts`](web/app/hooks/useAuctions.ts)
- [`web/app/hooks/useProducts.ts`](web/app/hooks/useProducts.ts)
- [`web/app/hooks/useBids.ts`](web/app/hooks/useBids.ts)

## Result
- ✅ Only one listener per hook instance
- ✅ Proper cleanup on unmount or dependency changes
- ✅ No more Firestore internal assertion errors
- ✅ Better performance with fewer active connections

## Note
The cached versions (`useCachedAuctions`, `useCachedProducts`) were not affected as they use `getDocs` (one-time fetch) instead of `onSnapshot` (real-time listeners).