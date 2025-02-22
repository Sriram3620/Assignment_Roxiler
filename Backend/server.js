const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://sriram_03:Osriram%4004&@cluster0.ec9nano.mongodb.net/roxiler";
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  id: Number,
  title: String,
  price: Number,
  description: String,
  category: String,
  image: String,
  sold: Boolean,
  dateOfSale: Date,
});

const Transaction = mongoose.model("Transaction", transactionSchema);

// Function to Initialize Database
const initializeDatabase = async () => {
  try {
    // Check if the database is already populated
    const count = await Transaction.countDocuments();
    if (count > 0) {
      console.log("Database is already initialized");
      return;
    }

    console.log("Fetching data from third-party API...");
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    console.log("Data fetched successfully:", response.data.length, "items");

    // Clear existing data
    console.log("Clearing existing data...");
    await Transaction.deleteMany({});
    console.log("Existing data cleared");

    // Insert new data
    console.log("Inserting data into MongoDB...");
    await Transaction.insertMany(response.data);
    console.log("Data inserted successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

// Automatically Initialize Database on Server Start
initializeDatabase();

// API to Manually Initialize Database
app.get("/api/initialize-database", async (req, res) => {
  try {
    await initializeDatabase();
    res.status(200).json({ message: "Database initialized successfully" });
  } catch (error) {
    console.error("Error initializing database:", error);
    res.status(500).json({ error: "Failed to initialize database" });
  }
});

// API to List Transactions with Search and Pagination
app.get("/api/transactions", async (req, res) => {
  const { month, search = "", page = 1, perPage = 10 } = req.query;

  try {
    const monthNumber = new Date(`2023-${month}-01`).getMonth() + 1;

    // Build the search query
    const query = {
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
      $or: [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
    };

    // Add price to the search query only if the search term is a valid number
    const searchAsNumber = parseFloat(search);
    if (!isNaN(searchAsNumber)) {
      query.$or.push({ price: searchAsNumber });
    }

    const transactions = await Transaction.find(query)
      .skip((page - 1) * perPage)
      .limit(perPage);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({ transactions, total });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// API for Statistics
app.get("/api/statistics", async (req, res) => {
  const { month } = req.query;

  try {
    const monthNumber = new Date(`2023-${month}-01`).getMonth() + 1;

    const totalSaleAmount = await Transaction.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
          sold: true,
        },
      },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);

    const totalSoldItems = await Transaction.countDocuments({
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
      sold: true,
    });

    const totalNotSoldItems = await Transaction.countDocuments({
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
      sold: false,
    });

    res.status(200).json({
      totalSaleAmount: totalSaleAmount[0]?.total || 0,
      totalSoldItems,
      totalNotSoldItems,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// API for Bar Chart
app.get("/api/bar-chart", async (req, res) => {
  const { month } = req.query;

  try {
    const monthNumber = new Date(`2023-${month}-01`).getMonth() + 1;

    const priceRanges = [
      { range: "0-100", min: 0, max: 100 },
      { range: "101-200", min: 101, max: 200 },
      { range: "201-300", min: 201, max: 300 },
      { range: "301-400", min: 301, max: 400 },
      { range: "401-500", min: 401, max: 500 },
      { range: "501-600", min: 501, max: 600 },
      { range: "601-700", min: 601, max: 700 },
      { range: "701-800", min: 701, max: 800 },
      { range: "801-900", min: 801, max: 900 },
      { range: "901-above", min: 901, max: Infinity },
    ];

    const barChartData = await Promise.all(
      priceRanges.map(async ({ range, min, max }) => {
        const count = await Transaction.countDocuments({
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
          price: { $gte: min, $lte: max },
        });
        return { range, count };
      })
    );

    res.status(200).json(barChartData);
  } catch (error) {
    console.error("Error fetching bar chart data:", error);
    res.status(500).json({ error: "Failed to fetch bar chart data" });
  }
});

// API for Pie Chart
app.get("/api/pie-chart", async (req, res) => {
  const { month } = req.query;

  try {
    const monthNumber = new Date(`2023-${month}-01`).getMonth() + 1;

    const pieChartData = await Transaction.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
        },
      },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    res.status(200).json(pieChartData);
  } catch (error) {
    console.error("Error fetching pie chart data:", error);
    res.status(500).json({ error: "Failed to fetch pie chart data" });
  }
});

// Combined API
app.get("/api/combined-data", async (req, res) => {
  const { month } = req.query;

  try {
    const [transactions, statistics, barChart, pieChart] = await Promise.all([
      axios.get(`http://localhost:${PORT}/api/transactions?month=${month}`),
      axios.get(`http://localhost:${PORT}/api/statistics?month=${month}`),
      axios.get(`http://localhost:${PORT}/api/bar-chart?month=${month}`),
      axios.get(`http://localhost:${PORT}/api/pie-chart?month=${month}`),
    ]);

    res.status(200).json({
      transactions: transactions.data,
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data,
    });
  } catch (error) {
    console.error("Error fetching combined data:", error);
    res.status(500).json({ error: "Failed to fetch combined data" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});