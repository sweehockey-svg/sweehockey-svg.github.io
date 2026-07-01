# Cloudflare JSON-admin

Den har Workern later admin-sidan trigga JSON-uppdateringar via GitHub Actions och ladda upp JSON-filer utan att visa GitHub-token pa hemsidan.

## Cloudflare Worker

1. Skapa en Worker i Cloudflare.
2. Klistra in koden fran `json-admin-worker.js`.
3. Lagg till dessa Worker secrets/variables:

| Namn | Varde |
| --- | --- |
| `SVENSK_GITHUB_TOKEN` | GitHub-token med ratt att skriva till repot |
| `SVENSK_ADMIN_PASSWORD` | Losenordet du skriver pa `/admin` |
| `SVENSK_ADMIN_TOKEN` | Valfri hemlig token, lang slumpad text |
| `SVENSK_GITHUB_OWNER` | `sweehockey-svg` |
| `SVENSK_GITHUB_REPO` | `sweehockey-svg.github.io` |
| `SVENSK_GITHUB_REF` | `main` |
| `SVENSK_GITHUB_WORKFLOW` | `update-svensk-json.yml` |
| `SVENSK_ALLOWED_ORIGINS` | `https://www.svenskehockey.se,http://127.0.0.1:5179` |

## Pa sidan

1. Ga till `#/admin`.
2. Klistra in Worker-URL:en, till exempel `https://din-worker.workers.dev`.
3. Logga in med `SVENSK_ADMIN_PASSWORD`.
4. Tryck `Uppdatera` pa den JSON-fil som ska byggas om, eller `Uppdatera alla JSON`.
5. Workern triggar GitHub Actions med input `file`, till exempel `svenska-lag-historia.json` eller `all`.

Manuell uppladdning finns kvar som reserv om du redan har en fardig JSON-fil pa datorn.

Automatisk uppdatering finns for SQL-byggda filer. `teamlogos.json`, `players.json` och `svenska-lag-historia-team-history.json` laddas upp manuellt tills de har egna SQL-exporter.

GitHub-workflowen finns i `.github/workflows/update-svensk-json.yml`. Den anvander GitHub secrets med prefix `SVENSK_`, till exempel `SVENSK_DB_NAME`, `SVENSK_DB_USER`, `SVENSK_DB_PASSWORD` och vid SSH-tunnel `SVENSK_SSH_HOST`, `SVENSK_SSH_USER`, `SVENSK_SSH_PRIVATE_KEY`.

GitHub Pages kan ta nagon minut innan den nya filen syns publikt.
