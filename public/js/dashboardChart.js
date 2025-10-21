document.addEventListener("DOMContentLoaded", () => {

  const salesTrendCtx = document.getElementById("salesTrendChart").getContext("2d");
  const salesTrendData = {
    labels: salesTrends.length ? salesTrends.map(trend => trend._id) : ["No Data"],
    datasets: [{
      label: "Total Sales (₹)",
      data: salesTrends.length ? salesTrends.map(trend => trend.totalSales) : [0],
      borderColor: "#10B981",
      backgroundColor: "rgba(16, 185, 129, 0.2)",
      fill: true,
      tension: 0.4,
    }],
  };

  new Chart(salesTrendCtx, {
    type: "line",
    data: salesTrendData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Sales Trend (Last 7 Days)" },
      },
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: Math.max(...salesTrends.map((t) => t.totalSales), 1000), 
          title: { display: true, text: "Sales (₹)" },
        },
        x: { title: { display: true, text: "Date" } },
      },
    },
  });


  const paymentMethodCtx = document.getElementById("paymentMethodChart").getContext("2d");
  const paymentMethodData = {
    labels: paymentMethods.length ? paymentMethods.map(method => method._id || "Unknown") : ["No Data"],
    datasets: [{
      label: "Sales by Payment Method (₹)",
      data: paymentMethods.length ? paymentMethods.map(method => method.totalSales) : [0],
      backgroundColor: [
        "#10B981", 
        "#3B82F6", 
        "#EF4444", 
        "#F59E0B", 
        "#8B5CF6", 
      ],
      borderColor: "#ffffff",
      borderWidth: 2,
    }],
  };

  new Chart(paymentMethodCtx, {
    type: "pie",
    data: paymentMethodData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Payment Method Breakdown" },
      },
    },
  });
});