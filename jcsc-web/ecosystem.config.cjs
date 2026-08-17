const path = require("path");

module.exports = {
  apps: [
    {
      name: "jcsc-support-center",
      cwd: __dirname,
      script: path.join("node_modules", "next", "dist", "bin", "next"),
      args: "start -H 0.0.0.0 -p 3026",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 20,
      min_uptime: "10s",
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: 3026,
        NEXTAUTH_URL: "https://realsoftapps.com/Support_Center",
      },
      error_file: path.join(__dirname, "logs", "pm2-error.log"),
      out_file: path.join(__dirname, "logs", "pm2-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
