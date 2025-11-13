// tests/mysql-diag.js
// Requisitos: npm i mysql2 @aws-sdk/client-secrets-manager
// Ejecuta con:  node tests/mysql-diag.js

const dns = require("dns").promises;
const net = require("net");
const mysql = require("mysql2/promise");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

// Config local (ajusta si no usas Secrets Manager)
const REGION = process.env.AWS_REGION || "us-east-1";
const SECRET_ARN = process.env.MYSQL_SECRET_ARN || "arn:aws:secretsmanager:us-east-1:935244547013:secret:rimac/dev/mysql-1oiqkn";
const REQUIRE_SSL = process.env.MYSQL_SSL === "true"; // pon true si tu instancia exige SSL

async function fetchSecret() {
  const sm = new SecretsManagerClient({ region: REGION });
  const res = await sm.send(new GetSecretValueCommand({ SecretId: SECRET_ARN }));
  const json = JSON.parse(res.SecretString);
  // Esperados en tu secret: host, username, password, dbname, port (opcional)
  return {
    host: json.host,
    user: json.username,
    password: json.password,
    database: json.dbname || process.env.MYSQL_DB || "appointments",
    port: Number(json.port || 3306)
  };
}

async function diagTcp(host, port) {
  console.log("[DIAG] Host:", host, "Port:", port);
  try {
    const a = await dns.lookup(host);
    console.log("[DIAG] DNS →", a.address);
  } catch (e) {
    console.error("[DIAG] DNS error:", e.message);
  }

  await new Promise((resolve) => {
    const sock = net.createConnection({ host, port, timeout: 3000 });
    sock.on("connect", () => {
      console.log("[DIAG] TCP connect OK");
      sock.end();
      resolve();
    });
    sock.on("timeout", () => {
      console.error("[DIAG] TCP timeout (bloqueo de red/SG/NACL)");
      sock.destroy();
      resolve();
    });
    sock.on("error", (err) => {
      console.error("[DIAG] TCP error:", err.message);
      resolve();
    });
  });
}

async function main() {
  try {
    console.log("[MySQL] Leyendo secret...");
    const cfg = await fetchSecret();

    await diagTcp(cfg.host, cfg.port);

    console.log("[MySQL] Abriendo conexión...");
    const pool = await mysql.createPool({
      host: cfg.host,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      port: cfg.port,
      waitForConnections: true,
      connectionLimit: 2,
      connectTimeout: 8000,
      // Usa SSL si tu instancia lo requiere. Si no tienes CA a mano, puedes probar con rejectUnauthorized:false
      ssl: REQUIRE_SSL ? { rejectUnauthorized: true } : undefined
      // ssl: REQUIRE_SSL ? { rejectUnauthorized: false } : undefined
    });

    const [rows] = await pool.query("SELECT 1 AS ok");
    console.log("[MySQL] SELECT 1 →", rows);

    await pool.end();
    console.log("[MySQL] OK, conexión y query exitosas.");
  } catch (e) {
    console.error("[ERROR]", e.message);
    console.error(e);
  }
}

main();
