module.exports = {
  apps: [
    {
      name: "buraaq-times",
      cwd: "/var/www/buraaq-times",
      script: "npm",
      args: "run dev -- -p 9000 -H 0.0.0.0",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
