import { Router } from 'express';
import { db } from './database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const ENTITY_TABLE_MAP = {
  Arena: 'arenas',
  Fight: 'fights',
  Bet: 'bets',
  Operator: 'operators',
  SystemConfig: 'system_configs',
  AuditLog: 'audit_logs',
  FightArchive: 'fight_archives',
};

const BOOLEAN_FIELDS = {
  fights: ['bayong_triggered', 'archived'],
  bets: ['claimed'],
  fight_archives: ['bayong_triggered'],
};

function toBooleanInt(table, field, value) {
  const boolFields = BOOLEAN_FIELDS[table] || [];
  if (boolFields.includes(field)) {
    if (value === true || value === 'true') return 1;
    if (value === false || value === 'false') return 0;
  }
  return value;
}

function fromBooleanInt(table, row) {
  if (!row) return row;
  const boolFields = BOOLEAN_FIELDS[table] || [];
  const result = { ...row };
  for (const field of boolFields) {
    if (field in result) {
      result[field] = result[field] === 1;
    }
  }
  return result;
}

function getTable(entityName) {
  return ENTITY_TABLE_MAP[entityName];
}

// List records: GET /api/:entity?sort=field&limit=N
router.get('/api/:entity', (req, res) => {
  const table = getTable(req.params.entity);
  if (!table) return res.status(404).json({ error: `Unknown entity: ${req.params.entity}` });

  let orderBy = 'created_date DESC';
  const { sort, limit } = req.query;

  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    orderBy = `${field} ${desc ? 'DESC' : 'ASC'}`;
  }

  let query = `SELECT * FROM ${table} ORDER BY ${orderBy}`;
  if (limit) {
    query += ` LIMIT ${parseInt(limit, 10)}`;
  }

  try {
    const rows = db.prepare(query).all();
    res.json(rows.map(r => fromBooleanInt(table, r)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single record: GET /api/:entity/:id
router.get('/api/:entity/:id', (req, res) => {
  const table = getTable(req.params.entity);
  if (!table) return res.status(404).json({ error: `Unknown entity: ${req.params.entity}` });

  try {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(fromBooleanInt(table, row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create record: POST /api/:entity
router.post('/api/:entity', (req, res) => {
  const table = getTable(req.params.entity);
  if (!table) return res.status(404).json({ error: `Unknown entity: ${req.params.entity}` });

  const id = uuidv4();
  const now = new Date().toISOString();
  const data = { ...req.body, id, created_date: now, updated_date: now };

  // Get the table columns
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);

  const fields = Object.keys(data).filter(k => columns.includes(k));
  const values = fields.map(f => toBooleanInt(table, f, data[f]));
  const placeholders = fields.map(() => '?').join(', ');

  try {
    db.prepare(`INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`).run(...values);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    res.status(201).json(fromBooleanInt(table, row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update record: PUT /api/:entity/:id
router.put('/api/:entity/:id', (req, res) => {
  const table = getTable(req.params.entity);
  if (!table) return res.status(404).json({ error: `Unknown entity: ${req.params.entity}` });

  const now = new Date().toISOString();
  const data = { ...req.body, updated_date: now };
  delete data.id;
  delete data.created_date;

  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  const fields = Object.keys(data).filter(k => columns.includes(k));

  if (fields.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => toBooleanInt(table, f, data[f]));

  try {
    const result = db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    res.json(fromBooleanInt(table, row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete record: DELETE /api/:entity/:id
router.delete('/api/:entity/:id', (req, res) => {
  const table = getTable(req.params.entity);
  if (!table) return res.status(404).json({ error: `Unknown entity: ${req.params.entity}` });

  try {
    const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Filter records: POST /api/:entity/filter
router.post('/api/:entity/filter', (req, res) => {
  const table = getTable(req.params.entity);
  if (!table) return res.status(404).json({ error: `Unknown entity: ${req.params.entity}` });

  const filters = req.body;
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  const fields = Object.keys(filters).filter(k => columns.includes(k));

  let query = `SELECT * FROM ${table}`;
  const values = [];

  if (fields.length > 0) {
    const conditions = fields.map(f => {
      values.push(toBooleanInt(table, f, filters[f]));
      return `${f} = ?`;
    });
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY created_date DESC';

  try {
    const rows = db.prepare(query).all(...values);
    res.json(rows.map(r => fromBooleanInt(table, r)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete: POST /api/:entity/bulk-delete
router.post('/api/:entity/bulk-delete', (req, res) => {
  const table = getTable(req.params.entity);
  if (!table) return res.status(404).json({ error: `Unknown entity: ${req.params.entity}` });

  try {
    const result = db.prepare(`DELETE FROM ${table}`).run();
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
