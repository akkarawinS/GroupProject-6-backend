import express from 'express';
import { connectDB } from './config/mongodb.js'
import { router as userRouter} from './routes/users.routes.js'


const app = express();

app.use(express.json());

connectDB();

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

app.use('/', userRouter);



app.listen(process.env.PORT, ()=>{
    console.log(`Server is running on PORT ${process.env.PORT}`);
})