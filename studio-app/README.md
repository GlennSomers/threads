# Editing Studio (hosted)

The Studio from `.claude/editing-studio/`, deployable to Vercel. The screens are the same files the local app uses
(copied into `public/` at build time). The heavy work, which cannot run on Vercel, runs in GitHub Actions.

```
Browser ──> Vercel (static screens + api/router.js) ──> Vercel Blob  (clips, previews, styles, LUTs, renders)
                         │
                         └── workflow_dispatch ──> GitHub Actions: studio-jobs.yml ──> ffmpeg, Groq, ingest, screenshots, HyperFrames render
                                                     (reads and writes the same Blob store, reports status to jobs/<id>.json)
```

What runs where
| Thing | Where |
|---|---|
| Studio screens, styles, caption presets, LUT presets | Vercel (stored in Blob) |
| Upload of clips and reference videos | Browser straight to Blob (no size limit from Vercel) |
| Preview copy + transcription, ingest, page screenshots, render | GitHub Actions |
| Login | Vercel function, one shared password |

## Set up (once)
1. **Merge this branch to `main`.** The workflow `.github/workflows/studio-jobs.yml` has to be on the default branch.
2. **Vercel project:** import this repo, set **Root Directory** to `studio-app`, and keep **Include source files outside of the Root Directory in the Build Step** on (the build copies the screens from `.claude/editing-studio/studio/`). Framework preset: Other.
3. **Blob store:** in the Vercel project, Storage > Create > Blob, and connect it. That adds `BLOB_READ_WRITE_TOKEN` to the project.
4. **Project environment variables** (see `.env.example`):
   - `STUDIO_PASSWORD`: the shared password. **Set this**, or anyone with the URL can use the app and your GitHub minutes.
   - `STUDIO_SECRET`: a long random string for the login cookie.
   - `GH_DISPATCH_TOKEN`: a fine-grained GitHub token for this repo with **Actions: Read and write**.
   - `GH_REPO` (default `GlennSomers/threads`) and `GH_REF` (default `main`) if different.
5. **GitHub repo secrets** (Settings > Secrets and variables > Actions): `BLOB_READ_WRITE_TOKEN` (same value as Vercel) and `GROQ_API_KEY`.
6. Deploy, open the URL, log in.

## Behaviour to expect
- **Not live like the local app.** Adding a clip starts an Actions job (about a minute to get the preview and transcript). A render takes a few minutes plus the queue. Actions minutes on a private repo are metered; this repo is public, so they are free.
- Blob file URLs are public and contain the file name, so anyone who guesses a URL can view that file. The app itself is behind the password; the video files are not. Do not put private footage here if that matters.
- Style, caption-preset and LUT saves work as locally: nothing is saved until you press Save.

## Run it locally (no Vercel, no Actions)
```
cd studio-app
npm install
npm run sync      # copy the screens
npm run dev       # http://localhost:8766, files in studio-app/.data, jobs run as local child processes
```
Optional `STUDIO_PASSWORD=... STUDIO_SECRET=...` to try the login. The original single-folder app (`python3 .claude/editing-studio/studio/server.py`) still works on its own.

## Not tested
Everything marked Vercel Blob, GitHub dispatch and the Actions run itself was written against the docs but not run (no credentials in the build session). The local dev mode exercises the same router, job runner and screens end to end with a folder standing in for Blob.
