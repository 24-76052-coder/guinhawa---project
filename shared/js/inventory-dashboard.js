/* ==========================================================================
   GUINHAWA — Inventory Staff dashboard
   ========================================================================== */

(function (window, document) {
  "use strict";

  var Store = window.GuinhawaStore;
  var UI = window.GuinhawaUI;
  if (!Store || !UI) return;

  var $ = function (id) {
    return document.getElementById(id);
  };

  var TYPE_VARIANTS = { in: "success", out: "warning" };

  function unit(product) {
    return Store.unitLabel(product.unit, product.qty);
  }

  /* ------------------------------- Greeting ------------------------------- */

  function renderGreeting() {
    var now = new Date();
    var hour = now.getHours();
    var greeting =
      hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    var user = Store.getCurrentUser();
    var firstName = String(user && user.name ? user.name : "there").split(" ")[0];

    if ($("invHeroGreeting")) {
      $("invHeroGreeting").textContent = greeting + ", " + firstName + ".";
    }
    if ($("invHeroDate")) {
      $("invHeroDate").textContent = now.toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  function renderClock() {
    var host = $("invHeroClockTime");
    if (!host) return;
    host.textContent = new Date().toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  function renderSummary() {
    var host = $("invHeroSummary");
    if (!host) return;

    var low = Store.lowStockProducts();
    var out = low.filter(function (product) {
      return product.qty <= 0;
    });
    var expiring = Store.expiringProducts(30);
    var parts = [];

    if (low.length) {
      var restock = low.length - out.length;
      if (out.length && restock) {
        parts.push(
          out.length +
            (out.length === 1 ? " product is" : " products are") +
            " out of stock, and " +
            restock +
            (restock === 1 ? " product is" : " products are") +
            " running low."
        );
      } else if (out.length) {
        parts.push(
          out.length +
            (out.length === 1 ? " product is" : " products are") +
            " out of stock."
        );
      } else {
        parts.push(
          restock + (restock === 1 ? " product is" : " products are") + " running low."
        );
      }
    } else {
      parts.push("All products are above their minimum stock level.");
    }

    if (expiring.length) {
      parts.push(
        expiring.length +
          (expiring.length === 1 ? " product expires" : " products expire") +
          " within the next 30 days."
      );
    } else {
      parts.push("Nothing is expiring in the next 30 days.");
    }

    host.textContent = parts.join(" ");
  }

  /* --------------------------------- Stats -------------------------------- */

  function renderStats() {
    var products = Store.data.products;
    var low = Store.lowStockProducts();
    var out = products.filter(function (product) {
      return Store.stockState(product).key === "out";
    });
    var available = products.filter(function (product) {
      return Number(product.qty) > 0;
    });
    var expiring = Store.expiringProducts(30);
    var categories = {};

    products.forEach(function (product) {
      categories[product.category] = true;
    });

    var onHand = products.reduce(function (sum, product) {
      return sum + (Number(product.qty) || 0);
    }, 0);

    if ($("invStatProducts")) {
      $("invStatProducts").textContent = Store.number(products.length);
    }
    if ($("invMetaProducts")) {
      $("invMetaProducts").textContent =
        "across " + Object.keys(categories).length + " categories";
    }
    if ($("invStatAvailable")) {
      $("invStatAvailable").textContent = Store.number(onHand);
    }
    if ($("invMetaAvailable")) {
      $("invMetaAvailable").textContent =
        "units across " + available.length + " products";
    }
    if ($("invStatLow")) {
      $("invStatLow").textContent = Store.number(low.length);
    }
    if ($("invMetaLow")) {
      $("invMetaLow").textContent = low.length ? "need restocking" : "all stocked up";
    }
    if ($("invStatOut")) {
      $("invStatOut").textContent = Store.number(out.length);
    }
    if ($("invMetaOut")) {
      $("invMetaOut").textContent = out.length ? "cannot be sold" : "none right now";
    }
    if ($("invStatExpiring")) {
      $("invStatExpiring").textContent = Store.number(expiring.length);
    }
    if ($("invMetaExpiring")) {
      $("invMetaExpiring").textContent = expiring.length
        ? "within the next 30 days"
        : "nothing due soon";
    }
    if ($("expiryCount")) {
      $("expiryCount").textContent =
        expiring.length + (expiring.length === 1 ? " item" : " items");
    }
    if ($("lowStockCount")) {
      $("lowStockCount").textContent =
        low.length + (low.length === 1 ? " alert" : " alerts");
    }

    // Keep the accessible summary meaningful for screen readers.
    if ($("invStatAvailable")) {
      $("invStatAvailable").setAttribute(
        "title",
        available.length + " products currently have stock on hand"
      );
    }
  }

  /* --------------------------- Recent activities -------------------------- */

  function renderRecentActivities() {
    var tbody = $("recentStockBody");
    if (!tbody) return;

    var rows = Store.data.history.slice(0, 8);

    if (!rows.length) {
      tbody.innerHTML = UI.emptyRow(
        6,
        "bi-clock-history",
        "No stock activity",
        "Stock in and stock out records will appear here."
      );
      return;
    }

    tbody.innerHTML = rows
      .map(function (row) {
        var typeLabel = row.type === "in" ? "Stock in" : "Stock out";
        var qtyPrefix = row.type === "in" ? "+" : "\u2212";
        return (
          "<tr>" +
          '<td class="text-nowrap">' +
          Store.formatDateTime(row.date) +
          "</td>" +
          '<td><span class="cell-strong">' +
          UI.escape(row.productName) +
          '</span><span class="cell-sub">' +
          UI.escape(row.sku) +
          "</span></td>" +
          "<td>" +
          UI.statusBadge(typeLabel, TYPE_VARIANTS[row.type] || "neutral") +
          "</td>" +
          '<td class="text-end qty text-nowrap">' +
          qtyPrefix +
          Store.number(row.qty) +
          " " +
          UI.escape(Store.unitLabel(row.unit, row.qty)) +
          "</td>" +
          '<td class="text-end qty text-nowrap">' +
          Store.number(row.after) +
          " " +
          UI.escape(Store.unitLabel(row.unit, row.after)) +
          "</td>" +
          "<td>" +
          UI.escape(row.user || "\u2014") +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  /* ------------------------------ Low stock ------------------------------- */

  function renderLowStock() {
    var host = $("invLowList");
    if (!host) return;

    var products = Store.lowStockProducts().slice(0, 4);

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
          Store.number(product.qty) +
          " " +
          UI.escape(unit(product)) +
          " left &middot; reorder at " +
          Store.number(product.minStock) +
          "</span>" +
          "</div>" +
          UI.statusBadge(state.label, state.badge) +
          "</div>"
        );
      })
      .join("") +
      '<a class="btn btn-outline-app w-100 mt-3" href="inventory.php?status=low">Review all low stock</a>';
  }

  /* --------------------------- Expiration watch --------------------------- */

  function renderExpiring() {
    var host = $("expiringList");
    if (!host) return;

    var products = Store.expiringProducts(30);

    if (!products.length) {
      host.innerHTML =
        '<div class="alert-app"><i class="bi bi-check2-circle"></i><div>No products are expiring within the next 30 days.</div></div>';
      return;
    }

    host.innerHTML = products
      .map(function (product) {
        var state = Store.expiryState(product);
        var days = state.days;
        var whenText =
          state.key === "expired"
            ? "expired " + Store.formatDate(product.expiry)
            : "expires " + Store.formatDate(product.expiry);

        return (
          '<div class="expiry-row">' +
          '<img src="' +
          Store.productImage(product) +
          '" alt="" width="34" height="34">' +
          '<div class="expiry-row__body">' +
          '<span class="expiry-row__name">' +
          UI.escape(product.name) +
          "</span>" +
          '<span class="expiry-row__meta" title="' +
          (state.key === "expired"
            ? "Expired " + Math.abs(days) + " days ago"
            : days === 0
              ? "Expires today"
              : "Expires in " + days + " days") +
          '">' +
          Store.number(product.qty) +
          " " +
          UI.escape(unit(product)) +
          " left &middot; " +
          UI.escape(whenText) +
          "</span>" +
          "</div>" +
          UI.statusBadge(state.label, state.badge) +
          "</div>"
        );
      })
      .join("");
  }

  /* ---------------------------- Category stock ---------------------------- */

  function renderCategories() {
    var host = $("categoryStock");
    if (!host) return;

    var groups = {};
    Store.data.products.forEach(function (product) {
      if (!groups[product.category]) {
        groups[product.category] = { label: product.category, value: 0, count: 0 };
      }
      groups[product.category].value += Number(product.qty) || 0;
      groups[product.category].count += 1;
    });

    var rows = Object.keys(groups)
      .map(function (key) {
        return groups[key];
      })
      .sort(function (a, b) {
        return b.value - a.value;
      });

    var total = rows.reduce(function (sum, row) {
      return sum + row.value;
    }, 0);

    host.innerHTML =
      '<div class="category-total">' +
      '<span class="text-app-muted">Total stock on hand</span>' +
      '<strong class="text-tabular">' +
      Store.number(total) +
      " units</strong>" +
      "</div>" +
      rows
        .map(function (row) {
          var pct = total ? Math.round((row.value / total) * 100) : 0;
          var width = row.value ? Math.max(2, pct) : 0;
          return (
            '<div class="category-row">' +
            '<div class="category-row__head">' +
            '<span class="category-row__name">' +
            UI.escape(row.label) +
            ' <span class="text-app-muted">&middot; ' +
            row.count +
            " products</span></span>" +
            '<span class="category-row__value"><strong class="text-tabular">' +
            Store.number(row.value) +
            '</strong> <span class="category-row__pct">' +
            pct +
            "%</span></span>" +
            "</div>" +
            '<div class="progress" role="progressbar" aria-label="' +
            UI.escape(row.label) +
            " stock share\" aria-valuenow=\"" +
            pct +
            '" aria-valuemin="0" aria-valuemax="100" style="height:8px">' +
            '<div class="progress-bar" style="width:' +
            width +
            '%"></div>' +
            "</div>" +
            "</div>"
          );
        })
        .join("");
  }

  /* --------------------------------- Init --------------------------------- */

  function init() {
    renderGreeting();
    renderClock();
    renderStats();
    renderSummary();
    renderRecentActivities();
    renderLowStock();
    renderExpiring();
    renderCategories();

    window.setInterval(renderClock, 1000);

    document.addEventListener("guinhawa:themechange", renderCategories);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
