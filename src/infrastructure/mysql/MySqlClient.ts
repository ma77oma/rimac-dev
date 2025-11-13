import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import mysql, { Pool } from "mysql2/promise";

let pool: Pool | undefined;

export async function getMySqlPool(): Promise<Pool> {
  console.log("[MySQL] Inicializando conexión...");

  if (pool) {
    console.log("[MySQL] Reutilizando pool existente");
    return pool;
  }

  const secretArn = process.env.MYSQL_SECRET_ARN;
  if (!secretArn) {
    console.error("[MySQL] ❌ Variable MYSQL_SECRET_ARN no encontrada en el entorno");
    throw new Error("MYSQL_SECRET_ARN no definida");
  }

  console.log(`[MySQL] Leyendo secreto desde Secrets Manager: ${secretArn}`);
  const client = new SecretsManagerClient({});

  try {
    const res = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));

    if (!res.SecretString) {
      console.error("[MySQL] ❌ El secreto obtenido está vacío o no contiene SecretString");
      throw new Error("SecretString vacío");
    }

    const secret = JSON.parse(res.SecretString);
    console.log("[MySQL] ✅ Secreto obtenido correctamente. Campos:", Object.keys(secret));

    const dbConfig = {
      host: secret.host,
      port: Number(secret.port),
      user: secret.username,
      password: secret.password,
      database: process.env.MYSQL_DB || secret.dbname,
      waitForConnections: true,
      connectionLimit: 2,
    };

    console.log(`[MySQL] Intentando crear pool con host=${dbConfig.host}, puerto=${dbConfig.port}, db=${dbConfig.database}`);

    pool = mysql.createPool(dbConfig);

    // Probar conexión inicial
    const conn = await pool.getConnection();
    console.log("[MySQL] ✅ Conexión inicial exitosa");
    conn.release();

    return pool;
  } catch (error: any) {
    console.error("[MySQL] ❌ Error al inicializar el pool:", error.message || error);
    throw error;
  }
}
