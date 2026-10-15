module.exports = {
  apps: [
    {
      name: 'edalat-api',
      cwd: '/var/www/edalat-filter/apps/api',
      script: 'dist/main.js',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'edalat-web',
      cwd: '/var/www/edalat-filter/apps/web',
      script: '/var/www/edalat-filter/node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3000',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'edalat-admin',
      cwd: '/var/www/edalat-filter/apps/admin',
      script: '/var/www/edalat-filter/node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3001',
      env: { NODE_ENV: 'production' },
    },
  ],
};
