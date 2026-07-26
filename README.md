# RH Portfolio

Track your wallet balances and PNL on Robinhood Chain. No backend, no database — just your wallet address and on-chain data.

Live at [robinhods.vercel.app](https://robinhods.vercel.app/)

## Features

- **Portfolio overview** — total value, 24H change, assets, token list with PNL
- **Cost basis tracking** — set buy prices per token, stored locally
- **Trending** — trending tokens on Robinhood Chain from DexScreener
- **Transaction history** — swaps, transfers, LP interactions from Blockscout
- **Wallet analytics** — diversification score, concentration, risk metrics
- **Chart & allocation** — portfolio value chart + pie chart breakdown

## Built with

- Next.js 16 (App Router)
- ethers.js v6
- Tailwind 4
- Blockscout API (on-chain data)
- DexScreener API (prices, trending)
- CoinGecko API (price charts)

## Local dev

```bash
pnpm install
pnpm dev
```

Opens at `http://localhost:3000`. Connect wallet or paste any RH Chain address.

## Deploy

One-command deploy to Vercel:

```bash
npx vercel --prod
```

Environment variables: none needed — all API calls go through Next.js route handlers.

