/* ==========================================================================
   GUINHAWA — Dashboard
   ========================================================================== */

(function (window, document) {
  "use strict";

  var Store = window.GuinhawaStore;
  var Charts = window.GuinhawaCharts;
  var UI = window.GuinhawaUI;
  if (!Store || !Charts || !UI) return;

  var $ = function (id) {
    return document.getElementById(id);
  };

  var statusVariants = {
    Completed: "success",
    Pending: "warning",
    Refunded: "neutral",
    Void: "danger",
  };

  var salesView = {
    mode: "rolling",
    anchor: Store.todayISO(),
  };

  function isoDate(date) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  function parseISO(iso) {
    var d = new Date(String(iso || "").slice(0, 10) + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  function startOfWeek(iso) {
    var d = parseISO(iso) || new Date();
    var shift = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - shift);
    return isoDate(d);
  }

  function shiftISO(iso, days) {
    var d = parseISO(iso) || new Date();
    d.setDate(d.getDate() + days);
    return isoDate(d);
  }

  function salesRange() {
    if (salesView.mode === "week") {
      var start = startOfWeek(salesView.anchor);
      var end = shiftISO(start, 6);
      return { start: start, end: end, rows: Store.rangeSales(start, end) };
    }
    var rows = Store.weekSales(7);
    return {
      start: rows.length ? rows[0].date : Store.todayISO(),
      end: rows.length ? rows[rows.length - 1].date : Store.todayISO(),
      rows: rows,
    };
  }

  function renderGreeting() {
    var now = new Date();
    var hour = now.getHours();
    var greeting =
      hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    var firstName = (UI.user.name || "Admin").split(" ")[0];

    if ($("heroGreeting")) {
      $("heroGreeting").textContent = greeting + ", " + firstName + ".";
    }
    if ($("heroDate")) {
      $("heroDate").textContent = now.toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
  }

  function renderClock() {
    var host = $("heroClockTime");
    if (!host) return;
    host.textContent = new Date().toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  function renderSummary() {
    var host = $("heroSummary");
    if (!host) return;

    var low = Store.lowStockProducts();
    var outCount = low.filter(function (product) {
      return product.qty <= 0;
    }).length;
    var todaysTxns = Store.todayTransactions();
    var parts = [];

    if (todaysTxns.length) {
      parts.push(
        "You have made " +
          Store.money(Store.todaySales()) +
          " in sales today from " +
          todaysTxns.length +
          (todaysTxns.length === 1 ? " transaction." : " transactions.")
      );
    } else {
      parts.push("No sales have been recorded yet today.");
    }

    if (low.length) {
      parts.push(
        low.length +
          (low.length === 1 ? " product is" : " products are") +
          " running low" +
          (outCount ? " (" + outCount + " out of stock)" : "") +
          "."
      );
    } else {
      parts.push("All products are above their minimum stock level.");
    }

    host.textContent = parts.join(" ");
  }

  function trendHTML(value, suffix) {
    if (!isFinite(value)) {
      return '<span class="text-app-muted">' + suffix + "</span>";
    }
    var up = value >= 0;
    return (
      '<span class="trend ' +
      (up ? "trend--up" : "trend--down") +
      '"><i class="bi ' +
      (up ? "bi-arrow-up-right" : "bi-arrow-down-right") +
      '"></i>' +
      Math.abs(value).toFixed(1) +
      "%</span> " +
      '<span class="text-app-muted">' +
      suffix +
      "</span>"
    );
  }

  function renderStats() {
    var products = Store.data.products;
    var accounts = Store.data.accounts;
    var categories = {};
    products.forEach(function (product) {
      categories[product.category] = true;
    });

    $("statProducts").textContent = Store.number(products.length);
    $("metaProducts").innerHTML =
      Object.keys(categories).length +
      " categories &middot; " +
      products.filter(function (p) {
        return p.qty > 0;
      }).length +
      " in stock";

    $("statValue").textContent = Store.money(Store.inventoryValue());
    $("metaValue").innerHTML =
      '<span class="text-app-muted">At cost &middot; ' +
      Store.money(Store.retailValue()) +
      " if sold at retail</span>";

    var low = Store.lowStockProducts();
    var outCount = low.filter(function (p) {
      return p.qty <= 0;
    }).length;
    $("statLow").textContent = Store.number(low.length);
    $("metaLow").innerHTML =
      '<span class="text-app-muted">' +
      outCount +
      " out of stock &middot; " +
      (low.length - outCount) +
      " running low</span>";

    var today = Store.todaySales();
    var yesterday = Store.salesTotalBetween(
      Store.addDaysISO(-1),
      Store.addDaysISO(-1)
    );
    $("statSales").textContent = Store.money(today);
    if (yesterday > 0) {
      $("metaSales").innerHTML = trendHTML(
        ((today - yesterday) / yesterday) * 100,
        "vs yesterday"
      );
    } else {
      $("metaSales").innerHTML =
        '<span class="text-app-muted">No sales recorded yesterday</span>';
    }

    var activeAccounts = accounts.filter(function (account) {
      return account.status === "Active";
    });
    $("statStaff").textContent = Store.number(activeAccounts.length);
    $("metaStaff").innerHTML =
      '<span class="text-app-muted">' +
      activeAccounts.filter(function (a) {
        return a.role === "Admin";
      }).length +
      " admin &middot; " +
      activeAccounts.filter(function (a) {
        return a.role !== "Admin";
      }).length +
      " staff</span>";

    var todaysTxns = Store.todayTransactions();
    var completed = todaysTxns.filter(function (t) {
      return t.status === "Completed";
    }).length;
    $("statTxns").textContent = Store.number(todaysTxns.length);
    $("metaTxns").innerHTML =
      '<span class="text-app-muted">' +
      completed +
      " completed &middot; " +
      (todaysTxns.length - completed) +
      " pending</span>";

    renderSparklines(low);
  }

  function renderSparklines(low) {
    var week = Store.weekSales(7).map(function (row) {
      return row.value;
    });
    var txnCounts = Store.weekSales(7).map(function (row) {
      return Store.data.transactions.filter(function (t) {
        return t.date.slice(0, 10) === row.date;
      }).length;
    });

    if ($("sparkProducts")) {
      $("sparkProducts").innerHTML = Charts.sparkline(
        [7, 8, 8, 9, 9, 10, Store.data.products.length],
        { color: "var(--gq-emerald)" }
      );
    }
    if ($("sparkValue")) {
      $("sparkValue").innerHTML = Charts.sparkline(
        [55, 58, 56, 61, 63, 62, 67],
        { color: "var(--gq-blue)" }
      );
    }
    if ($("sparkLow")) {
      $("sparkLow").innerHTML = Charts.sparkline(
        [2, 3, 3, 4, 4, low.length, low.length],
        { color: "var(--gq-amber)" }
      );
    }
    if ($("sparkSales")) {
      $("sparkSales").innerHTML = Charts.sparkline(week, {
        color: "var(--gq-emerald)",
      });
    }
    if ($("sparkStaff")) {
      $("sparkStaff").innerHTML = Charts.sparkline(
        [4, 4, 5, 5, 5, 6, 6],
        { color: "var(--gq-violet)" }
      );
    }
    if ($("sparkTxns")) {
      $("sparkTxns").innerHTML = Charts.sparkline(txnCounts, {
        color: "var(--gq-rose)",
      });
    }
  }

  function renderCharts() {
    var range = salesRange();
    var week = range.rows;
    var total = week.reduce(function (sum, row) {
      return sum + row.value;
    }, 0);
    var dayCount = week.length || 7;

    if ($("weekTotal")) {
      $("weekTotal").textContent = Store.money(total);
    }
    if ($("weekSub")) {
      $("weekSub").textContent =
        salesView.mode === "week"
          ? "Completed sales \u00b7 " +
            Store.formatDate(range.start) +
            " \u2013 " +
            Store.formatDate(range.end)
          : "Completed sales for the last seven days";
    }
    if ($("weekAverage")) {
      $("weekAverage").textContent =
        "Daily average " + Store.money(total / dayCount);
    }
    if ($("weeklySalesChart")) {
      Charts.lineChart($("weeklySalesChart"), week, {
        currency: true,
        symbol: Store.data.settings.currency,
        height: 268,
        ariaLabel:
          salesView.mode === "week"
            ? "Weekly sales for " +
              Store.formatDate(range.start) +
              " to " +
              Store.formatDate(range.end)
            : "Weekly sales for the last seven days",
      });
    }

    var categories = {};
    Store.data.products.forEach(function (product) {
      if (!categories[product.category]) {
        categories[product.category] = { label: product.category, value: 0 };
      }
      categories[product.category].value += 1;
    });

    var rows = Object.keys(categories)
      .map(function (key) {
        return categories[key];
      })
      .sort(function (a, b) {
        return b.value - a.value;
      });

    var palette = Charts.palette;
    var segments = rows.map(function (row, index) {
      return {
        label: row.label,
        value: row.value,
        color: palette[index % palette.length],
        display: String(row.value),
      };
    });

    var totalProducts = segments.reduce(function (sum, row) {
      return sum + row.value;
    }, 0);

    if ($("inventoryDonut")) {
      Charts.donutChart($("inventoryDonut"), segments, {
        outsideLabels: true,
        centerLabel: "Products",
        centerValue: Store.number(totalProducts),
        ariaLabel: "Product count by category",
      });
    }
  }

  function renderTopProducts() {
    var host = $("topProductsList");
    if (!host) return;
    var products = Store.topProducts(30, 5);

    if (!products.length) {
      host.innerHTML =
        '<div class="empty-state"><div class="empty-state__icon"><i class="bi bi-trophy"></i></div><h6>No sales yet</h6><p>Top sellers will appear after sales are recorded.</p></div>';
      return;
    }

    host.innerHTML = products
      .map(function (row, index) {
        var product = Store.findProduct(row.productId);
        return (
          '<div class="rank-item">' +
          '<span class="rank-number">' +
          (index + 1) +
          "</span>" +
          '<img class="product-thumb" src="' +
          Store.productImage(product) +
          '" alt="" width="42" height="42">' +
          '<span class="rank-body">' +
          '<span class="rank-name">' +
          UI.escape(row.name) +
          "</span>" +
          '<span class="rank-meta">' +
          Store.number(row.qty) +
          " " +
          UI.escape(product ? product.unit : "units") +
          " sold</span>" +
          "</span>" +
          '<span class="rank-value">' +
          Store.money(row.revenue) +
          "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderRecentTransactions() {
    var tbody = $("recentTransactionsBody");
    if (!tbody) return;
    var rows = Store.data.transactions.slice(0, 5);

    if (!rows.length) {
      tbody.innerHTML = UI.emptyRow(
        5,
        "bi-receipt",
        "No transactions",
        "Sales recorded at the counter will appear here."
      );
      return;
    }

    tbody.innerHTML = rows
      .map(function (txn) {
        return (
          "<tr>" +
          "<td>" +
          '<a class="cell-strong" href="transactions.php?q=' +
          encodeURIComponent(txn.invoice) +
          '" style="color:var(--gq-text)">' +
          UI.escape(txn.invoice) +
          "</a>" +
          '<span class="cell-sub">' +
          Store.formatDateTime(txn.date) +
          "</span>" +
          "</td>" +
          '<td class="text-truncate" style="max-width:180px">' +
          UI.escape(txn.customer) +
          "</td>" +
          "<td>" +
          UI.escape(txn.cashier) +
          "</td>" +
          '<td class="text-end fw-650 text-tabular">' +
          Store.money(txn.total) +
          "</td>" +
          "<td>" +
          UI.statusBadge(
            txn.status,
            statusVariants[txn.status] || "neutral"
          ) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderLowStock() {
    var host = $("lowStockList");
    if (!host) return;
    var products = Store.lowStockProducts();

    if (!products.length) {
      host.innerHTML =
        '<div class="alert-app"><i class="bi bi-check2-circle"></i><div>All products are above their minimum stock levels. Nice work.</div></div>';
      return;
    }

    host.innerHTML = products
      .map(function (product) {
        var state = Store.stockState(product);
        return (
          '<div class="alert-row">' +
          '<img class="product-thumb" src="' +
          Store.productImage(product) +
          '" alt="" width="42" height="42">' +
          '<div class="alert-row__body">' +
          '<span class="alert-row__name">' +
          UI.escape(product.name) +
          "</span>" +
          '<span class="alert-row__meta">' +
          UI.escape(product.sku) +
          " &middot; " +
          Store.number(product.qty) +
          " " +
          UI.escape(product.unit) +
          " left &middot; min " +
          Store.number(product.minStock) +
          "</span>" +
          "</div>" +
          UI.statusBadge(state.label, state.badge) +
          '<a class="btn btn-icon btn-icon--success" href="stock-in.php?product=' +
          encodeURIComponent(product.id) +
          '" aria-label="Stock in ' +
          UI.escape(product.name) +
          '" title="Stock in"><i class="bi bi-plus-lg"></i></a>' +
          "</div>"
        );
      })
      .join("");
  }

  function syncSalesControls() {
    document.querySelectorAll("[data-sales-mode]").forEach(function (button) {
      var active = button.getAttribute("data-sales-mode") === salesView.mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    var nav = $("salesWeekNav");
    if (nav) nav.hidden = salesView.mode !== "week";

    var picker = $("salesWeekDate");
    if (picker) {
      picker.value = salesView.anchor;
      picker.max = Store.todayISO();
    }

    var next = $("salesNextWeek");
    if (next) {
      next.disabled =
        salesView.mode === "week" &&
        startOfWeek(salesView.anchor) >= startOfWeek(Store.todayISO());
    }
  }

  function bindSalesControls() {
    document.querySelectorAll("[data-sales-mode]").forEach(function (button) {
      button.addEventListener("click", function () {
        salesView.mode = button.getAttribute("data-sales-mode");
        if (salesView.mode === "week") {
          salesView.anchor = salesView.anchor || Store.todayISO();
        }
        syncSalesControls();
        renderCharts();
      });
    });

    var picker = $("salesWeekDate");
    if (picker) {
      picker.addEventListener("change", function (event) {
        if (!event.target.value) return;
        salesView.anchor = event.target.value;
        renderCharts();
      });
    }

    function shiftWeek(days) {
      salesView.mode = "week";
      salesView.anchor = shiftISO(salesView.anchor, days);
      syncSalesControls();
      renderCharts();
    }

    if ($("salesPrevWeek")) {
      $("salesPrevWeek").addEventListener("click", function () {
        shiftWeek(-7);
      });
    }
    if ($("salesNextWeek")) {
      $("salesNextWeek").addEventListener("click", function () {
        shiftWeek(7);
      });
    }
  }

  function init() {
    renderGreeting();
    renderClock();
    renderStats();
    renderSummary();
    bindSalesControls();
    syncSalesControls();
    renderCharts();
    renderTopProducts();
    renderRecentTransactions();
    renderLowStock();

    window.setInterval(renderClock, 1000);

    document.addEventListener("guinhawa:themechange", function () {
      renderCharts();
      renderStats();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
