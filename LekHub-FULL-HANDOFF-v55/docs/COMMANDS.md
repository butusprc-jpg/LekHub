# Commands

## Full source restore from GitHub
```bash
git clone https://github.com/butusprc-jpg/LekHub.git
cd LekHub
git checkout 4da51eb0ce41f1cde572db586f778caab8932a54
```

The commit above is the exact GitHub snapshot inspected for this handoff. After cloning, copy everything under `LATEST_OVERLAY/` over the cloned repo, preserving paths.

## Install and run
```bash
npm install
npm run dev
```

## Build check
```bash
npm run build
```

## Git
```bash
git status
git add .
git commit -m "continue LekHub from handoff"
git push origin main
```

## Vercel
Production URL: `https://lek-hub.vercel.app`
Vercel project ID: `prj_EoTpMA9TM99DPzbeAe2s9v9G6EDj`
Vercel team ID: `team_V1mrxiV7msMn7L7eR1FhLmBJ`

The project deploy target is the repository root. Do not introduce a second deploy target/root.
