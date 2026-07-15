Quick one-click Render + Namecheap deploy

Goal: host backend (Node + Socket.io) and serve frontend from the same service.

1) Push your repo to GitHub
   - Create a GitHub repo and push this project. Example:
     git init
     git add .
     git commit -m "initial"
     gh repo create your-username/bloxygag --public --source=. --remote=origin
     git push -u origin main

2) Create Render Web Service
   - Go to https://dashboard.render.com/new
   - Choose "Web Service" -> Connect your GitHub repo -> select branch `main`.
   - Render will detect `render.yaml` and create the service named `bloxygag-backend`.
   - In Render service settings -> Environment -> add these env vars at minimum:
     - MONGODB_URI (your MongoDB connection string)
     - DISCORD_BOT_TOKEN (if used)
     - HCAPTCHA_SECRET (if used)
     - TRANSACTION_SECRET
   - Deploy.

3) DNS (Namecheap)
   - In Namecheap dashboard -> Domain List -> Manage (bloxygag.org) -> Advanced DNS
   - Add CNAME record: Host `www` -> Value: <your-render-service>.onrender.com
   - Add CNAME `api` -> Value: <your-render-service>.onrender.com (optional)
   - For apex (@) set an ALIAS/ANAME to the Render service or follow Render docs for apex records.

4) Update frontend config (if needed)
   - If you want the site to use your domain as API: edit `Frontend/src/config.js`:
       api: "https://bloxygag.org",
       socketUrl: "https://bloxygag.org",
   - Commit and push; Render will redeploy automatically.

Notes
- The `Backend/package.json` includes a `postinstall` script that builds the frontend and copies files into `Backend/public` during deploy.
- If you prefer I can push the repo to GitHub for you; I cannot run the deploy on your Render account without access.

If you want me to push to GitHub for you, reply "Push" and give the repo name (or I can create it under your account if you authenticate). Otherwise, follow these steps and tell me where you get stuck and I'll guide you through the exact clicks.
