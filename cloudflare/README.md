# Cloudflare JSON-admin

Den har Workern later admin-sidan ladda upp JSON-filer utan att visa GitHub-token pa hemsidan.

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
| `SVENSK_ALLOWED_ORIGINS` | `https://www.svenskehockey.se,http://127.0.0.1:5179` |

## Pa sidan

1. Ga till `#/admin`.
2. Klistra in Worker-URL:en, till exempel `https://din-worker.workers.dev`.
3. Logga in med `SVENSK_ADMIN_PASSWORD`.
4. Valj JSON-fil, valj fil fran datorn och tryck `Ladda upp till GitHub`.

GitHub Pages kan ta nagon minut innan den nya filen syns publikt.
