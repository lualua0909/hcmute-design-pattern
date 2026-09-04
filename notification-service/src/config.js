import dotenv from 'dotenv';
dotenv.config();

const bool = (v, d = false) => (v === undefined ? d : String(v).toLowerCase() === 'true');

export const config = {
  port: Number(process.env.PORT || 7000),
  serviceName: process.env.SERVICE_NAME || 'notification-service',
  mysql: {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: bool(process.env.MYSQL_SSL, true),
  },
  rabbit: {
    url: process.env.RABBITMQ_URL,
    exchange: process.env.RABBITMQ_EXCHANGE || 'pokeshop.events',
    queue: process.env.RABBITMQ_QUEUE || 'notification.events',
  },
  firebase: {
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
  },
  requiredSteps: (process.env.REQUIRED_STEPS || 'inventory,analytics,inventory-commit')
    .split(',').map((s) => s.trim()).filter(Boolean),
};
