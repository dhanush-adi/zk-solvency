# Troubleshooting Guide

## Common Issues and Solutions

### 1. SSE Connection Errors
**Problem**: "SSE Connection error" messages appearing

**Solution**: This is normal if you don't have a backend API running. The app will automatically fall back to mock data.
- The app works perfectly fine without a backend
- To use a real backend, set `NEXT_PUBLIC_API_URL` in your `.env.local` file
- Example: `NEXT_PUBLIC_API_URL=http://localhost:3001`

### 2. Hydration Mismatches
**Problem**: "Warning: Expected server HTML to contain a matching..." messages

**Solution**: These have been fixed with proper error boundaries and SSR-safe components.
- If you still see these, clear your `.next` folder and rebuild: `rm -rf .next && npm run build`

### 3. Duplicate Key Errors (React)
**Problem**: "Encountered two children with the same key" warnings

**Solution**: This has been fixed in the MerklePathVisualizer and other components.
- Updated all React.map() keys to be unique combinations of index and data

### 4. Wallet Connection Issues
**Problem**: Wallet won't connect or shows errors

**Solution**: 
- The app uses demo mode if MetaMask is not installed
- For MetaMask: Install the extension and refresh the page
- Errors are gracefully handled - app continues to work in demo mode

### 5. Charts Not Rendering
**Problem**: Recharts visualizations appear blank

**Solution**:
- This is often a CSS/color variable issue
- The design tokens are properly configured in globals.css
- If charts still don't render, check that `--chart-1` through `--chart-5` are defined in your CSS

### 6. Slow Performance
**Problem**: Pages load slowly or have lag

**Solution**:
- Clear browser cache: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
- Rebuild the project: `npm run build`
- Check network tab in DevTools for slow API calls
- The mock data loads instantly if API is not configured

### 7. Missing Components
**Problem**: "Cannot find module" errors for components

**Solution**:
- Run `npm install` to ensure all dependencies are installed
- Check that TypeScript compilation passes: `npm run type-check`

### 8. Environment Variables Not Working
**Problem**: API endpoint not connecting

**Solution**:
1. Create a `.env.local` file in the project root:
   ```
   NEXT_PUBLIC_API_URL=http://your-api-endpoint.com
   ```
2. Restart the dev server after adding env vars
3. Note: Only `NEXT_PUBLIC_*` variables are available in the browser

## Development Tips

### Running the Project
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:3000
```

### Building for Production
```bash
# Build the project
npm run build

# Start production server
npm start
```

### Type Checking
```bash
# Check TypeScript errors
npm run type-check
```

### Code Quality
- ESLint is configured for code style checks
- All components are TypeScript-safe
- Mock data is used automatically when API is unavailable

## Mock Data Behavior

The app ships with a comprehensive mock data system that:
- Generates realistic proof-of-reserves data
- Provides merkle tree paths and inclusion proofs
- Creates 7-30 days of historical solvency data
- Works completely offline - no API required

This means you can:
- Develop and test the entire UI without a backend
- Demonstrate the app to stakeholders
- Use it as a reference implementation

## Performance Optimizations

- **React Query**: Caches data with configurable stale time
- **Code Splitting**: Pages load only what they need
- **Image Optimization**: Next.js automatically optimizes images
- **Animations**: Framer Motion provides smooth, performant animations
- **CSS Variables**: Efficient color theming with CSS custom properties

## Debugging

Enable detailed logging by adding `[v0]` prefix:
```javascript
console.log('[v0] Your debug message:', data);
```

Check browser DevTools:
- **Console**: Application logs and errors
- **Network**: API calls and SSE connections
- **Application**: Local storage and cache data
- **Sources**: Debug JavaScript execution

## Still Having Issues?

1. Check the browser console for error messages
2. Verify all dependencies are installed: `npm install`
3. Clear cache and rebuild: `rm -rf .next && npm run build`
4. Check that you're using Node.js 18+: `node --version`
5. Review the README.md for setup instructions

## Getting Help

- Check IMPLEMENTATION.md for API specification details
- Review individual component files for prop documentation
- Type definitions are in lib/types.ts
- Mock data generation is in lib/mockData.ts
