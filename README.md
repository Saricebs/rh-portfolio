# RH Portfolio

A portfolio tracker for Robinhood Chain. Paste a wallet address (or connect one) and see what it's holding, how it's performing, and what it's been doing on-chain — no account, no database, nothing stored server-side.

Live at [robinhods.vercel.app](https://robinhods.vercel.app/)

## What it does

- **Portfolio overview** — total value, weighted 24H change, token list with live prices and PnL
- **Cost basis tracking** — set your own buy price per token, persisted to `localStorage` so PnL survives a reload. Tokens with no cost basis show no PnL at all rather than reporting their full value as profit
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
- Every `/api/*` route is rate limited per IP (see `src/lib/rateLimit.ts`) so the server-side Blockscout key can't be drained by a third party. It's per-instance; back it with Vercel KV / Upstash if you need a hard global cap

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

See `.env.example`.

Required for transaction history and LP position lookups (the `/api/blockscout` route won't work without it). Everything else — CoinGecko prices/charts and DexScreener trending — needs no key.

## Deploying

```bash
npx vercel --prod
```

Just remember to set `BLOCKSCOUT_API_KEY` in your Vercel project settings — it's the only required env var.

## Sharing

The connected/looked-up address is mirrored into `?address=0x…`, so the Share
button produces a link that actually resolves for the recipient. A shared link
takes precedence over whatever the recipient's browser last viewed.

## Known limitations

- The portfolio value chart applies *current* balances to historical prices. It
  shows how today's holdings would have moved, not your realised history.
- LP "Liquidity (L)" is the raw Uniswap-V3 liquidity value (√(x·y)). It is
  unitless and deliberately not presented as a token amount.
- Transaction type detection is selector-based heuristics over the parent
  transaction's calldata. Unknown routers fall back to `Contract`.
