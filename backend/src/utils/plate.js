// Rwandan plates look like "RAD 123 A". We store them without spaces, uppercase.
const normalizePlate = (p) => String(p || '').replace(/[\s-]/g, '').toUpperCase();
const isValidPlate = (p) => /^R[A-Z]{2}\d{3}[A-Z]$/.test(normalizePlate(p));
const displayPlate = (p) => {
  const n = normalizePlate(p);
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
};
module.exports = { normalizePlate, isValidPlate, displayPlate };
