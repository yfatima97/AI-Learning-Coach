# Deploy to Azure (Phase 14)

The whole coach (API + Angular website) runs as **one Azure App Service** on one URL.
GitHub Actions (`.github/workflows/azure-deploy.yml`) builds and deploys it every time you push to `main`.

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

`npm run build` (run by GitHub Actions, which then removes dev-only packages and zips the app):
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
   - Pricing plan: **Free F1**
3. **Database** tab: leave everything unticked. **Deployment** tab: leave Continuous deployment on **Disable**
   (the repo has its own deploy workflow, `.github/workflows/azure-deploy.yml`).
4. Click **Review + create**, then **Create**. Wait for "Your deployment is complete", then click **Go to resource**.

### 2b. Connect GitHub to the Web App (publish profile)
1. In the Web App, open **Settings → Configuration**, then the **General settings** tab. Turn
   **SCM Basic Auth Publishing Credentials** **On**, and click **Save**, then **Continue**.
2. Go to **Overview** and click **Download publish profile** in the top bar. A `.PublishSettings` file downloads.
3. Open that file with Notepad, press **Ctrl+A**, then **Ctrl+C** to copy everything.
4. On GitHub, open your repo, then **Settings → Secrets and variables → Actions**.
   - **Secrets** tab → **New repository secret**: Name `AZURE_WEBAPP_PUBLISH_PROFILE`, Secret: paste (**Ctrl+V**). Click **Add secret**.
   - **Variables** tab → **New repository variable**: Name `AZURE_WEBAPP_NAME`, Value: your Web App's name. Click **Add variable**.

The publish profile is a password for deploying. Keep it out of chats, screenshots and code.

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

### 4. Deploy
Open https://github.com/yfatima97/AI-Learning-Coach/actions, click **Deploy to Azure** on the left, then
**Run workflow** → **Run workflow**. It takes 5 to 10 minutes. Wait for the green tick.
After that, every push to `main` deploys automatically.

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
