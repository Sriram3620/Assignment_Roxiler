import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import "./styles.css"; // Import the CSS file
Chart.register(...registerables);

const App = () => {
  const [month, setMonth] = useState("March");
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [barChart, setBarChart] = useState([]);
  const [pieChart, setPieChart] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const perPage = 10;

  // Fetch data when month, page, or search changes
  useEffect(() => {
    fetchData();
  }, [month, page, search]);

  // Fetch all data (transactions, statistics, bar chart, pie chart)
  const fetchData = async () => {
    setLoading(true);
    try {
      const [transactionsRes, statisticsRes, barChartRes, pieChartRes] =
        await Promise.all([
          axios.get(`http://localhost:3001/api/transactions`, {
            params: { month, search, page, perPage },
          }),
          axios.get(`http://localhost:3001/api/statistics`, { params: { month } }),
          axios.get(`http://localhost:3001/api/bar-chart`, { params: { month } }),
          axios.get(`http://localhost:3001/api/pie-chart`, { params: { month } }),
        ]);

      setTransactions(transactionsRes.data.transactions);
      setTotal(transactionsRes.data.total);
      setStatistics(statisticsRes.data);
      setBarChart(barChartRes.data);
      setPieChart(pieChartRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="app-container">
      <h1>Roxiler Transactions Dashboard</h1>

      {/* Month Dropdown */}
      <div className="filter-container">
        <label>Select Month: </label>
        <select
          className="month-dropdown"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={new Date(2023, i).toLocaleString("default", { month: "long" })}>
              {new Date(2023, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
      </div>

      {/* Search Box */}
      <div className="search-container">
        <input
          type="text"
          className="search-box"
          placeholder="Search transactions"
          value={search}
          onChange={handleSearch}
        />
      </div>

      {/* Loading Spinner */}
      {loading && <div className="loading-spinner"></div>}

      {/* Transactions Table */}
      <h2>Transactions</h2>
      <table className="transactions-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Description</th>
            <th>Price</th>
            <th>Category</th>
            <th>Sold</th>
            <th>Image</th> {/* New Images column */}
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.id}>
              <td>{txn.id}</td>
              <td>{txn.title}</td>
              <td>{txn.description}</td>
              <td>{txn.price}</td>
              <td>{txn.category}</td>
              <td>{txn.sold ? "Yes" : "No"}</td>
              <td>
                <img
                  src={txn.image}
                  alt={txn.title}
                  className="product-image"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination-container">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          Previous
        </button>
        <span> Page {page} </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page * perPage >= total}
        >
          Next
        </button>
      </div>

      {/* Statistics */}
      <h2>Statistics</h2>
      <div className="statistics-container">
        <div className="statistics-box">
          <h3>Total Sale Amount</h3>
          <p>${statistics.totalSaleAmount || 0}</p>
        </div>
        <div className="statistics-box">
          <h3>Total Sold Items</h3>
          <p>{statistics.totalSoldItems || 0}</p>
        </div>
        <div className="statistics-box">
          <h3>Total Not Sold Items</h3>
          <p>{statistics.totalNotSoldItems || 0}</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="chart-container">
        <h2>Bar Chart</h2>
        <Bar
          data={{
            labels: barChart.map((item) => item.range),
            datasets: [
              {
                label: "Number of Items",
                data: barChart.map((item) => item.count),
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
              },
            ],
          }}
        />
      </div>

      {/* Pie Chart */}
      <div className="pie-chart-container ">
        <h2>Pie Chart</h2>
        <Pie
          data={{
            labels: pieChart.map((item) => item._id),
            datasets: [
              {
                label: "Number of Items",
                data: pieChart.map((item) => item.count),
                backgroundColor: [
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                  "#9966FF",
                  "#FF9F40",
                ],
              },
            ],
          }}
          options={{
            responsive: true, // Make the chart responsive
            maintainAspectRatio: true, // Respect the container's aspect ratio
          }}
        />
      </div>
    </div>
  );
};

export default App;