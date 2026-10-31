// Small GitHub API client for reading and writing drafts and starting the refine workflow.

const API = "https://api.github.com";
export const DRAFTS_DIR = ".claude/drafts";
export const WORKFLOW_FILE = "refine-draft.yml";

function config() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token || !owner || !repo) {
    throw new Error(
      "GitHub settings are missing. Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO."
    );
  }
  return { token, owner, repo, branch };
}

export class GitHubError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function gh(path, { method = "GET", body } = {}) {
  const { token } = config();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GitHubError(
      `GitHub ${method} ${path} failed (${res.status}): ${text.slice(0, 300)}`,
      res.status
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

function draftPath(slug) {
  return `${DRAFTS_DIR}/${slug}.md`;
}

function repoPath(path) {
  const { owner, repo } = config();
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${path}`;
}

/** All draft files with their text, in one request. */
export async function listDraftFiles() {
  const { owner, repo, branch } = config();
  const query = `query($owner: String!, $repo: String!, $expr: String!) {
    repository(owner: $owner, name: $repo) {
      object(expression: $expr) {
        ... on Tree { entries { name type object { ... on Blob { text } } } }
      }
    }
  }`;
  const data = await gh("/graphql", {
    method: "POST",
    body: { query, variables: { owner, repo, expr: `${branch}:${DRAFTS_DIR}` } },
  });
  if (data.errors?.length) {
    throw new GitHubError(`GitHub GraphQL error: ${data.errors[0].message}`, 502);
  }
  const entries = data.data?.repository?.object?.entries || [];
  return entries
    .filter((e) => e.type === "blob" && e.name.endsWith(".md"))
    .map((e) => ({ slug: e.name.replace(/\.md$/, ""), text: e.object?.text ?? "" }));
}

/** One draft's text and its sha (needed to save changes). */
export async function getDraftFile(slug) {
  const { branch } = config();
  const data = await gh(
    repoPath(`/contents/${DRAFTS_DIR}/${encodeURIComponent(slug)}.md?ref=${encodeURIComponent(branch)}`)
  );
  return {
    text: Buffer.from(data.content || "", "base64").toString("utf8"),
    sha: data.sha,
  };
}

/** Create (no sha) or update (with sha) a draft. Returns the new sha. */
export async function putDraftFile(slug, text, { sha, message } = {}) {
  const { branch } = config();
  const data = await gh(repoPath(`/contents/${DRAFTS_DIR}/${encodeURIComponent(slug)}.md`), {
    method: "PUT",
    body: {
      message: message || `Update ${draftPath(slug)}`,
      content: Buffer.from(text, "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    },
  });
  return data.content.sha;
}

/** Start the refine workflow for one draft. */
export async function dispatchRefine(slug) {
  const { branch } = config();
  await gh(repoPath(`/actions/workflows/${WORKFLOW_FILE}/dispatches`), {
    method: "POST",
    body: { ref: branch, inputs: { draft: draftPath(slug) } },
  });
}

export function actionsUrl() {
  const { owner, repo } = config();
  return `https://github.com/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}`;
}
