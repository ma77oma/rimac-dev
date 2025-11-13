// src/lambdas/net_diag.ts
import type { Handler } from "aws-lambda";
import dns from "dns/promises";
import net from "net";
import mysql from "mysql2/promise";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "us-east-1";
const SECRET_ARN = process.env.MYSQL_SECRET_ARN!; // ya lo tienes en provider.environment
const REQUIRE_SSL = process.env.MYSQL_SSL === "true"; // opcional

async function fetchSecret() {
  const sm = new SecretsManagerClient({ region: REGION });
  const res = await sm.send(
    new GetSecretValueCommand({ SecretId: SECRET_ARN })
  );
  const s = JSON.parse(res.SecretString!);
  return {
    host: s.host as string,
    user: s.username as string,
    password: s.password as string,
    database: (s.dbname as string) ?? process.env.MYSQL_DB ?? "appointments",
    port: Number(s.port ?? 3306),
  };
}

async function tcpDiag(host: string, port: number) {
  console.log("[DIAG] Host:", host, "Port:", port);
  try {
    const a = await dns.lookup(host);
    console.log("[DIAG] DNS →", a.address);
  } catch (e: any) {
    console.error("[DIAG] DNS error:", e?.message ?? e);
  }

  await new Promise<void>((resolve) => {
    const sock = net.createConnection({ host, port, timeout: 3000 });
    sock.on("connect", () => {
      console.log("[DIAG] TCP connect OK");
      sock.end();
      resolve();
    });
    sock.on("timeout", () => {
      console.error("[DIAG] TCP timeout (ruta/NAT/SG/NACL)");
      sock.destroy();
      resolve();
    });
    sock.on("error", (err) => {
      console.error("[DIAG] TCP error:", err.message);
      resolve();
    });
  });
}

export const handler: Handler = async () => {
  console.log("[NETDIAG] Iniciando…");

  await tcpDiag("secretsmanager.us-east-1.amazonaws.com", 443);

  const cfg = await fetchSecret();

  await tcpDiag(cfg.host, cfg.port);

  console.log("[NETDIAG] Intentando conexión MySQL…");
  try {
    const pool = mysql.createPool({
      host: cfg.host,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      port: cfg.port,
      waitForConnections: true,
      connectionLimit: 2,
      connectTimeout: 8000,
      ssl: REQUIRE_SSL ? { rejectUnauthorized: true } : undefined,
    });
    const [rows] = await pool.query("SELECT 1 AS ok");
    console.log("[NETDIAG] SELECT 1 →", rows);
    await pool.end();
    console.log("[NETDIAG] Conexión MySQL OK ✅");
  } catch (e: any) {
    console.error("[NETDIAG] Error MySQL:", e?.message ?? e);
  }

  await tcpDiag("events.us-east-1.amazonaws.com", 443);
  await tcpDiag("dynamodb.us-east-1.amazonaws.com", 443);
  await tcpDiag("sns.us-east-1.amazonaws.com", 443);

  return { ok: true };
};
