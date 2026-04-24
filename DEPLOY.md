# Deploying to Railway (free tier)

## One-time setup

### 1. Push to GitHub
```bash
cd /Users/wojciechrembelski/dev/projects/diablo-push-up
git init
git add .
git commit -m "Initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/diablo-push-up.git
git push -u origin main
```

### 2. Create Railway project
1. Go to railway.app → New Project → Deploy from GitHub repo
2. Select your `diablo-push-up` repo
3. Railway auto-detects Node.js and uses `railway.json` for build/start commands

### 3. Add a persistent volume (required for gamestate.json)
1. In your Railway project → click the service → Storage tab
2. Click **Add Volume**
3. Mount path: `/data`
4. This is where `gamestate.json` will be stored (survives redeploys)

### 4. Set environment variable
In Railway → Variables tab, add:
```
DATA_DIR=/data
```

### 5. Deploy
Railway deploys automatically on every `git push`. The first deploy takes ~2 minutes.

Your app will be live at `https://your-project.railway.app`

## Local development
```bash
npm install
npm --prefix client install
npm run dev        # starts server on :3001 + client on :5173
```

Open http://localhost:5173 in your browser.

## Calibration constants
Edit `server/constants.js` and `client/src/utils/combat.js` to tune difficulty.
Both files are in sync — change both when adjusting values.
Key constants to tune during playtests:
- `PUSH_UP_RATIO` — push-ups per fight (start at 0.5, go up as you get stronger)
- `BASE_FIGHT_TIME` — seconds per fight (120 = 2 minutes)
- `VITALITY_TO_SECONDS` — buffer size per Vitality point
