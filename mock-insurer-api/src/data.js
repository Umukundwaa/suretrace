// Simulated registry data. Structure mirrors ASSAR's harmonized motor certificate
// (class colour, serial no., policy no., cover type, period, persons entitled to drive).
// Swap this service for a real insurer/ASSAR API later: SureTrace only depends on the
// response shape documented in README.md.

const INSURERS = [
  { code: 'SONARWA', name: 'SONARWA General Insurance Co. Ltd', prefix: 'SNR' },
  { code: 'SORAS',   name: 'SORAS Assurances Générales',        prefix: 'SRS' },
  { code: 'RADIANT', name: 'Radiant Insurance Company',         prefix: 'RAD' },
  { code: 'BKGEN',   name: 'BK General Insurance',              prefix: 'BKG' },
  { code: 'BRITAM',  name: 'Britam Insurance Rwanda',           prefix: 'BRT' },
  { code: 'OLDMUT',  name: 'Old Mutual Rwanda',                 prefix: 'OMR' },
  { code: 'MAYFAIR', name: 'Mayfair Insurance Rwanda',          prefix: 'MAY' },
  { code: 'SANLAM',  name: 'Sanlam Allianz Rwanda',             prefix: 'SAL' },
  { code: 'CORAR',   name: 'CORAR',                             prefix: 'COR' }
];

// owner_national_id is what the RRA vehicle register would hold; SureTrace uses it to
// verify that a seller really owns the plate they claim.
const VEHICLES = {
  RAD123A: { plate: 'RAD 123 A', make: 'Toyota', model: 'RAV4', year: 2018, chassis: 'JTMBD33V8J5A09218', vehicle_class: 'private', owner_name: 'Ange Umukundwa', owner_national_id: '1199880012345678' },
  RAC902B: { plate: 'RAC 902 B', make: 'Honda', model: 'CR-V', year: 2015, chassis: 'JHLRM4H5XFC031742', vehicle_class: 'private', owner_name: 'Ange Umukundwa', owner_national_id: '1199880012345678' },
  RAB555C: { plate: 'RAB 555 C', make: 'Toyota', model: 'Hiace', year: 2016, chassis: 'JTFSS22P8G0182204', vehicle_class: 'psv', owner_name: 'Jean Claude Habimana', owner_national_id: '1198570098765432' },
  RAF777E: { plate: 'RAF 777 E', make: 'Nissan', model: 'X-Trail', year: 2019, chassis: 'JN1TBNT32Z0450913', vehicle_class: 'private', owner_name: 'Eric Niyonsenga', owner_national_id: '1199680044433322' },
  RAE310D: { plate: 'RAE 310 D', make: 'Suzuki', model: 'Swift', year: 2020, chassis: 'MA3NZC72S00A41159', vehicle_class: 'private', owner_name: 'Grace Mukamana', owner_national_id: '1199270055511122' }
};

const DRIVERS = 'Any person driving on the policyholder\'s order or with their permission, provided they hold a valid driving licence.';

// Demo "current" policies are dated relative to today so the demo plates stay Active.
const rel = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function cert(insurerCode, plate, n, cover, start, end, extra = {}) {
  const ins = INSURERS.find((i) => i.code === insurerCode);
  const v = VEHICLES[plate];
  return {
    certificate_no: `${ins.prefix}-CI-${n}`,
    policy_no: `${ins.prefix}-${start.slice(0, 4)}-${String(n).slice(-5)}`,
    insurer_code: ins.code,
    insurer_name: ins.name,
    plate: v.plate,
    chassis: v.chassis,
    make: v.make,
    model: v.model,
    policyholder: v.owner_name,
    certificate_class: v.vehicle_class,      // private=yellow, commercial=blue, psv=red
    cover_type: cover,                        // 'Third party' | 'Comprehensive'
    start_date: start,
    end_date: end,
    persons_entitled: DRIVERS,
    premium_rwf: extra.premium_rwf ?? null,
    cancelled: !!extra.cancelled
  };
}

const CERTIFICATES = [
  // RAD 123 A — Toyota RAV4: SORAS 2021-2022 → SORAS 2023-2025 → SONARWA current
  cert('SORAS',   'RAD123A', 70112, 'Third party',    '2021-02-14', '2022-02-13', { premium_rwf: 98000 }),
  cert('SORAS',   'RAD123A', 11034, 'Third party',    '2023-02-14', '2025-02-13', { premium_rwf: 104000 }),
  cert('SONARWA', 'RAD123A', 204821, 'Comprehensive', rel(-290), rel(74), { premium_rwf: 412000 }),
  // RAC 902 B — Honda CR-V: Radiant then SONARWA, now lapsed
  cert('RADIANT', 'RAC902B', 33871, 'Third party',    '2022-03-02', '2023-03-01', { premium_rwf: 96000 }),
  cert('SONARWA', 'RAC902B', 118305, 'Comprehensive', '2024-01-12', '2025-01-11', { premium_rwf: 365000 }),
  // RAB 555 C — Hiace (PSV): BK General, Britam, Old Mutual (current)
  cert('BKGEN',   'RAB555C', 40021, 'Third party',    '2023-06-01', '2024-05-31', { premium_rwf: 210000 }),
  cert('BRITAM',  'RAB555C', 55190, 'Third party',    '2024-06-01', '2025-05-31', { premium_rwf: 225000 }),
  cert('OLDMUT',  'RAB555C', 90417, 'Comprehensive',  rel(-150), rel(214), { premium_rwf: 540000 }),
  // RAF 777 E — X-Trail (owner NOT pre-registered in the app, so graders can test sign-up): Britam, then Mayfair (current)
  cert('BRITAM',  'RAF777E', 61204, 'Third party',    '2024-03-01', '2025-02-28', { premium_rwf: 118000 }),
  cert('MAYFAIR', 'RAF777E', 77310, 'Comprehensive',  rel(-120), rel(245), { premium_rwf: 389000 }),
  // RAE 310 D — Swift: never insured (no record anywhere)
];

module.exports = { INSURERS, VEHICLES, CERTIFICATES };
