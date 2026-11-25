require('dotenv').config();
const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-secret-change-me');
if (process.env.NODE_ENV === 'production' && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

module.exports = {
  port: +process.env.PORT || 4000,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  baseUrl: process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 4000}`,
  dbClient: process.env.DB_CLIENT || 'mysql',
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: +process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'suretrace'
  },
  sqliteFile: process.env.SQLITE_FILE || './suretrace.sqlite',
  insurerApi: {
    url: process.env.INSURER_API_URL || 'http://localhost:4001',
    key: process.env.INSURER_API_KEY || 'dev-insurer-key'
  }
};
