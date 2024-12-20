import * as XLSX from "xlsx";
import { ChatOllama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import fs from "fs/promises";
export const loadAndProcessExcel = async (filePath) => {
    try {
        console.log("Loading Excel File...");

        // Read the file as a buffer
        const fileBuffer = await fs.readFile(filePath);

        // Parse the workbook
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        console.log("Excel Document Loaded and Processed");

        return jsonData;
    } catch (error) {
        console.error("Error loading Excel file:", error);
        throw error;
    }
};
export const processDataForChart = async (data) => {
    try {
        // Process the data to extract relevant information for charting
        const columns = Object.keys(data[0]);
        const processedData = {
            labels: [],
            datasets: [],
        };

        // Extract labels (usually first column)
        processedData.labels = data.map((row) => row[columns[0]]);

        // Create datasets for each numerical column
        columns.slice(1).forEach((column) => {
            if (data.every((row) => typeof row[column] === "number")) {
                processedData.datasets.push({
                    label: column,
                    data: data.map((row) => row[column]),
                });
            }
        });

        console.log("Data Processed for Charting");
        return processedData;
    } catch (error) {
        console.error("Error processing data:", error);
        throw error;
    }
};

export const generateChartPrompt = async (processedData, question) => {
    console.log("Generating Chart Prompt");

    const prompt = PromptTemplate.fromTemplate(`
    You are a data visualization expert. Analyze the following data and answer the question strictly in JSON format only. Ensure the JSON is valid and does not contain any syntax errors, extra text, or comments.

If your response includes anything other than valid JSON, it will be rejected.

Data: {data}

Question: {question}

Provide your response in this exact valid JSON format only: 
{{ 
"recommendedChartType": "string (one of: bar, line, pie, scatter, area)",
  "chartConfiguration": {{ 
    "title": "string", 
    "xAxisLabel": "string", 
    "yAxisLabel": "string", 
    "colorScheme": "string", 
    "additionalOptions": {{}} 
  }}, 
"insights": "string (key observations about the data)", 
"explanation": "string (why this chart type was chosen)",
"datasets": [{{}}]
}}

    `);

    const formattedPrompt = await prompt.format({
        data: JSON.stringify(processedData, null, 2),
        question: question,
    });

    console.log("Chart Prompt Generated");
    return formattedPrompt;
};
export const generateChartRecommendation = async (prompt) => {
    console.log("Generating Chart Recommendation");

    const ollamaLlm = new ChatOllama({
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
    });

    const response = await ollamaLlm.invoke(prompt);
    console.log("Chart Recommendation Generated");

    try {
        console.log(response.content);

        const parsedResponse = JSON.parse(response.content);
        return parsedResponse;
    } catch (error) {
        console.error("Error parsing AI response:", error);
        throw new Error("Invalid response format from AI");
    }
};

export const generateFinalChartConfig = async (
    processedData,
    recommendation
) => {
    console.log("Generating Final Chart Configuration");

    const chartConfig = {
        type: recommendation.recommendedChartType,
        data: {
            labels: processedData.labels,
            datasets: processedData.datasets.map((dataset, index) => ({
                ...dataset,
                backgroundColor: getColor(index),
                borderColor: getColor(index),
                fill: recommendation.recommendedChartType === "area",
            })),
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: recommendation.chartConfiguration.title,
                },
                legend: {
                    position: "top",
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: recommendation.chartConfiguration.xAxisLabel,
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: recommendation.chartConfiguration.yAxisLabel,
                    },
                },
            },
            ...recommendation.chartConfiguration.additionalOptions,
        },
    };

    console.log("Final Chart Configuration Generated");
    return chartConfig;
};

const getColor = (index) => {
    const colors = [
        "#FF6384",
        "#36A2EB",
        "#FFCE56",
        "#4BC0C0",
        "#9966FF",
        "#FF9F40",
        "#FF6384",
        "#C9CBCF",
        "#36A2EB",
        "#4BC0C0",
    ];
    return colors[index % colors.length];
};
