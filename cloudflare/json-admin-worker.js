const DEFAULT_OWNER = "sweehockey-svg";
const DEFAULT_REPO = "sweehockey-svg.github.io";
const DEFAULT_REF = "main";

const ALLOWED_FILES = new Set([
  "svenskstatistikecl26spring.json",
  "svenska-lag-historia.json",
  "svenska-lag-historia-teams.json",
  "svenska-lag-historia-team-history.json",
  "svenska-lag-historia-player-history.json",
  "svenska-lag-historia-player-completions.json",
  "svenska-lag-historia-podiums.json",
  "teamlogos.json",
  "players.json"
]);

export default {
  async fetch(request, env) {
    const cors = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET") {
      const url = new URL(request.url);
      const file = validateFile(url.searchParams.get("file"));
      if (!file) return json({ ok: false, error: "Ogiltig fil." }, 400, cors);
      const github = await githubGetFile(env, file);
      if (!github.ok) return json({ ok: false, error: github.error }, github.status, cors);
      return new Response(github.content, {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Use POST" }, 405, cors);
    }

    const payload = await readJson(request);
    const action = String(payload.action || "");

    if (action === "login") {
      if (!env.SVENSK_ADMIN_PASSWORD) {
        return json({ ok: false, error: "Saknar SVENSK_ADMIN_PASSWORD i Cloudflare." }, 500, cors);
      }
      if (String(payload.password || "") !== env.SVENSK_ADMIN_PASSWORD) {
        return json({ ok: false, error: "Fel losenord." }, 401, cors);
      }
      return json({ ok: true, token: env.SVENSK_ADMIN_TOKEN || env.SVENSK_ADMIN_PASSWORD }, 200, cors);
    }

    if (!isAuthorized(request, env)) {
      return json({ ok: false, error: "Unauthorized" }, 401, cors);
    }

    if (action === "list") {
      const files = Array.isArray(payload.files) ? payload.files : Array.from(ALLOWED_FILES);
      const result = {};
      for (const fileName of files) {
        const file = validateFile(fileName);
        if (!file) continue;
        const github = await githubGetFile(env, file, true);
        result[file] = github.ok
          ? { exists: true, sha: github.sha ? github.sha.slice(0, 7) : "", updated: github.updated || "" }
          : { exists: false };
      }
      return json({ ok: true, files: result }, 200, cors);
    }

    if (action === "upload") {
      const file = validateFile(payload.file);
      if (!file) return json({ ok: false, error: "Ogiltig fil." }, 400, cors);

      let content = String(payload.content || "");
      try {
        content = JSON.stringify(JSON.parse(content), null, 2) + "\n";
      } catch (error) {
        return json({ ok: false, error: "JSON-fel: " + error.message }, 400, cors);
      }

      const current = await githubGetFile(env, file, true);
      const message = `Update ${file} from Svensk eHockey admin`;
      const updated = await githubPutFile(env, file, content, message, current.sha || "");
      if (!updated.ok) return json({ ok: false, error: updated.error }, updated.status, cors);
      return json({ ok: true, file, sha: updated.sha || "" }, 200, cors);
    }

    if (action === "delete") {
      const file = validateFile(payload.file);
      if (!file) return json({ ok: false, error: "Ogiltig fil." }, 400, cors);
      const current = await githubGetFile(env, file, true);
      if (!current.ok) return json({ ok: true, file, deleted: false }, 200, cors);
      const deleted = await githubDeleteFile(env, file, current.sha);
      if (!deleted.ok) return json({ ok: false, error: deleted.error }, deleted.status, cors);
      return json({ ok: true, file, deleted: true }, 200, cors);
    }

    return json({ ok: false, error: "Okand action." }, 400, cors);
  }
};

function validateFile(value) {
  const file = String(value || "").trim().replace(/^\/+/, "");
  if (!ALLOWED_FILES.has(file)) return "";
  return file;
}

function isAuthorized(request, env) {
  const expected = env.SVENSK_ADMIN_TOKEN || env.SVENSK_ADMIN_PASSWORD;
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  return header === "Bearer " + expected;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function githubConfig(env) {
  return {
    owner: env.SVENSK_GITHUB_OWNER || DEFAULT_OWNER,
    repo: env.SVENSK_GITHUB_REPO || DEFAULT_REPO,
    ref: env.SVENSK_GITHUB_REF || DEFAULT_REF,
    token: env.SVENSK_GITHUB_TOKEN
  };
}

async function githubRequest(env, path, init = {}) {
  const cfg = githubConfig(env);
  if (!cfg.token) return { ok: false, status: 500, error: "Saknar SVENSK_GITHUB_TOKEN i Cloudflare." };

  const response = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "svensk-ehockey-json-admin",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    return { ok: false, status: response.status, error: data?.message || text || `GitHub HTTP ${response.status}` };
  }
  return { ok: true, status: response.status, data };
}

async function githubGetFile(env, file, metaOnly = false) {
  const cfg = githubConfig(env);
  const result = await githubRequest(env, `/contents/${encodeURIComponent(file)}?ref=${encodeURIComponent(cfg.ref)}`);
  if (!result.ok) return result;

  const data = result.data || {};
  const content = metaOnly ? "" : decodeBase64(data.content || "");
  return {
    ok: true,
    status: 200,
    sha: data.sha || "",
    updated: "",
    content
  };
}

async function githubPutFile(env, file, content, message, sha) {
  const cfg = githubConfig(env);
  const body = {
    message,
    content: encodeBase64(content),
    branch: cfg.ref,
    ...(sha ? { sha } : {})
  };
  const result = await githubRequest(env, `/contents/${encodeURIComponent(file)}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
  if (!result.ok) return result;
  return { ok: true, status: 200, sha: result.data?.content?.sha || "" };
}

async function githubDeleteFile(env, file, sha) {
  const cfg = githubConfig(env);
  return githubRequest(env, `/contents/${encodeURIComponent(file)}`, {
    method: "DELETE",
    body: JSON.stringify({
      message: `Delete ${file} from Svensk eHockey admin`,
      sha,
      branch: cfg.ref
    })
  });
}

function decodeBase64(value) {
  const binary = atob(String(value || "").replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = String(env.SVENSK_ALLOWED_ORIGINS || "https://www.svenskehockey.se,http://127.0.0.1:5179")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store"
  };
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
