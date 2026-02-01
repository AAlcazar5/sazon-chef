# Debugging App Hang on Android

## Symptoms
- Metro bundler starts successfully
- App opens on Android emulator
- **No logs appear at all** (not even early debug logs)
- App appears to hang/not load

## Possible Causes

### 1. Bundle Not Loading
- Check Metro bundler output for compilation errors
- Look for red error messages in the Metro terminal
- Try: `npx expo start -c` (clear cache)

### 2. React Compiler Issue
- `app.json` has `reactCompiler: true` which might cause issues
- Try disabling it temporarily

### 3. Context Provider Crash
- AuthProvider, ThemeProvider, or ToastProvider might be crashing
- Check for blocking AsyncStorage/SecureStore calls

### 4. Import Error
- Check for circular dependencies
- Check for missing imports

## Debug Steps

1. **Check Metro Bundler Output**
   - Look for red error messages
   - Check if bundle is being served (should see "Bundled" message)

2. **Try Web Version**
   - Run `npx expo start --web`
   - If web works, issue is Android-specific

3. **Check Android Logcat**
   ```bash
   adb logcat | grep -i "react\|expo\|error\|crash"
   ```

4. **Disable React Compiler Temporarily**
   - In `app.json`, set `reactCompiler: false`
   - Restart Metro

5. **Clear All Caches**
   ```bash
   cd frontend
   rm -rf node_modules/.cache
   npx expo start -c
   ```

6. **Check for TypeScript Errors**
   ```bash
   cd frontend
   npx tsc --noEmit
   ```

## Added Debug Logs

The following logs should appear if bundle loads:
- `[Layout] Bundle loaded - _layout.tsx imported` - Very first log
- `[Layout] RootLayout rendering` - RootLayout component
- `[Layout] State:` - Layout state updates
- `[HomeScreen] Component rendering` - Home screen component

If none of these appear, the bundle is not loading or crashing before first render.
