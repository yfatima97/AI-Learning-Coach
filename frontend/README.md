# AI Learning Coach UI (Angular)

Dashboard, coach chat, quizzes, reviews, "ask my notes" and planning screens for the AI Learning Coach API.

```bash
npm install
npm start        # http://localhost:4200, opens your browser
```

The backend must be running too (`npm run dev` in the project root). During development
`proxy.conf.json` forwards `/api/*` to `http://localhost:5000`, so no CORS setup is needed.

`npm run build` writes a production build to `dist/frontend/browser` (deployed to Azure Static Web Apps in Phase 14).
