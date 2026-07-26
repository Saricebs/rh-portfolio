# RH Portfolio

A portfolio tracker for Robinhood Chain. Paste a wallet address (or connect one) and see what it's holding, how it's performing, and what it's been doing on-chain — no account, no database, nothing stored server-side.

Live at [robinhods.vercel.app](https://robinhods.vercel.app/)

## What it does

- **Portfolio overview** — total value, weighted 24H change, token list with live prices and PnL
- **Cost basis tracking** — set your own buy price per token, saved in your browser so PnL actually means something
- **Value chart** — 24H / 7D / 30D views of your total portfolio value over time
- **Allocation breakdown** — pie chart of what you're actually holding
- **Wallet analytics** — a rough risk score, stablecoin %, and a diversification score (HHI-based) so you can see how concentrated you are at a glance
- **Transaction history** — swaps, transfers, bridges, and LP activity pulled from Blockscout, with type/token filters
- **LP positions** — your Uniswap-v3-style concentrated liquidity positions, with pending fees per token
- **Trending** — what's moving on Robinhood Chain right now, scored from DexScreener volume/liquidity/txn data
- **Recent searches** — quick access to addresses you've looked up before

Everything reads directly from chain + a few public APIs. There's no sign-up and no server-side storage of anything about you — cost basis, recent searches, and your last-connected address all live in `localStorage`.

## How it's built

- **Next.js 16** (App Router, Turbopack)
- **ethers.js v6** for all on-chain reads — no wagmi/viem, just direct JSON-RPC with automatic fallback across three RPC endpoints
- **TanStack Query** for caching and retries on the client
- **Tailwind 4** for styling
- Route handlers under `src/app/api/*` proxy every external call (Blockscout, CoinGecko, DexScreener) so API keys never touch the browser, and each route allowlists its own params to keep things locked down
- A small in-memory cache kicks in if Blockscout starts rate-limiting, so the UI degrades to "slightly stale" instead of "broken"

## Running it locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. Connect a wallet or paste any Robinhood Chain address to poke around — you don't need a wallet connected to browse a portfolio.

### Environment variables

```
BLOCKSCOUT_API_KEY=your_key_here
```

Required for transaction history and LP position lookups (the `/api/blockscout` route won't work without it). Everything else — CoinGecko prices/charts and DexScreener trending — needs no key.

## Deploying

```bash
npx vercel --prod
```

Just remember to set `BLOCKSCOUT_API_KEY` in your Vercel project settings — it's the only required env var.
