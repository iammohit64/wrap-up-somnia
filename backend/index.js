import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import articleRoutes from './routes/articleRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import researchRoutes from './routes/researchRoutes.js';
import comparisonRoutes from './routes/comparisonRoutes.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

app.use(
  cors({
    origin: [
      'https://wrap-up-one.vercel.app',
      'http://localhost:5173',
      'https://wrap-up-evolved.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  }),
);

app.use(express.json());

app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/comparisons', comparisonRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    features: {
      aiResearch: true,
      linkCuration: true,
      blockchain: true,
      articleComparator: true,
    },
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Wrap-Up Backend v2.1 running on port ${PORT}`);
  console.log(`🔬 AI Research Engine: ENABLED`);
  console.log(`⚖️  Article Comparator: ENABLED`);
});
