const express = require('express');
const mysql = require('mysql2/promise');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// =========================
// KONFIG
// =========================
const SSH_CONFIG = {
  host: 'production.nhlgamer.com',
  port: 22,
  username: 'eswahn',

  // Rekommenderat: lägg lösenord i env istället för här
  // password: process.env.SSH_PASSWORD,

  // Rekommenderat om du kör nyckel:
  privateKey: fs.readFileSync('C:/Users/TheSw\\.ssh/id_ed25519.ppk'),
  // OBS:
  // .ppk funkar normalt INTE direkt med ssh2.
  // Bäst är att exportera nyckeln till OpenSSH-format och peka på den filen istället.
  // Exempel:
  // privateKey: fs.readFileSync('C:/Users/TheSw/.ssh/id_ed25519'),

  // Om din nyckel har passphrase:
  // passphrase: process.env.SSH_KEY_PASSPHRASE,
};

const DB_CONFIG = {
  user: 'eswahn',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, // sätt detta
  charset: 'utf8mb4',
};

// Lägg hela queryn i query.sql
const SQL_QUERY = fs.readFileSync(path.join(__dirname, 'query.sql'), 'utf8');

// Enkel cache så inte varje refresh slår hårt mot DB
let cache = null;
let cacheTime = 0;
const CACHE_MS = 30_000;

// =========================
// STATIC FILES
// =========================
app.use(express.static(__dirname));

// =========================
// SSH + MYSQL
// =========================
function createSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new Client();

    ssh
      .on('ready', () => {
        ssh.forwardOut(
          '127.0.0.1',
          0,
          '127.0.0.1',
          3306,
          (err, stream) => {
            if (err) {
              ssh.end();
              return reject(err);
            }
            resolve({ ssh, stream });
          }
        );
      })
      .on('error', reject)
      .connect(SSH_CONFIG);
  });
}

async function runQueryThroughSsh(query) {
  const { ssh, stream } = await createSshTunnel();

  try {
    const connection = await mysql.createConnection({
      ...DB_CONFIG,
      stream,
    });

    const [rows] = await connection.query(query);
    await connection.end();
    ssh.end();
    return rows;
  } catch (err) {
    ssh.end();
    throw err;
  }
}

// =========================
// API
// =========================
app.get('/api/ecl-data', async (req, res) => {
  try {
    if (cache && Date.now() - cacheTime < CACHE_MS) {
      return res.json(cache);
    }

    const rows = await runQueryThroughSsh(SQL_QUERY);

    if (!rows || !rows.length) {
      return res.status(404).json({
        error: 'Ingen data returnerades från databasen.',
      });
    }

    let result = rows[0].json_result;

    if (!result) {
      return res.status(500).json({
        error: 'json_result saknas i SQL-svaret.',
      });
    }

    if (typeof result === 'string') {
      result = JSON.parse(result);
    }

    cache = result;
    cacheTime = Date.now();

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(result);
  } catch (error) {
    console.error('API/DB error:', error);
    res.status(500).json({
      error: 'Kunde inte hämta data från databasen.',
      details: error.message,
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    cached: !!cache,
    cacheAgeMs: cache ? Date.now() - cacheTime : null,
  });
});

app.listen(PORT, () => {
  console.log(`Server kör på http://localhost:${PORT}`);
});
