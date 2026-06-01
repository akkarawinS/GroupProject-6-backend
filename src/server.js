import express from 'express';
import cookieParser from 'cookie-parser'
import cors from 'cors';
import helmet from 'helmet';

import { connectDB } from './config/mongodb.js'
import { router as userRouter } from './routes/users.routes.js'
import { router as trackRouter } from './routes/tracks.routes.js'
import { router as adminRouter } from './routes/admin.routes.js'
import { limiter } from './middlewares/ratelimit.middleware.js';


const app = express();

const allowedOrigins = process.env.CORS_ORIGIN_URL
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];

const corsOptions = { origin: allowedOrigins, credentials: true };

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(limiter);

connectDB();


app.use('/', userRouter);
app.use('/', trackRouter);
app.use('/', adminRouter);

//Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error!",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    stack: err.stack,
  });
});




app.listen(process.env.PORT, () => {
  console.log(`Server is running on PORT ${process.env.PORT}`);
})
