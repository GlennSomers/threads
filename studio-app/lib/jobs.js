// Starts the heavy jobs (ffmpeg, transcription, ingest, screenshots, render) away from Vercel.
// Production: a GitHub Actions workflow_dispatch. Local dev (STORAGE=fs): the same Python runner as a child process.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { FS, DATA, putText, getJSON } from './store.js';

const RUNNER = path.resolve(new URL('../../.claude/editing-studio/tools/studio_job.py', import.meta.url).pathname);

export async function dispatch(job, args, id) {
  id = id || `${job}-${Date.now().toString(36)}`;
  await putText(`jobs/${id}.json`, JSON.stringify({ id, status: 'queued', message: '', at: Math.floor(Date.now() / 1000) }));
  const payload = { ...args, job_id: id };
  if (FS) {
    const p = spawn('python3', [RUNNER, job, JSON.stringify(payload)], { env: { ...process.env, STORAGE: 'fs', STORAGE_DIR: DATA }, stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('error', e => putText(`jobs/${id}.json`, JSON.stringify({ id, status: 'error', message: String(e.message), at: Math.floor(Date.now() / 1000) })));
    return id;
  }
  const repo = process.env.GH_REPO || 'GlennSomers/threads', token = process.env.GH_DISPATCH_TOKEN;
  if (!token) throw new Error('GH_DISPATCH_TOKEN is not set, so jobs cannot be started.');
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/studio-jobs.yml/dispatches`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: process.env.GH_REF || 'main', inputs: { id, job, args: JSON.stringify(payload) } }) });
  if (!r.ok) {
    await putText(`jobs/${id}.json`, JSON.stringify({ id, status: 'error', message: `GitHub refused the job (${r.status})`, at: Math.floor(Date.now() / 1000) }));
    throw new Error(`GitHub refused the job (${r.status}). Check GH_DISPATCH_TOKEN and that studio-jobs.yml is on the ${process.env.GH_REF || 'main'} branch.`);
  }
  return id;
}

// queued/running for more than 40 minutes means the workflow never reported back
export async function jobStatus(id) {
  const j = await getJSON(`jobs/${id}.json`); if (!j) return null;
  if ((j.status === 'queued' || j.status === 'running') && Date.now() / 1000 - j.at > 2400) return { ...j, status: 'error', message: 'Timed out waiting for the job. Check the Actions tab.' };
  return j;
}
