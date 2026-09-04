# Automatisk synkning

Den här lösningen ersätter den manuella CSV-kedjan för svenska SportsGamer-profiler.

## Vad som ingår

- Adminpanelen i `skriv.html` använder samma Supabase-inloggning som skribentcentret.
- Endast en användare vars `seh_current_writer()` returnerar rollen `admin` ser och kan använda synkknappen.
- Edge Function `seh-admin-sync` verifierar användaren en gång till på serversidan och startar GitHub Actions-jobbet.
- GitHub Actions öppnar SSH-tunneln till SportsGamer, exporterar svenska profiler, importerar stagingtabellen i Supabase och kör synkningen till centralregistret.
- Knappen visar köad, pågående, klar eller misslyckad körning och länkar till körloggen.

## Engångsinställningar

### 1. GitHub Actions-secrets

De gamla `SVENSK_*`-hemligheterna kan återanvändas:

- `SVENSK_SSH_HOST`
- `SVENSK_SSH_PORT`
- `SVENSK_SSH_USER`
- `SVENSK_SSH_PRIVATE_KEY`
- `SVENSK_SSH_REMOTE_DB_HOST`
- `SVENSK_SSH_REMOTE_DB_PORT`
- `SVENSK_SSH_LOCAL_DB_PORT`
- `SVENSK_DB_HOST`
- `SVENSK_DB_PORT`
- `SVENSK_DB_NAME`
- `SVENSK_DB_USER`
- `SVENSK_DB_PASSWORD`

Lägg dessutom till:

- `SUPABASE_DB_URL`: Supabases anslutningssträng för en serveranslutning som får skriva till `private` och `public`. Använd helst Supavisors sessionspool om direktadressen inte kan nås via IPv4.

### 2. GitHub-token för Edge Function

Skapa en fine-grained GitHub-token som endast har åtkomst till repot
`sweehockey-svg/sweehockey-svg.github.io` och behörigheten **Actions: Read and write**.

Lägg in token som Edge Function-secret:

```powershell
npx supabase@latest secrets set GITHUB_SYNC_TOKEN="DIN_TOKEN"
```

Valfria secrets om standardvärdena inte stämmer:

```powershell
npx supabase@latest secrets set GITHUB_SYNC_REPO="sweehockey-svg/sweehockey-svg.github.io"
npx supabase@latest secrets set GITHUB_SYNC_REF="main"
npx supabase@latest secrets set ALLOWED_ORIGINS="https://www.svenskehockey.se,https://svenskehockey.se"
```

### 3. Länka och publicera Edge Function

Kör från webbplatsens `v2`-mapp:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref oujqnvrczdavqbqaavuh
npx supabase@latest functions deploy seh-admin-sync
```

## Testordning

1. Pusha filerna till GitHub.
2. Kontrollera att workflow-filen syns under **Actions**.
3. Kör workflow-jobbet manuellt en gång från GitHub och kontrollera resultatet.
4. Publicera Edge Function.
5. Logga in i `skriv.html` med adminanvändaren och kör från knappen.

Aktivera inte en timer förrän den manuella knappen har gett korrekta resultat minst två gånger.
