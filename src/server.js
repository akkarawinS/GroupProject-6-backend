import express from 'express';
import cookieParser from 'cookie-parser'
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';

import { connectDB } from './config/mongodb.js'
import { router as apiRouter } from './routes/index.js'
import { limiter } from './middlewares/ratelimit.middleware.js';
import { setupSocket } from './sockets/index.js';

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN_URL
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];

const isProduction = process.env.NODE_ENV === 'production';

const isAllowedDevOrigin = (origin) => {
  if (isProduction || !origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isAllowedDevOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
};

const server = http.createServer(app);

setupSocket(server, allowedOrigins);

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(limiter);

connectDB();

app.use('/api', apiRouter);

//Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const errorResponse = {
    success: false,
    message: err.message || "Internal Server Error!",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  };

  if (!isProduction) {
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});




server.listen(process.env.PORT, () => {
  console.log(`Server is running on PORT ${process.env.PORT}`);
})
