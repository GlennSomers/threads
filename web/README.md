# Reel Drafts

A private web app for jotting down reel ideas and refining them with Claude, using the skills in this repo.

## How it works

1. You type or dictate an idea in the app. It's saved as a markdown file in `.claude/drafts/`.
2. You tap **Refine with Claude**. The app starts the `Refine draft` GitHub workflow.
3. The workflow runs Claude Code with the `reel-script-refine` skill, signed in with your Claude Pro plan. The skill uses the knowledge base, `ig-reel`, `brain-dump`, `ig-caption` and the humanizer passes.
4. The workflow commits the refined draft. The app picks it up within a few seconds.

Refines use your Pro usage limits, the same as using Claude Code yourself. GitHub Actions minutes come from your GitHub plan's free allowance.

## One-time setup

### 1. Claude token (for the workflow)

On your computer, in a terminal:

```bash
claude setup-token
```

Log in with your Pro account and copy the token it prints (it starts with `sk-ant-oat01-`).

In GitHub, open this repo, then **Settings → Secrets and variables → Actions → New repository secret**:

- Name: `CLAUDE_CODE_OAUTH_TOKEN`
- Secret: the token

### 2. GitHub token (for the app)

Go to **github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.

- Repository access: **Only select repositories → threads**
- Permissions → Repository permissions:
  - **Contents: Read and write**
  - **Actions: Read and write**
- Copy the token.

### 3. Vercel

1. In Vercel, click **Add New → Project** and import `GlennSomers/threads`.
2. Set **Root Directory** to `web`. Leave the framework as Next.js.
3. Add these **Environment Variables**:

| Name | Value |
|---|---|
| `APP_PASSWORD` | A long password you'll use to open the app |
| `GITHUB_TOKEN` | The token from step 2 |
| `GITHUB_OWNER` | `GlennSomers` |
| `GITHUB_REPO` | `threads` |
| `GITHUB_BRANCH` | `main` |

4. Click **Deploy**.

`vercel.json` tells Vercel to skip rebuilding when a push only changes files outside `web/`, so saving drafts doesn't trigger a deploy.

### 4. Try it

Open the Vercel URL, log in, open the example draft and tap **Refine with Claude**. The first run takes a couple of minutes. On your phone, use **Share → Add to Home Screen** to open it like an app.

## If a refine fails

The draft shows an error. Open the repo's **Actions** tab and click the failed **Refine draft** run to see why. The usual causes:

- The `CLAUDE_CODE_OAUTH_TOKEN` secret is missing or expired. Run `claude setup-token` again and update the secret.
- You've hit your Pro usage limit. Wait for it to reset.

## Run it locally

```bash
cd web
cp .env.example .env.local   # then fill it in
npm install
npm run dev
```

`npm test` checks the draft file format.
