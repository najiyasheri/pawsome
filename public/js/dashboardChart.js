document.addEventListener("DOMContentLoaded", () => {
  // Get filter elements
  const dateFilter = document.getElementById("dateFilter");
  const customDateContainer = document.getElementById("customDateContainer");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const applyCustomFilterBtn = document.getElementById("applyCustomFilter");
  const downloadPDFBtn = document.getElementById("downloadPDF");
  const downloadExcelBtn = document.getElementById("downloadExcel");

  // Show/hide custom date range inputs
  dateFilter.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      customDateContainer.classList.remove("hidden");
      customDateContainer.classList.add("flex");
    } else {
      customDateContainer.classList.add("hidden");
      customDateContainer.classList.remove("flex");
      // Apply filter immediately for non-custom options
      applyFilter(e.target.value);
    }
  });

  // Apply custom date filter
  applyCustomFilterBtn.addEventListener("click", () => {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be before end date");
      return;
    }

    applyFilter("custom", startDate, endDate);
  });

  // Download PDF Report
  downloadPDFBtn.addEventListener("click", () => {
    generatePDFReport();
  });

  // Download Excel Report
  downloadExcelBtn.addEventListener("click", () => {
    generateExcelReport();
  });

  // Function to generate PDF report

  function generatePDFReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Get current filter info
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get("filter") || "daily";
    const startDate = urlParams.get("startDate") || "";
    const endDate = urlParams.get("endDate") || "";

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("Sales Report", 105, 20, { align: "center" });

    // Filter info
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(
      `Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}`,
      105,
      28,
      { align: "center" }
    );

    if (filter === "custom" && startDate && endDate) {
      doc.text(`Period: ${startDate} to ${endDate}`, 105, 33, {
        align: "center",
      });
    }

    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 38, {
      align: "center",
    });

    let yPosition = 50;

    // Summary Section
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("Summary", 14, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");

    // Extract values and replace ₹ with Rs.
    const totalOrders = document
      .querySelector("#totalOrders")
      .textContent.trim();
    const totalSales = document
      .querySelector("#totalSales")
      .textContent.replace("₹", "Rs. ")
      .trim();
    const totalDiscount = document
      .querySelector("#totalDisc")
      .textContent.replace("₹", "Rs. ")
      .trim();

    const summaryData = [
      ["Total Orders", totalOrders],
      ["Total Sales", totalSales],
      ["Total Discount", totalDiscount],
    ];

    doc.autoTable({
      startY: yPosition,
      head: [["Metric", "Value"]],
      body: summaryData,
      theme: "grid",
      headStyles: {
        fillColor: [234, 179, 8],
        fontSize: 10,
        fontStyle: "bold",
        textColor: [0, 0, 0],
      },
      styles: { fontSize: 10 },
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // Payment Methods Section
    if (paymentMethods && paymentMethods.length > 0) {
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Payment Method Breakdown", 14, yPosition);
      yPosition += 8;

      const paymentData = paymentMethods.map((pm) => [
        pm._id || "Unknown",
        `Rs. ${pm.totalSales.toLocaleString()}`,
        pm.count.toString(),
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [["Payment Method", "Total Sales", "Count"]],
        body: paymentData,
        theme: "grid",
        headStyles: {
          fillColor: [234, 179, 8],
          fontSize: 10,
          fontStyle: "bold",
          textColor: [0, 0, 0],
        },
        styles: { fontSize: 10 },
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Sales Report Section
    if (salesReport && salesReport.length > 0) {
      // Check if we need a new page
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Sales Report", 14, yPosition);
      yPosition += 8;

      const reportData = salesReport.map((r) => [
        r._id,
        r.ordersCount.toString(),
        `Rs. ${r.totalSales.toLocaleString()}`,
        `Rs. ${r.totalDiscount.toLocaleString()}`,
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [["Date", "Orders", "Total Sales", "Discount"]],
        body: reportData,
        theme: "grid",
        headStyles: {
          fillColor: [234, 179, 8],
          fontSize: 10,
          fontStyle: "bold",
          textColor: [0, 0, 0],
        },
        styles: { fontSize: 10 },
      });
    }

    // Save PDF
    const fileName = `sales-report-${filter}-${Date.now()}.pdf`;
    doc.save(fileName);
  }

  // Function to generate Excel report
  function generateExcelReport() {
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get("filter") || "daily";
    const startDate = urlParams.get("startDate") || "";
    const endDate = urlParams.get("endDate") || "";

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const totalOrders = document
      .querySelector("#totalOrders")
      .textContent.trim();
    const totalSales = document
      .querySelector("#totalSales")
      .textContent.replace("₹", "Rs. ")
      .trim();
    const totalDiscount = document
      .querySelector("#totalDisc")
      .textContent.replace("₹", "Rs. ")
      .trim();

    const summaryData = [
      ["Sales Report"],
      [""],
      ["Filter Type", filter.charAt(0).toUpperCase() + filter.slice(1)],
      filter === "custom" && startDate && endDate
        ? ["Date Range", `${startDate} to ${endDate}`]
        : ["Date Range", "As per filter"],
      ["Generated On", new Date().toLocaleString()],
      [""],
      ["Metric", "Value"],
      ["Total Orders", totalOrders],
      ["Total Sales", totalSales],
      ["Total Discount", totalDiscount],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Payment Methods Sheet
    if (paymentMethods && paymentMethods.length > 0) {
      const paymentData = [
        ["Payment Method", "Total Sales", "Count"],
        ...paymentMethods.map((pm) => [
          pm._id || "Unknown",
          `Rs. ${pm.totalSales.toLocaleString()}`,
          pm.count,
        ]),
      ];
      const paymentSheet = XLSX.utils.aoa_to_sheet(paymentData);
      XLSX.utils.book_append_sheet(wb, paymentSheet, "Payment Methods");
    }

    // Sales Report Sheet
    if (salesReport && salesReport.length > 0) {
      const reportData = [
        ["Date", "Orders", "Total Sales", "Discount"],
        ...salesReport.map((r) => [
          r._id,
          r.ordersCount,
          `Rs. ${r.totalSales.toLocaleString()}`,
          `Rs. ${r.totalDiscount.toLocaleString()}`,
        ]),
      ];
      const reportSheet = XLSX.utils.aoa_to_sheet(reportData);
      XLSX.utils.book_append_sheet(wb, reportSheet, "Sales Report");
    }

    // All Orders + Product Details Sheet
    if (allOrders && allOrders.length > 0) {
      const orderData = [
        [
          "Order ID",
          "Customer Name",
          "Email",
          "Payment Method",
         
          "Discount (₹)",

          "Final Amount (₹)",
          "Status",
          "Order Date",
        ],
      ];

      allOrders.forEach((order) => {
        if (order.orderItems && order.orderItems.length > 0) {
          order.orderItems.forEach((item) => {
            const productName = item.productName || item.name || "-";
            const price = item.price || 0;
            const qty = item.quantity || 1;

            orderData.push([
              order.orderId?.toString() || "-",
              order.userName || "-",
              order.email || "-",
              order.paymentMethod || "-",
              `₹${order.discountAmount?.toLocaleString() ?? 0}`,
              `₹${order.finalAmount?.toLocaleString() ?? 0}`,
              order.status || "-",
              new Date(order.createdAt).toLocaleString(),
            ]);
          });
        } else {
          // Orders with no products (rare)
          orderData.push([
            order.orderId?.toString() || "-",
            order.userName || "-",
            order.email || "-",
            order.paymentMethod || "-",
            `₹${order.discountAmount?.toLocaleString() ?? 0}`,
            `₹${order.finalAmount?.toLocaleString() ?? 0}`,
            order.status || "-",
            new Date(order.createdAt).toLocaleString(),
          ]);
        }
      });

      const orderSheet = XLSX.utils.aoa_to_sheet(orderData);
      XLSX.utils.book_append_sheet(wb, orderSheet, "All Orders + Products");
    }

    // Save Excel file
    const fileName = `sales-report-${filter}-${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // Function to apply filter and reload page
  function applyFilter(filterType, startDate = null, endDate = null) {
    const url = new URL(window.location.href);
    url.searchParams.set("filter", filterType);

    if (filterType === "custom" && startDate && endDate) {
      url.searchParams.set("startDate", startDate);
      url.searchParams.set("endDate", endDate);
    } else {
      url.searchParams.delete("startDate");
      url.searchParams.delete("endDate");
    }

    window.location.href = url.toString();
  }

  // Set current filter on page load
  const urlParams = new URLSearchParams(window.location.search);
  const currentFilter = urlParams.get("filter") || "daily";
  dateFilter.value = currentFilter;

  if (currentFilter === "custom") {
    customDateContainer.classList.remove("hidden");
    customDateContainer.classList.add("flex");
    const startDate = urlParams.get("startDate");
    const endDate = urlParams.get("endDate");
    if (startDate) startDateInput.value = startDate;
    if (endDate) endDateInput.value = endDate;
  }

  // Initialize Charts
  const salesTrendCtx = document
    .getElementById("salesTrendChart")
    .getContext("2d");
  const salesTrendData = {
    labels: salesTrends.length
      ? salesTrends.map((trend) => trend._id)
      : ["No Data"],
    datasets: [
      {
        label: "Total Sales (₹)",
        data: salesTrends.length
          ? salesTrends.map((trend) => trend.totalSales)
          : [0],
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  new Chart(salesTrendCtx, {
    type: "line",
    data: salesTrendData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Sales Trend" },
      },
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: Math.max(
            ...(salesTrends.length
              ? salesTrends.map((t) => t.totalSales)
              : [1000]),
            1000
          ),
          title: { display: true, text: "Sales (₹)" },
        },
        x: { title: { display: true, text: "Date" } },
      },
    },
  });

  const paymentMethodCtx = document
    .getElementById("paymentMethodChart")
    .getContext("2d");
  const paymentMethodData = {
    labels: paymentMethods.length
      ? paymentMethods.map((method) => method._id || "Unknown")
      : ["No Data"],
    datasets: [
      {
        label: "Sales by Payment Method (₹)",
        data: paymentMethods.length
          ? paymentMethods.map((method) => method.totalSales)
          : [0],
        backgroundColor: [
          "#10B981",
          "#3B82F6",
          "#EF4444",
          "#F59E0B",
          "#8B5CF6",
        ],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
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
