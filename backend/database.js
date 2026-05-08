import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'sabong.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS arenas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed')),
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fights (
      id TEXT PRIMARY KEY,
      fight_number INTEGER NOT NULL,
      meron_name TEXT NOT NULL,
      wala_name TEXT NOT NULL,
      meron_weight TEXT,
      wala_weight TEXT,
      status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'open', 'last_call', 'closed', 'fight', 'finished', 'cancelled')),
      winner TEXT CHECK(winner IN ('meron', 'wala', 'draw', 'cancelled') OR winner IS NULL),
      total_meron_bets REAL DEFAULT 0,
      total_wala_bets REAL DEFAULT 0,
      total_draw_bets REAL DEFAULT 0,
      arena_id TEXT,
      event_date TEXT,
      odds_meron REAL DEFAULT 1,
      odds_wala REAL DEFAULT 1,
      odds_draw REAL DEFAULT 8,
      bet_timer_seconds REAL DEFAULT 0,
      bet_timer_start TEXT,
      meron_streak INTEGER DEFAULT 0,
      wala_streak INTEGER DEFAULT 0,
      bayong_jackpot REAL DEFAULT 100,
      bayong_triggered INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bets (
      id TEXT PRIMARY KEY,
      fight_id TEXT NOT NULL,
      fight_number INTEGER,
      side TEXT NOT NULL CHECK(side IN ('meron', 'wala', 'draw')),
      amount REAL NOT NULL,
      bettor_name TEXT,
      ticket_number TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'won', 'lost', 'draw', 'cancelled', 'paid')),
      payout REAL DEFAULT 0,
      terminal_id TEXT,
      operator_id TEXT,
      claimed INTEGER DEFAULT 0,
      claimed_at TEXT,
      claimed_by TEXT,
      qr_code TEXT,
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS operators (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT,
      pin TEXT,
      terminal_id TEXT NOT NULL,
      commission_rate REAL DEFAULT 5,
      credit_balance REAL DEFAULT 0,
      loaded_total REAL DEFAULT 0,
      total_volume REAL DEFAULT 0,
      total_commission REAL DEFAULT 0,
      total_bets_placed INTEGER DEFAULT 0,
      total_payouts REAL DEFAULT 0,
      pending_payout REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_configs (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      label TEXT,
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      description TEXT,
      operator_id TEXT,
      operator_name TEXT,
      terminal_id TEXT,
      fight_number INTEGER,
      ticket_number TEXT,
      amount REAL,
      metadata TEXT,
      severity TEXT DEFAULT 'info' CHECK(severity IN ('info', 'warning', 'critical')),
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fight_archives (
      id TEXT PRIMARY KEY,
      fight_id TEXT,
      fight_number INTEGER NOT NULL,
      event_date TEXT,
      meron_name TEXT,
      wala_name TEXT,
      meron_weight TEXT,
      wala_weight TEXT,
      winner TEXT CHECK(winner IN ('meron', 'wala', 'draw', 'cancelled') OR winner IS NULL),
      total_meron_bets REAL DEFAULT 0,
      total_wala_bets REAL DEFAULT 0,
      total_draw_bets REAL DEFAULT 0,
      total_pool REAL DEFAULT 0,
      total_payout REAL DEFAULT 0,
      house_cut REAL DEFAULT 0,
      commission_rate REAL DEFAULT 10,
      bayong_jackpot REAL DEFAULT 0,
      bayong_triggered INTEGER DEFAULT 0,
      meron_streak INTEGER DEFAULT 0,
      wala_streak INTEGER DEFAULT 0,
      bet_count INTEGER DEFAULT 0,
      odds_meron REAL DEFAULT 1,
      odds_wala REAL DEFAULT 1,
      odds_draw REAL DEFAULT 8,
      tickets_snapshot TEXT,
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_fights_status ON fights(status);
    CREATE INDEX IF NOT EXISTS idx_fights_event_date ON fights(event_date);
    CREATE INDEX IF NOT EXISTS idx_bets_fight_id ON bets(fight_id);
    CREATE INDEX IF NOT EXISTS idx_bets_ticket_number ON bets(ticket_number);
    CREATE INDEX IF NOT EXISTS idx_bets_operator_id ON bets(operator_id);
    CREATE INDEX IF NOT EXISTS idx_operators_username ON operators(username);
    CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(key);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
  `);
}

export { db, initializeDatabase };
