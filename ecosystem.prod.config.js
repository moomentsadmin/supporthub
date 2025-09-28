module.exports = {
  apps: [
    {
      name: 'supporthub',
      script: 'dist/server/index.js', // Use built files in production
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      
      // Production environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        // Trust proxy when behind nginx/load balancer
        TRUST_PROXY: '1'
      },
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Restart policy
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Memory management
      max_memory_restart: '500M',
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Process management
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // No file watching in production
      watch: false,
      
      // Cluster settings
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/supporthub.git',
      path: '/var/www/supporthub',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && npm run build && pm2 reload ecosystem.prod.config.js --env production',
      'pre-setup': 'mkdir -p /var/www/supporthub/logs'
    }
  }
};