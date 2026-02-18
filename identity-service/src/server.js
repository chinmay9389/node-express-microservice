require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("./utils/logger");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const identityRoutes = require("./routes/identity-service");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const errorHandler = require("./middleware/errorHandler");
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info("MongoDB connected"))
  .catch((err) => logger.error("MongoDB connection error:", err));

const redisClient = new Redis(process.env.REDIS_URL);
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  logger.info("Body:", req.body);
  next();
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn("Rate limit exceeded for IP:", req.ip);
      res.status(429).json({ success: false, error: "Too many requests" });
    });
});

const sensitiveEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("Sensitive endpoint rate limit exceeded for IP:", req.ip);
    res.status(429).json({ success: false, error: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});
app.use("/api/auth/register", sensitiveEndpointLimiter);
app.use("/api/auth", identityRoutes);
app.use(errorHandler);
app.listen(process.env.PORT || 3001, () => {
  logger.info(`Identity Service running on port ${process.env.PORT || 3001}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});
