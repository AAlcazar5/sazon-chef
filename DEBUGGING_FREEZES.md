# Debugging App Freezes

## Common Causes of Freezes in React Native/Expo Apps

### 1. **Performance Issues (Most Common)**
- **Problem**: Expensive computations running on every render
- **Solution**: Use `useMemo` and `useCallback` to memoize expensive operations
- **Example**: The `getAllItems()` function was being called on every render, now it's memoized

### 2. **Infinite Re-render Loops**
- **Problem**: State updates triggering more state updates in a loop
- **Solution**: 
  - Check `useEffect` dependencies
  - Ensure state updates are conditional
  - Use `useCallback` for functions passed as dependencies

### 3. **Blocking Operations on Main Thread**
- **Problem**: Synchronous operations blocking the UI
- **Solution**: 
  - Use `async/await` for network requests
  - Move heavy computations to background threads
  - Use `InteractionManager` for non-critical operations

### 4. **Modal/Overlay Issues**
- **Problem**: Multiple modals or overlays blocking interactions
- **Solution**: 
  - Ensure only one modal is visible at a time
  - Check `zIndex` values
  - Verify modal `visible` props are correctly managed

### 5. **Memory Leaks**
- **Problem**: Event listeners or subscriptions not cleaned up
- **Solution**: 
  - Clean up in `useEffect` return functions
  - Remove event listeners
  - Cancel pending requests

## Quick Fixes Applied to Shopping List Screen

1. **Memoized `getAllItems()`**: Prevents re-computation on every render
2. **Memoized `currentItems`**: Only recalculates when dependencies change
3. **Memoized `itemsByCategory`**: Prevents expensive reduce operation on every render
4. **useCallback for `findBestStore`**: Prevents function recreation
5. **Added error handling**: Prevents crashes from bad data

## How to Debug Freezes

### 1. **Check React DevTools**
```bash
# Install React DevTools
npm install -g react-devtools

# Run it
react-devtools
```

### 2. **Check Console Logs**
- Look for infinite loops in console
- Check for error messages
- Monitor render counts

### 3. **Use Performance Monitor**
- Enable "Show Perf Monitor" in Expo DevTools
- Check FPS (should be 60fps)
- Monitor memory usage

### 4. **Add Debug Logging**
```javascript
useEffect(() => {
  console.log('Component rendered');
  return () => console.log('Component unmounted');
}, []);
```

### 5. **Check for Blocking Operations**
- Look for `while` loops
- Check for synchronous file operations
- Verify network requests aren't blocking

## Prevention Best Practices

1. **Always memoize expensive computations**
   ```javascript
   const expensiveValue = useMemo(() => {
     return heavyComputation(data);
   }, [data]);
   ```

2. **Use useCallback for functions passed as props**
   ```javascript
   const handleClick = useCallback(() => {
     doSomething();
   }, [dependencies]);
   ```

3. **Debounce user input**
   ```javascript
   const debouncedSearch = useMemo(
     () => debounce(handleSearch, 300),
     []
   );
   ```

4. **Lazy load heavy components**
   ```javascript
   const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
   ```

5. **Virtualize long lists**
   ```javascript
   import { FlatList } from 'react-native';
   // Use FlatList instead of ScrollView for long lists
   ```

## If App is Frozen Right Now

1. **Reload the app**: Shake device → "Reload" or `r` in terminal
2. **Clear cache**: `npx expo start -c`
3. **Restart Metro bundler**: Stop and restart `npm run dev`
4. **Check for infinite loops**: Look at console for repeated logs
5. **Check modals**: Ensure no modal is stuck open

## Simulator vs Real Device

- **Simulator**: Can be slower, may freeze more easily
- **Real Device**: Usually more stable, better performance
- **Solution**: Test on both, but prioritize real device for performance

## Emergency Recovery

If the app is completely frozen:

1. **Kill the process**:
   ```bash
   # Find and kill Node processes
   pkill -f node
   pkill -f expo
   ```

2. **Clear Metro cache**:
   ```bash
   npx expo start -c
   ```

3. **Restart simulator/device**

4. **Check for syntax errors**:
   ```bash
   npm run lint
   ```

