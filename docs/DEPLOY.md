# Deploy to Azure (Phase 14)

The whole coach (API + Angular website) runs as **one Azure App Service** on one URL.
GitHub Actions builds and deploys it every time you push to `main`.

```
Browser ──▶ https://<your-app>.azurewebsites.net   (password protected)
              │
              Azure App Service (Linux, Node.js)
              ├── Express API (/api/...)
              ├── Angular website (built into frontend/dist)
              └── SQLite database in /home/data (persistent storage)
              │
              Claude API
```

## What happens on each deploy

`npm run build` (run by GitHub Actions):
1. `tsc` compiles the API to `dist/`
2. `scripts/build-web.mjs` builds the Angular app into `frontend/dist/`
3. `npm run ingest` builds the knowledge index (`data/index.json`)

`npm start` (run by Azure): creates the database folder, runs `prisma migrate deploy`,
then starts the API, which also serves the website.

## Step by step (Azure portal)

### 1. Azure account
Sign up at https://azure.microsoft.com/free (students: https://azure.microsoft.com/free/students
gives credit without a credit card).

### 2. Create the Web App
1. Go to https://portal.azure.com, click **Create a resource**, then **Web App**, then **Create**.
2. **Basics** tab:
   - Resource group: **Create new**, name it `ai-coach-rg`
   - Name: something unique, like `ai-learning-coach-fatima` (this becomes your URL)
   - Publish: **Code**
   - Runtime stack: **Node 24 LTS** (or the newest Node LTS listed)
   - Operating System: **Linux**
   - Region: the closest to you
   - Pricing plan: **Free F1** to try it out. If it is slow or runs out of quota, scale up to **Basic B1** later.
3. **Deployment** tab:
   - Continuous deployment: **Enable**
   - Sign in to GitHub, then choose Organization `yfatima97`, Repository `AI-Learning-Coach`, Branch `main`
   - Basic authentication: **Disable** (Azure uses a secure GitHub connection instead)
4. Click **Review + create**, then **Create**. Wait about a minute, then click **Go to resource**.

Azure adds a workflow file to your repo (`.github/workflows/main_<app-name>.yml`) and starts the first deploy.
Run `git pull` on your computer afterwards so you have that file too.

### 3. Add your settings (secrets)
In your Web App, open **Settings → Environment variables**. On the **App settings** tab, click **+ Add** for each:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Claude API key |
| `APP_PASSWORD` | a password you choose, for signing in to the website |
| `DATABASE_URL` | `file:/home/data/coach.db` |
| `VOYAGE_API_KEY` | (optional) for semantic search |
| `GITHUB_TOKEN` | (optional) for reviewing GitHub repos without rate limits |

Click **Apply**, then **Confirm**. The app restarts.

### 4. Watch the deploy
Open https://github.com/yfatima97/AI-Learning-Coach/actions. The run "Build and deploy Node.js app to Azure Web App"
takes 5 to 10 minutes. Wait for the green tick.

### 5. Open your app
Go to `https://<your-app-name>.azurewebsites.net`. The first load can take up to a minute while the app starts.
A sign-in box appears: type any username and your `APP_PASSWORD`.

Your local data does not move to Azure. The online app starts with an empty dashboard.

## Troubleshooting

- **"Application Error" page:** in the Web App, open **Monitoring → Log stream** and look for the error.
  A missing `ANTHROPIC_API_KEY` is the most common cause.
- **The GitHub Actions run failed:** open the failed run, click the red step and read the error.
- **Sign-in box keeps coming back:** check `APP_PASSWORD` in Environment variables (it is case sensitive).
- **Very slow on Free F1:** scale up under **Settings → Scale up (App Service plan)** to Basic B1.

## Switching to Azure PostgreSQL later
1. Create an **Azure Database for PostgreSQL flexible server**.
2. In `prisma/schema.prisma` set `provider = "postgresql"`, delete `prisma/migrations`, and run
   `npx prisma migrate dev --name init` against a Postgres database.
3. Set `DATABASE_URL` in App settings to the Postgres connection string, and use `@prisma/adapter-pg`
   in `src/db/client.ts`.
