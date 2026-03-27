# Documentation Index

Welcome to ZK-Solvency Frontend! Here's a quick guide to finding what you need.

## 📚 Documentation Files

### Getting Started
- **[QUICKSTART.md](./QUICKSTART.md)** - Start here! 5-minute setup guide
- **[README.md](./README.md)** - Full project overview and features

### Development & Implementation
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - API specifications and backend integration
- **[IMPROVEMENTS.md](./IMPROVEMENTS.md)** - Technical improvements and fixes

### Troubleshooting & Help
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions

---

## 🚀 Quick Navigation by Task

### "I just cloned this repo"
1. Read [QUICKSTART.md](./QUICKSTART.md)
2. Run `npm install && npm run dev`
3. Visit `http://localhost:3000`

### "I want to understand the project"
1. Read [README.md](./README.md) for overview
2. Check [IMPLEMENTATION.md](./IMPLEMENTATION.md) for architecture
3. Browse [src/](./src/) directory

### "I'm building the backend"
1. Review [IMPLEMENTATION.md](./IMPLEMENTATION.md) - API endpoints section
2. Check expected request/response formats
3. Set `NEXT_PUBLIC_API_URL` when ready to test

### "Something is broken"
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Search for your error message
3. Follow the recommended solution
4. If not listed, check browser console and search by error text

### "I want to customize the design"
1. Edit [app/globals.css](./app/globals.css) for colors/fonts
2. Update [components/Navbar.tsx](./components/Navbar.tsx) for navigation
3. Modify [components/Footer.tsx](./components/Footer.tsx) for footer
4. Search for "TODO" comments in components

### "I want to add a new page"
1. Create `app/new-page/page.tsx`
2. Add metadata and export default component
3. Update navigation in [components/Navbar.tsx](./components/Navbar.tsx)
4. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for patterns

### "I want to deploy to production"
1. Read deployment section in [QUICKSTART.md](./QUICKSTART.md)
2. Set environment variables in Vercel
3. Push to GitHub
4. Deploy with Vercel one-click deploy

---

## 📁 Project Structure

```
zk-solvency/
├── DOCS_INDEX.md              👈 You are here
├── QUICKSTART.md              📖 Start with this
├── README.md                  📖 Project overview
├── IMPLEMENTATION.md          📖 Backend API specs
├── IMPROVEMENTS.md            📖 Technical details
├── TROUBLESHOOTING.md         📖 Common issues
│
├── app/                       Next.js pages
│   ├── page.tsx              Dashboard page
│   ├── inclusion-checker/
│   ├── proof-details/
│   ├── auditor/
│   ├── layout.tsx            Root layout (providers)
│   └── globals.css           Design tokens & styles
│
├── components/
│   ├── AppLayout.tsx         Main layout wrapper
│   ├── Navbar.tsx            Navigation
│   ├── Footer.tsx            Footer
│   ├── ErrorBoundary.tsx     Error handling
│   ├── LoadingSkeleton.tsx    Loading states
│   │
│   ├── dashboard/
│   │   └── DashboardClient.tsx
│   ├── inclusion/
│   │   └── InclusionCheckerClient.tsx
│   ├── proof/
│   │   └── ProofDetailsClient.tsx
│   ├── auditor/
│   │   └── AuditorDashboardClient.tsx
│   │
│   ├── providers/
│   │   ├── QueryProvider.tsx  React Query setup
│   │   └── SSEProvider.tsx    Real-time updates
│   │
│   └── [individual components]
│
├── hooks/
│   ├── useLiveProof.ts       Current proof data
│   ├── useInclusionProof.ts  Wallet inclusion
│   ├── useSolvencyHistory.ts Historical data
│   └── use-mobile.ts         Mobile detection
│
├── lib/
│   ├── types.ts              TypeScript interfaces
│   ├── mockData.ts           Mock data generation
│   ├── env.ts                Environment variables
│   └── utils.ts              Helper functions
│
├── store/
│   └── solvencyStore.ts      Zustand store
│
└── public/                   Static assets

```

---

## 🎯 Common Questions

### Q: Does the app need a backend to run?
**A:** No! It works perfectly with mock data. See "I just cloned this repo" above.

### Q: How do I connect my API?
**A:** Set `NEXT_PUBLIC_API_URL` in `.env.local`, then see [IMPLEMENTATION.md](./IMPLEMENTATION.md)

### Q: I see SSE errors in the console
**A:** This is normal if you don't have a backend. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### Q: Where are the colors/fonts configured?
**A:** In [app/globals.css](./app/globals.css) - search for `--primary`, `--accent`, etc.

### Q: How do I add wallet integration?
**A:** MetaMask is already integrated. See [components/WalletConnect.tsx](./components/WalletConnect.tsx)

### Q: Can I deploy this to production?
**A:** Yes! See deployment checklist in [QUICKSTART.md](./QUICKSTART.md)

### Q: What's the best way to debug issues?
**A:** Open browser DevTools (F12) → Console → look for `[v0]` prefixed messages

### Q: How do I make it faster?
**A:** See performance tips in [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 📊 Key Technologies

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 + CSS Variables
- **State**: Zustand + React Query
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Data**: Mock data generation (no database required)
- **Charts**: Recharts
- **Wallet**: Ethereum/MetaMask integration (optional)

---

## 🔗 Important Files to Know

| File | Purpose | When to Edit |
|------|---------|--------------|
| `app/globals.css` | Colors, fonts, animations | Customizing design |
| `components/Navbar.tsx` | Navigation menu | Adding routes |
| `lib/mockData.ts` | Generated test data | Changing demo data |
| `lib/types.ts` | TypeScript definitions | Adding new data types |
| `store/solvencyStore.ts` | Global state | Managing app data |
| `.env.example` | Environment template | Setting API URL |

---

## ✅ Development Checklist

- [ ] Cloned the repository
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Opened `http://localhost:3000`
- [ ] Explored all pages (Dashboard, Inclusion Checker, etc.)
- [ ] Read [QUICKSTART.md](./QUICKSTART.md)
- [ ] Checked [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) if any issues
- [ ] Ready to develop!

---

## 🆘 Getting Help

1. **Check the docs** - You might find your answer here
2. **Search error messages** - Most issues are covered in TROUBLESHOOTING.md
3. **Check browser console** - F12 → Console tab
4. **Review the code** - Comments and types are helpful
5. **Check TypeScript errors** - `npm run type-check`

---

## 📝 Contributing Notes

- Use `console.log("[v0] message")` for debugging
- Follow TypeScript strict mode
- Add types for new components
- Update documentation if you change APIs
- Test on mobile (responsive design)
- Keep components focused and reusable

---

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📞 Support Summary

| Issue | Solution |
|-------|----------|
| Build fails | Run `npm install` |
| Webpack error | Delete `.next` folder, rebuild |
| Types error | Run `npm run type-check` |
| Port 3000 in use | Run on different port: `npm run dev -- -p 3001` |
| Environment vars not working | Restart dev server after `.env.local` change |
| Slow performance | Clear cache: Ctrl+Shift+Del |
| Console errors | Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |

---

**Last Updated**: 2026-03-27
**Framework**: Next.js 16
**Status**: Production Ready ✅

Start with [QUICKSTART.md](./QUICKSTART.md) and you'll be up and running in 5 minutes!
