
import express from 'express';
import cors from 'cors';
import chartAnalysisRouter from './chart-analysis.js';

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/chart-analysis', chartAnalysisRouter);


app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;