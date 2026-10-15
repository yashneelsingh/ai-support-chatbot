import pg from 'pg';
import dotenv from 'dotenv';
import dns from 'node:dns';
import net from 'node:net';
dotenv.config();

const { Pool } = pg;

// Neon publishes both IPv4 and IPv6 addresses. On Windows with Node 20+, the
// automatic address-family race can stall even though every IPv4 endpoint is
// reachable. Prefer the first IPv4 address and disable that race. Both settings
// remain configurable for environments with working IPv6.
dns.setDefaultResultOrder(process.env.PG_DNS_RESULT_ORDER || 'ipv4first');
net.setDefaultAutoSelectFamily(process.env.PG_AUTO_SELECT_FAMILY === 'true');

const connectionTimeoutMillis = Number.parseInt(
  process.env.DB_CONNECTION_TIMEOUT_MS || '15000',
  10,
);
const connectionRetries = Number.parseInt(process.env.DB_CONNECTION_RETRIES || '3', 10);
const connectionString = process.env.PG_URI?.replace(
  /([?&])sslmode=require(?=&|$)/,
  '$1sslmode=verify-full',
);

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

export const connectPostgres = async () => {
  let lastError;

  for (let attempt = 1; attempt <= connectionRetries; attempt += 1) {
    try {
      await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        email      VARCHAR(150) UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        role       VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id         SERIAL PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        user_id    INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id         SERIAL PRIMARY KEY,
        session_id VARCHAR(100),
        message_id VARCHAR(100),
        rating     VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(200) NOT NULL,
        price       DECIMAL(10,2) NOT NULL,
        category    VARCHAR(100),
        created_at  TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id               SERIAL PRIMARY KEY,
        user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status           VARCHAR(20) NOT NULL DEFAULT 'placed'
                         CHECK (status IN ('placed','processing','shipped','delivered','cancelled')),
        total            DECIMAL(10,2) NOT NULL DEFAULT 0,
        shipping_address TEXT,
        tracking_number  VARCHAR(100),
        placed_at        TIMESTAMP DEFAULT NOW(),
        processed_at     TIMESTAMP,
        shipped_at       TIMESTAMP,
        delivered_at     TIMESTAMP,
        cancelled_at     TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id           SERIAL PRIMARY KEY,
        order_id     INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id   INT REFERENCES products(id),
        product_name VARCHAR(200) NOT NULL,
        quantity     INT NOT NULL DEFAULT 1,
        unit_price   DECIMAL(10,2) NOT NULL,
        subtotal     DECIMAL(10,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS refunds (
        id            SERIAL PRIMARY KEY,
        order_id      INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount        DECIMAL(10,2) NOT NULL,
        reason        TEXT NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','completed')),
        requested_at  TIMESTAMP DEFAULT NOW(),
        resolved_at   TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id                    SERIAL PRIMARY KEY,
        session_id            VARCHAR(100),
        user_id               INT REFERENCES users(id),
        assigned_to           INT REFERENCES users(id),
        summary               TEXT NOT NULL,
        conversation_context  TEXT,
        status                VARCHAR(20) NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open','assigned','resolved','closed')),
        priority              VARCHAR(10) DEFAULT 'medium'
                              CHECK (priority IN ('low','medium','high','urgent')),
        created_at            TIMESTAMP DEFAULT NOW(),
        resolved_at           TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        revoked    BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at    TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
        ON password_reset_tokens(user_id);
    `);
      console.log('PostgreSQL connected + tables ready');
      return;
    } catch (err) {
      lastError = err;
      console.error(
        `PostgreSQL connection attempt ${attempt}/${connectionRetries} failed:`,
        err.message,
      );

      if (attempt < connectionRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw lastError;
};
