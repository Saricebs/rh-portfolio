# Audit rh-portfolio — 22 Jul 2026 (FIXED)

## What changed

| Item | Status | Detail |
|------|--------|--------|
| **H1** | ✅ | USDC `0x0CE454B6AD88459eD715c3F916c08Af08a466C6D`; USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (decimals 6 both); CoinGecko IDs `usd-coin` + `global-dollar` |
| **H2** | ✅ | ErrorBoundary component wraps `<body>` in layout |
| **M1** | ✅ | Token list single source in `src/config.ts`; chain.ts imports from/config |
| **M2** | ✅ | Deleted: `providers.tsx`, `lib/balances.ts`, `hooks/useBalances.ts` |
| **M3** | ✅ | CoinGecko cache: 60s TTL in memory |
| **M4** | ✅ | Stack: pure ethers.js v6. Removed wagmi/viem from config.ts. Deleted provider file that used RainbowKit |
| **M5** | ✅ | getProvider() fallback RPC chain with health check |
| L1 | — | strict:false kept — too risky to enable mid-project |
| L2 | ⚠️ | ignoreBuildErrors + ignoreDuringBuilds kept; eslint in next.config fixed |
| L3 | ✅ | README replaced with project info |
| L4 | — | legacy-peer-deps kept — no reason to touch |
