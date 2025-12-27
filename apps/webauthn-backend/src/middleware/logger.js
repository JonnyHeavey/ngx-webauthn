const logger = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;

  console.log(`[${new Date().toISOString()}] ${method} ${url} - ${ip}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${statusCode} (${duration}ms)`);
  });

  next();
};

module.exports = { logger };
