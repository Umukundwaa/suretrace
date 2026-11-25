const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const cfg = require('../src/config');
const insurerApi = require('../src/services/insuranceApiClient');
const { normalizePlate, displayPlate } = require('../src/utils/plate');

const password = 'Demo1234';
const demoSellers = [
  { national_id: '1199880012345678', full_name: 'Ange Umukundwa', phone: '0788000000', plates: ['RAD 123 A', 'RAC 902 B'] },
  { national_id: '1198570098765432', full_name: 'Jean Claude Habimana', phone: '0788000001', plates: ['RAB 555 C'] },
  { national_id: '1199270055511122', full_name: 'Grace Mukamana', phone: '0788000002', plates: ['RAE 310 D'] }
];

async function seedDemo() {
  if (cfg.dbClient !== 'sqlite') throw new Error('Demo seeding is restricted to SQLite. Set DB_CLIENT=sqlite in backend/.env.');
  if (process.env.DEMO_MODE === 'false') throw new Error('Demo seeding is disabled when DEMO_MODE=false.');
  await db.init();

  const registryVehicles = new Map();
  for (const seller of demoSellers) {
    for (const plate of seller.plates) {
      const vehicle = await insurerApi.fetchVehicle(plate);
      if (!vehicle) throw new Error(`Mock registry has no vehicle ${plate}.`);
      if (vehicle.owner_national_id !== seller.national_id) throw new Error(`${plate} is not registered to ${seller.national_id}.`);
      registryVehicles.set(normalizePlate(plate), vehicle);
    }
  }

  const sellersByNationalId = new Map();
  for (const seller of demoSellers) {
    const rows = await db.query('SELECT id FROM sellers WHERE national_id = ?', [seller.national_id]);
    sellersByNationalId.set(seller.national_id, rows[0] || null);
  }
  for (const seller of demoSellers) {
    const existingSeller = sellersByNationalId.get(seller.national_id);
    for (const plate of seller.plates) {
      const rows = await db.query('SELECT seller_id FROM vehicles WHERE plate = ?', [normalizePlate(plate)]);
      if (rows.length && (!existingSeller || String(rows[0].seller_id) !== String(existingSeller.id))) {
        throw new Error(`${plate} is already assigned to another seller; no demo data was changed.`);
      }
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const sellerIds = new Map();
  for (const seller of demoSellers) {
    const existing = sellersByNationalId.get(seller.national_id);
    if (existing) {
      await db.query('UPDATE sellers SET full_name = ?, phone = ?, password_hash = ? WHERE id = ?',
        [seller.full_name, seller.phone, passwordHash, existing.id]);
      sellerIds.set(seller.national_id, existing.id);
    } else {
      const result = await db.query('INSERT INTO sellers (national_id, full_name, phone, password_hash) VALUES (?,?,?,?)',
        [seller.national_id, seller.full_name, seller.phone, passwordHash]);
      sellerIds.set(seller.national_id, result.insertId);
    }
  }

  for (const seller of demoSellers) {
    const sellerId = sellerIds.get(seller.national_id);
    for (const plate of seller.plates) {
      const normalizedPlate = normalizePlate(plate);
      const existing = await db.query('SELECT id FROM vehicles WHERE plate = ?', [normalizedPlate]);
      if (existing.length) continue;
      const vehicle = registryVehicles.get(normalizedPlate);
      await db.query(
        'INSERT INTO vehicles (plate, plate_display, make, model, year, chassis, vehicle_class, seller_id) VALUES (?,?,?,?,?,?,?,?)',
        [normalizedPlate, displayPlate(normalizedPlate), vehicle.make, vehicle.model, vehicle.year, vehicle.chassis, vehicle.vehicle_class, sellerId]
      );
    }
  }

  console.log('Demo seller accounts are ready:');
  for (const seller of demoSellers) {
    console.log(`  ${seller.full_name} | ID ${seller.national_id} | vehicles: ${seller.plates.join(', ')}`);
  }
  console.log(`Password for all demo accounts: ${password}`);
}

seedDemo().catch((error) => {
  console.error('Demo seed failed:', error.message);
  process.exitCode = 1;
});
