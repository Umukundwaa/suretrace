// One tiny interface over MySQL (production) and SQLite (zero-setup local runs):
//   query(sql, params) -> rows[]   for SELECT
//                      -> { insertId, affectedRows } for INSERT/UPDATE/DELETE
const fs = require('fs');
const path = require('path');
const cfg = require('./index');

let impl;

async function initMysql() {
  const mysql = require('mysql2/promise');
  const schema = fs.readFileSync(path.join(__dirname, '../../sql/schema.mysql.sql'), 'utf8');
  // create DB + tables with a bootstrap connection
  const boot = await mysql.createConnection({ ...cfg.mysql, database: undefined, multipleStatements: true });
  await boot.query(schema);
  await boot.end();
  const pool = mysql.createPool({ ...cfg.mysql, dateStrings: true, connectionLimit: 10 });
  return {
    async query(sql, params = []) {
      const [r] = await pool.execute(sql, params);
      return Array.isArray(r) ? r : { insertId: r.insertId, affectedRows: r.affectedRows };
    }
  };
}

async function initSqlite() {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(cfg.sqliteFile);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(fs.readFileSync(path.join(__dirname, '../../sql/schema.sqlite.sql'), 'utf8'));
  return {
    async query(sql, params = []) {
      const st = db.prepare(sql);
      if (/^\s*select/i.test(sql)) return st.all(...params).map((r) => ({ ...r }));
      const r = st.run(...params);
      return { insertId: Number(r.lastInsertRowid), affectedRows: Number(r.changes) };
    }
  };
}

async function init() {
  impl = cfg.dbClient === 'sqlite' ? await initSqlite() : await initMysql();
  return impl;
}

module.exports = { init, query: (...a) => impl.query(...a) };
