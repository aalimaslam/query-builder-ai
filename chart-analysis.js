import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
    loadAndProcessExcel,
    processDataForChart,
    generateChartPrompt,
    generateChartRecommendation,
    generateFinalChartConfig 
} from './ai.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /xlsx|xls/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (extname) {
            return cb(null, true);
        } else {
            cb('Error: Excel files only!');
        }
    }
});

router.post('/analyze', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const question = req.body.question;
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        
        const filePath = req.file.path;
        
        
        const processingSteps = [];
        
        try {
            
            processingSteps.push('Loading Excel file...');
            const rawData = await loadAndProcessExcel(filePath);
            
            
            processingSteps.push('Processing data for charting...');
            const processedData = await processDataForChart(rawData);
            
            
            processingSteps.push('Generating AI prompt...');
            const prompt = await generateChartPrompt(processedData, question);
            
            
            processingSteps.push('Getting AI recommendations...');
            const recommendation = await generateChartRecommendation(prompt);
            
            
            processingSteps.push('Generating final chart configuration...');
            const chartConfig = await generateFinalChartConfig(processedData, recommendation);

            
            fs.unlinkSync(filePath);
            
            return res.status(200).json({
                success: true,
                chartConfig,
                insights: recommendation.insights,
                explanation: recommendation.explanation,
                processingSteps
            });

        } catch (error) {
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            throw error;
        }

    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({
            error: 'Error processing request',
            message: error.message,
            
        });
    }
});


router.get('/status/:requestId', async (req, res) => {
    try {
        const requestId = req.params.requestId;
        
        res.status(200).json({
            requestId,
            status: 'completed',
            
        });
    } catch (error) {
        res.status(500).json({ error: 'Error checking status' });
    }
});


router.use((error, req, res, next) => {
    console.error('API Error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

export default router;