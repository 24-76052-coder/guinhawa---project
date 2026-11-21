/* ==========================================================================
   GUINHAWA — Cashier dashboard / point of sale
   ========================================================================== */

(function (window, document) {
  "use strict";

  var Store = window.GuinhawaStore;
  var UI = window.GuinhawaUI;
  if (!Store || !UI) return;

  var $ = function (id) {
    return document.getElementById(id);
  };

  var state = {
    search: "",
    category: "",
    cart: [],
  };

  var weightProductId = null;
  var lastSale = null;
  var lastCartCount = 0;

  /* ------------------------------- Helpers -------------------------------- */

  function user() {
    return Store.getCurrentUser();
  }

  function unitLabel(product, qty) {
    return Store.unitLabel(product.unit, qty == null ? product.qty : qty);
  }

  function round(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function stepFor(product) {
    return product.sellByWeight ? 0.5 : 1;
  }

  function cartLine(productId) {
    for (var i = 0; i < state.cart.length; i++) {
      if (state.cart[i].productId === productId) return state.cart[i];
    }
    return null;
  }

  function cartQty(productId) {
    var line = cartLine(productId);
    return line ? line.qty : 0;
  }

  function subtotal() {
    return state.cart.reduce(function (sum, line) {
      var product = Store.findProduct(line.productId);
      return sum + (product ? line.qty * Number(product.price) : 0);
    }, 0);
  }

  function discountValue() {
    var input = $("posDiscount");
    var value = input ? Number(input.value) : 0;
    if (!isFinite(value) || value < 0) value = 0;
    return Math.min(round(value), subtotal());
  }

  function total() {
    return Math.max(0, round(subtotal() - discountValue()));
  }

  function paymentMethod() {
    return $("posPayment") ? $("posPayment").value : "Cash";
  }

  function syncChoiceGroup(groupId, value) {
    var group = $(groupId);
    if (!group) return;
    var buttons = group.querySelectorAll("[data-value]");
    Array.prototype.forEach.call(buttons, function (button) {
      var active = button.getAttribute("data-value") === value;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-checked", active ? "true" : "false");
    });
  }

  function bindChoiceGroup(groupId, hiddenId, onChange) {
    var group = $(groupId);
    var hidden = $(hiddenId);
    if (!group || !hidden) return;

    var buttons = group.querySelectorAll("[data-value]");

    function choose(value) {
      hidden.value = value;
      syncChoiceGroup(groupId, value);
      if (onChange) onChange(value);
    }

    group.addEventListener("click", function (event) {
      var button = event.target.closest("[data-value]");
      if (!button) return;
      choose(button.getAttribute("data-value"));
    });

    group.addEventListener("keydown", function (event) {
      var keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
      if (keys.indexOf(event.key) === -1) return;
      event.preventDefault();

      var current = hidden.value;
      var index = 0;
      for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].getAttribute("data-value") === current) {
          index = i;
          break;
        }
      }
      var direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      var next = buttons[(index + direction + buttons.length) % buttons.length];
      choose(next.getAttribute("data-value"));
      next.focus();
    });
  }

  function cashReceived() {
    var input = $("posCash");
    return input ? Number(input.value) || 0 : 0;
  }

  /* ------------------------------- Catalog -------------------------------- */

  function categories() {
    var seen = {};
    Store.data.products.forEach(function (product) {
      seen[product.category] = true;
    });
    return Object.keys(seen).sort();
  }

  function renderCategories() {
    var host = $("posCategories");
    if (!host) return;

    var html =
      '<button class="pos-cat' +
      (state.category === "" ? " active" : "") +
      '" type="button" data-category="">All products</button>';

    html += categories()
      .map(function (category) {
        return (
          '<button class="pos-cat' +
          (state.category === category ? " active" : "") +
          '" type="button" data-category="' +
          UI.escape(category) +
          '">' +
          UI.escape(category) +
          "</button>"
        );
      })
      .join("");

    host.innerHTML = html;
  }

  function filteredProducts() {
    var query = state.search.trim().toLowerCase();
    return Store.data.products.filter(function (product) {
      if (product.status && product.status !== "Active") return false;
      if (state.category && product.category !== state.category) return false;
      if (!query) return true;
      return (
        (product.name + " " + product.sku + " " + product.category)
          .toLowerCase()
          .indexOf(query) > -1
      );
    });
  }

  function stockLine(product) {
    var available = Number(product.qty) || 0;
    return (
      Store.number(available) +
      " " +
      unitLabel(product) +
      " available"
    );
  }

  function renderProducts() {
    var host = $("posGrid");
    if (!host) return;

    var products = filteredProducts();

    if ($("posCount")) {
      $("posCount").textContent =
        products.length + (products.length === 1 ? " product" : " products");
    }

    if (!products.length) {
      host.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state__icon"><i class="bi bi-search"></i></div><h6>No products found</h6><p>Try a different search term or category.</p></div>';
      return;
    }

    host.innerHTML = products
      .map(function (product) {
        var out = Number(product.qty) <= 0;
        var priceLabel = product.sellByWeight
          ? Store.money(product.price) +
            ' <small>/ ' +
            UI.escape(unitLabel(product, 1)) +
            "</small>"
          : Store.money(product.price);
        return (
          '<button class="pos-product' +
          (out ? " is-disabled" : "") +
          '" type="button" data-product-id="' +
          UI.escape(product.id) +
          '"' +
          (out ? ' disabled aria-disabled="true"' : "") +
          ">" +
          '<span class="pos-product__add"><i class="bi ' +
          (product.sellByWeight ? "bi-basket" : "bi-plus-lg") +
          '" aria-hidden="true"></i></span>' +
          '<span class="pos-product__img"><img src="' +
          Store.productImage(product) +
          '" alt="" width="62" height="62"></span>' +
          '<span class="pos-product__body">' +
          '<span class="pos-product__cat">' +
          UI.escape(product.category) +
          "</span>" +
          '<span class="pos-product__name">' +
          UI.escape(product.name) +
          "</span>" +
          '<span class="pos-product__price">' +
          priceLabel +
          "</span>" +
          '<span class="pos-product__stock">' +
          UI.escape(stockLine(product)) +
          "</span>" +
          "</span>" +
          "</button>"
        );
      })
      .join("");
  }

  /* --------------------------------- Cart --------------------------------- */

  function renderCart() {
    var host = $("posCartItems");
    if (!host) return;

    if (!state.cart.length) {
      host.innerHTML =
        '<div class="pos-cart__empty">' +
        '<span class="pos-cart__empty-icon"><i class="bi bi-basket2" aria-hidden="true"></i></span>' +
        '<strong>Your cart is empty</strong>' +
        '<span>Tap a product from the catalog to start a sale.</span>' +
        "</div>";
    } else {
      host.innerHTML = state.cart
        .map(function (line) {
          var product = Store.findProduct(line.productId);
          if (!product) return "";
          var step = stepFor(product);
          var inputStep = product.sellByWeight ? "0.1" : "1";
          return (
            '<div class="cart-line" data-line="' +
            UI.escape(product.id) +
            '">' +
            '<img src="' +
            Store.productImage(product) +
            '" alt="" width="38" height="38">' +
            '<span class="min-w-0">' +
            '<span class="cart-line__name">' +
            UI.escape(product.name) +
            "</span>" +
            '<span class="cart-line__meta">' +
            Store.money(product.price) +
            " / " +
            UI.escape(unitLabel(product, 1)) +
            "</span>" +
            "</span>" +
            '<span class="cart-line__qty">' +
            '<button type="button" data-cart="dec" data-step="' +
            step +
            '" aria-label="Decrease quantity">&minus;</button>' +
            '<input type="number" min="' +
            (product.sellByWeight ? "0.1" : "1") +
            '" step="' +
            inputStep +
            '" value="' +
            line.qty +
            '" data-cart="input" aria-label="Quantity for ' +
            UI.escape(product.name) +
            '">' +
            '<button type="button" data-cart="inc" data-step="' +
            step +
            '" aria-label="Increase quantity">+</button>' +
            "</span>" +
            '<span class="cart-line__total text-tabular">' +
            Store.money(line.qty * Number(product.price)) +
            "</span>" +
            '<button class="cart-line__remove" type="button" data-cart="remove" aria-label="Remove ' +
            UI.escape(product.name) +
            '" title="Remove"><i class="bi bi-x-lg" aria-hidden="true"></i></button>' +
            "</div>"
          );
        })
        .join("");
    }

    if ($("posCartCount")) {
      var count = state.cart.length;
      $("posCartCount").textContent =
        count + (count === 1 ? " item" : " items");
    }

    renderSummary();
  }

  function renderSummary() {
    var subtotalValue = subtotal();
    var totalValue = total();

    if ($("posSubtotal")) $("posSubtotal").textContent = Store.money(subtotalValue);
    if ($("posTotal")) $("posTotal").textContent = Store.money(totalValue);
    if ($("posCheckoutTotal")) $("posCheckoutTotal").textContent = Store.money(totalValue);

    renderChange();

    if ($("posCheckout")) {
      $("posCheckout").disabled = state.cart.length === 0;
    }
    if ($("posClearCart")) {
      $("posClearCart").disabled = state.cart.length === 0;
    }

    var itemCount = state.cart.length;
    if ($("posMobileCount")) $("posMobileCount").textContent = String(itemCount);
    if ($("posMobileTotal")) $("posMobileTotal").textContent = Store.money(totalValue);
    if ($("posMobileLabel")) {
      $("posMobileLabel").textContent = itemCount
        ? itemCount + (itemCount === 1 ? " item in cart" : " items in cart")
        : "Cart is empty";
    }
    if ($("posMobileJump")) {
      $("posMobileJump").disabled = itemCount === 0;
    }
    if ($("posMobileBar")) {
      var bar = $("posMobileBar");
      bar.classList.toggle("is-visible", itemCount > 0);
      document.body.classList.toggle("pos-has-mobile-cart", itemCount > 0);
      if (itemCount > lastCartCount) {
        bar.classList.remove("is-bump");
        void bar.offsetWidth;
        bar.classList.add("is-bump");
      }
    }
    lastCartCount = itemCount;
  }

  function renderChange() {
    var cashRow = $("posCashRow");
    var changeBox = $("posChange");
    var changeValue = $("posChangeValue");
    var gcashNote = $("posGcashNote");
    if (!changeBox || !changeValue) return;

    var isCash = paymentMethod() === "Cash";
    if (cashRow) cashRow.classList.toggle("d-none", !isCash);
    if (gcashNote) gcashNote.classList.toggle("d-none", isCash);

    if (!isCash) {
      changeBox.classList.remove("is-short");
      changeValue.textContent = "\u2014";
      return;
    }

    var change = round(cashReceived() - total());
    changeBox.classList.toggle("is-short", change < 0);
    changeValue.textContent = Store.money(Math.max(0, change));
  }

  function setCartQty(productId, qty) {
    var product = Store.findProduct(productId);
    var line = cartLine(productId);
    if (!product || !line) return;

    var max = Number(product.qty) || 0;
    var minimum = product.sellByWeight ? 0.1 : 1;
    var next = product.sellByWeight ? round(qty) : Math.floor(qty);

    if (next <= 0) {
      removeLine(productId);
      return;
    }

    if (next > max) {
      next = max;
      UI.toast(
        "Only " +
          Store.number(max) +
          " " +
          unitLabel(product, max) +
          " of " +
          product.name +
          " is available.",
        { type: "warning", title: "Not enough stock" }
      );
    }

    if (next < minimum) next = minimum;
    if (!product.sellByWeight) next = Math.round(next);

    line.qty = next;
    renderCart();
  }

  function addToCart(productId, qty) {
    var product = Store.findProduct(productId);
    if (!product) return;

    var amount = product.sellByWeight ? round(qty) : Math.max(1, Math.floor(qty));
    if (!amount || amount <= 0) return;

    var existing = cartLine(productId);
    var next = (existing ? existing.qty : 0) + amount;
    var available = Number(product.qty) || 0;

    if (next > available) {
      UI.toast(
        "Only " +
          Store.number(available) +
          " " +
          unitLabel(product, available) +
          " of " +
          product.name +
          " is available.",
        { type: "warning", title: "Not enough stock" }
      );
      return;
    }

    if (existing) {
      existing.qty = product.sellByWeight ? round(next) : next;
    } else {
      state.cart.push({ productId: productId, qty: amount });
    }

    renderCart();
    UI.toast(
      product.name +
        " added (" +
        Store.number(amount) +
        " " +
        unitLabel(product, amount) +
        ").",
      { type: "success", title: "Added to cart", delay: 2200 }
    );
  }

  function removeLine(productId) {
    state.cart = state.cart.filter(function (line) {
      return line.productId !== productId;
    });
    renderCart();
  }

  function clearCart(silent) {
    state.cart = [];
    var discount = $("posDiscount");
    if (discount) discount.value = "0";
    var cash = $("posCash");
    if (cash) cash.value = "";
    var customer = $("posCustomer");
    if (customer) customer.value = "Walk-in Customer";
    var orderType = $("posOrderType");
    if (orderType) orderType.value = "Walk-in";
    var payment = $("posPayment");
    if (payment) payment.value = "Cash";
    syncChoiceGroup("posOrderTypeGroup", "Walk-in");
    syncChoiceGroup("posPaymentGroup", "Cash");
    renderCart();
    if (!silent) {
      UI.toast("The current sale was cleared.", { type: "info", delay: 2000 });
    }
  }

  /* ---------------------------- Weight selection -------------------------- */

  function selectedWeight() {
    var input = $("weightInput");
    var value = input ? Number(input.value) : 0;
    return isFinite(value) ? value : 0;
  }

  function renderWeightPreview() {
    var product = weightProductId ? Store.findProduct(weightProductId) : null;
    if (!product) return;

    var weight = round(selectedWeight());
    var existing = cartQty(product.id);
    var available = Number(product.qty) || 0;
    var input = $("weightInput");
    var addButton = $("weightAdd");
    var error = $("weightError");

    if ($("weightRate")) {
      $("weightRate").textContent =
        Store.money(product.price) + " per " + unitLabel(product, 1);
    }
    if ($("weightTotal")) {
      $("weightTotal").textContent = Store.money(Math.max(0, weight) * product.price);
    }

    var valid =
      weight > 0 && weight + existing <= available && weight <= available;

    if (input) {
      input.classList.toggle("is-invalid", !valid);
      input.setAttribute("aria-invalid", valid ? "false" : "true");
    }
    if (error) {
      error.textContent =
        weight + existing > available
          ? "Only " +
            Store.number(Math.max(0, available - existing)) +
            " " +
            unitLabel(product, available - existing) +
            " can be added to this cart."
          : "Enter a weight greater than zero.";
      error.style.display = valid ? "none" : "block";
    }
    if (addButton) addButton.disabled = !valid;

    document.querySelectorAll("#weightPresets .weight-preset").forEach(function (button) {
      var preset = Number(button.getAttribute("data-weight"));
      button.classList.toggle("active", preset === weight);
    });
  }

  function openWeight(productId) {
    var product = Store.findProduct(productId);
    if (!product) return;
    weightProductId = productId;

    if ($("weightName")) $("weightName").textContent = product.name;
    if ($("weightMeta")) {
      $("weightMeta").textContent =
        Store.money(product.price) +
        " per " +
        unitLabel(product, 1) +
        " \u00B7 " +
        Store.number(product.qty) +
        " " +
        unitLabel(product) +
        " available";
    }
    var image = $("weightProduct") ? $("weightProduct").querySelector("img") : null;
    if (image) image.src = Store.productImage(product);

    if ($("weightInput")) $("weightInput").value = "1.5";
    renderWeightPreview();
    bootstrap.Modal.getOrCreateInstance($("weightModal")).show();
  }

  function confirmWeight() {
    var product = weightProductId ? Store.findProduct(weightProductId) : null;
    if (!product) return;

    var weight = round(selectedWeight());
    var existing = cartQty(product.id);
    var available = Number(product.qty) || 0;

    if (weight <= 0 || weight + existing > available) {
      renderWeightPreview();
      return;
    }

    addToCart(product.id, weight);
    bootstrap.Modal.getOrCreateInstance($("weightModal")).hide();
    weightProductId = null;
  }

  /* -------------------------------- Receipt ------------------------------- */

  function receiptHTML(txn, tendered, change) {
    var settings = Store.data.settings;
    var lines = txn.items
      .map(function (item) {
        var qtyLabel = Store.number(item.qty) + " " + UI.escape(item.unit || "");
        return (
          '<div class="receipt__row mb-1">' +
          "<span>" +
          UI.escape(item.name) +
          ' <span class="text-app-muted">&times;' +
          qtyLabel +
          "</span></span>" +
          "<span>" +
          Store.money(item.qty * item.price) +
          "</span>" +
          "</div>"
        );
      })
      .join("");

    var cashRows =
      tendered != null
        ? '<div class="receipt__divider"></div>' +
          '<div class="receipt__row"><span>Cash received</span><span>' +
          Store.money(tendered) +
          "</span></div>" +
          '<div class="receipt__row"><span>Change</span><span>' +
          Store.money(Math.max(0, change)) +
          "</span></div>"
        : "";

    return (
      '<div class="receipt">' +
      '<div class="text-center mb-2">' +
      '<div class="fw-650" style="font-size:.92rem">' +
      UI.escape(settings.businessName) +
      "</div>" +
      '<div class="text-app-muted" style="font-size:.8rem">' +
      UI.escape(settings.address) +
      "</div>" +
      '<div class="text-app-muted" style="font-size:.8rem">' +
      UI.escape(settings.phone) +
      "</div>" +
      "</div>" +
      '<div class="receipt__divider"></div>' +
      '<div class="receipt__row"><span>Invoice</span><span>' +
      UI.escape(txn.invoice) +
      "</span></div>" +
      '<div class="receipt__row"><span>Date</span><span>' +
      Store.formatDateTime(txn.date) +
      "</span></div>" +
      '<div class="receipt__row"><span>Customer</span><span>' +
      UI.escape(txn.customer) +
      "</span></div>" +
      '<div class="receipt__row"><span>Order type</span><span>' +
      UI.escape(txn.orderType || "Walk-in") +
      "</span></div>" +
      '<div class="receipt__row"><span>Cashier</span><span>' +
      UI.escape(txn.cashier) +
      "</span></div>" +
      '<div class="receipt__row"><span>Payment</span><span>' +
      UI.escape(txn.payment) +
      "</span></div>" +
      '<div class="receipt__divider"></div>' +
      lines +
      '<div class="receipt__divider"></div>' +
      '<div class="receipt__row"><span>Subtotal</span><span>' +
      Store.money(txn.subtotal) +
      "</span></div>" +
      '<div class="receipt__row"><span>Discount</span><span>&minus;' +
      Store.money(txn.discount) +
      "</span></div>" +
      '<div class="receipt__row fw-650"><span>Total</span><span>' +
      Store.money(txn.total) +
      "</span></div>" +
      cashRows +
      '<div class="receipt__divider"></div>' +
      '<div class="text-center text-app-muted" style="font-size:.8rem">' +
      UI.escape(settings.receiptFooter || "Thank you!") +
      '<br><span style="font-size:.8rem">Sales receipt &middot; no tax computation</span>' +
      "</div>" +
      "</div>"
    );
  }

  function showReceipt(txn, tendered, change) {
    if (!txn) return;
    lastSale = { transaction: txn, tendered: tendered, change: change };

    if ($("posReceiptTitle")) $("posReceiptTitle").textContent = txn.invoice;
    if ($("posReceiptSub")) {
      $("posReceiptSub").innerHTML =
        Store.formatDateTime(txn.date) +
        " &middot; " +
        UI.statusBadge(
          txn.status,
          txn.status === "Completed" ? "success" : "warning"
        );
    }
    if ($("posReceiptBody")) {
      $("posReceiptBody").innerHTML = receiptHTML(txn, tendered, change);
    }

    bootstrap.Modal.getOrCreateInstance($("posReceiptModal")).show();
  }

  function printReceipt() {
    if (!lastSale || !lastSale.transaction) return;
    var txn = lastSale.transaction;
    var settings = Store.data.settings;
    var rows = txn.items
      .map(function (item) {
        return (
          "<tr><td>" +
          UI.escape(item.name) +
          " x" +
          Store.number(item.qty) +
          " " +
          UI.escape(item.unit || "") +
          '</td><td style="text-align:right">' +
          Store.money(item.qty * item.price) +
          "</td></tr>"
        );
      })
      .join("");

    var cashRows =
      lastSale.tendered != null
        ? "<div class='row'><span>Cash received</span><span>" +
          Store.money(lastSale.tendered) +
          "</span></div><div class='row'><span>Change</span><span>" +
          Store.money(Math.max(0, lastSale.change)) +
          "</span></div>"
        : "";

    var win = window.open("", "_blank", "width=460,height=680");
    if (!win) {
      UI.toast("Allow pop-ups to print the receipt.", { type: "warning" });
      return;
    }
    win.document.write(
      "<!DOCTYPE html><html><head><title>" +
        UI.escape(txn.invoice) +
        "</title><style>" +
        "body{font-family:Consolas,monospace;font-size:12px;color:#111;padding:18px;max-width:340px;margin:0 auto}" +
        "h1{font-size:14px;text-align:center;margin:0 0 2px}p{margin:2px 0;text-align:center;font-size:10px}" +
        "hr{border:0;border-top:1px dashed #999;margin:8px 0}table{width:100%;border-collapse:collapse;font-size:11px}" +
        "td{padding:2px 0;vertical-align:top}.row{display:flex;justify-content:space-between;font-size:11px}" +
        ".total{font-weight:700;font-size:13px}.foot{text-align:center;font-size:10px;color:#555;margin-top:10px}" +
        "</style></head><body>" +
        "<h1>" +
        UI.escape(settings.businessName) +
        "</h1>" +
        "<p>" +
        UI.escape(settings.address) +
        "</p><p>" +
        UI.escape(settings.phone) +
        "</p><hr>" +
        "<div class='row'><span>Invoice</span><span>" +
        UI.escape(txn.invoice) +
        "</span></div>" +
        "<div class='row'><span>Date</span><span>" +
        Store.formatDateTime(txn.date) +
        "</span></div>" +
        "<div class='row'><span>Customer</span><span>" +
        UI.escape(txn.customer) +
        "</span></div>" +
        "<div class='row'><span>Order type</span><span>" +
        UI.escape(txn.orderType || "Walk-in") +
        "</span></div>" +
        "<div class='row'><span>Cashier</span><span>" +
        UI.escape(txn.cashier) +
        "</span></div>" +
        "<div class='row'><span>Payment</span><span>" +
        UI.escape(txn.payment) +
        "</span></div><hr>" +
        "<table>" +
        rows +
        "</table><hr>" +
        "<div class='row'><span>Subtotal</span><span>" +
        Store.money(txn.subtotal) +
        "</span></div>" +
        "<div class='row'><span>Discount</span><span>-" +
        Store.money(txn.discount) +
        "</span></div>" +
        "<div class='row total'><span>Total</span><span>" +
        Store.money(txn.total) +
        "</span></div>" +
        cashRows +
        "<hr><p class='foot'>" +
        UI.escape(settings.receiptFooter || "Thank you!") +
        "<br>Sales receipt</p>" +
        "</body></html>"
    );
    win.document.close();
    win.focus();
    win.print();
  }

  /* ----------------------------- Recent sales ----------------------------- */

  function renderRecentSales() {
    var tbody = $("cashierSalesBody");
    if (!tbody) return;

    var rows = Store.data.transactions.slice(0, 8);

    if (!rows.length) {
      tbody.innerHTML = UI.emptyRow(
        8,
        "bi-receipt",
        "No sales recorded",
        "Complete a sale to see it in this list."
      );
      return;
    }

    tbody.innerHTML = rows
      .map(function (txn) {
        return (
          "<tr>" +
          '<td class="text-nowrap"><span class="cell-strong">' +
          UI.escape(txn.invoice) +
          "</span></td>" +
          '<td class="text-nowrap">' +
          Store.formatDateTime(txn.date) +
          "</td>" +
          '<td class="text-truncate" style="max-width:170px">' +
          UI.escape(txn.customer) +
          "</td>" +
          '<td><span class="badge-soft">' +
          UI.escape(txn.orderType || "Walk-in") +
          "</span></td>" +
          "<td>" +
          UI.escape(txn.cashier) +
          "</td>" +
          '<td class="text-nowrap">' +
          UI.escape(txn.payment) +
          "</td>" +
          '<td class="text-end fw-650 text-tabular text-nowrap">' +
          Store.money(txn.total) +
          "</td>" +
          '<td class="text-end"><button class="btn btn-icon" type="button" data-receipt="' +
          UI.escape(txn.id) +
          '" title="View receipt" aria-label="View receipt for ' +
          UI.escape(txn.invoice) +
          '"><i class="bi bi-receipt"></i></button></td>' +
          "</tr>"
        );
      })
      .join("");
  }

  /* ------------------------------- Checkout ------------------------------- */

  function completeSale() {
    if (!state.cart.length) {
      UI.toast("Add at least one product before completing the sale.", {
        type: "warning",
        title: "Cart is empty",
      });
      if ($("posSearch")) $("posSearch").focus();
      return;
    }

    var method = paymentMethod();
    var amountDue = total();
    var tendered = method === "Cash" ? cashReceived() : null;

    if (method === "Cash" && tendered < amountDue) {
      if ($("posChange")) $("posChange").classList.add("is-short");
      UI.toast(
        "Cash received (" +
          Store.money(tendered) +
          ") is less than the total (" +
          Store.money(amountDue) +
          ").",
        { type: "danger", title: "Insufficient cash" }
      );
      if ($("posCash")) $("posCash").focus();
      return;
    }

    var button = $("posCheckout");
    UI.busy(button, true, "Completing sale\u2026");

    window.setTimeout(function () {
      var result = Store.addTransaction({
        customer: ($("posCustomer") ? $("posCustomer").value.trim() : "") || "Walk-in Customer",
        orderType: $("posOrderType") ? $("posOrderType").value : "Walk-in",
        cashierId: user() ? user().id : "",
        payment: method,
        discount: discountValue(),
        items: state.cart.map(function (line) {
          return { productId: line.productId, qty: line.qty };
        }),
      });

      UI.busy(button, false);

      if (!result.ok) {
        UI.toast(result.message, { type: "danger", title: "Sale not recorded" });
        return;
      }

      var change = method === "Cash" ? round(tendered - amountDue) : null;

      clearCart(true);
      renderProducts();
      renderRecentSales();
      renderSummary();

      UI.toast(
        result.transaction.invoice +
          " completed for " +
          Store.money(result.transaction.total) +
          ".",
        { type: "success", title: "Sale recorded", delay: 4000 }
      );

      window.setTimeout(function () {
        showReceipt(result.transaction, tendered, change);
      }, 320);
    }, 480);
  }

  /* -------------------------------- Events -------------------------------- */

  function fillCustomers() {
    var list = $("posCustomerOptions");
    if (!list) return;
    var seen = {};
    var names = [];
    Store.data.transactions.forEach(function (txn) {
      var name = String(txn.customer || "").trim();
      if (!name || seen[name.toLowerCase()]) return;
      seen[name.toLowerCase()] = true;
      names.push(name);
    });
    list.innerHTML = names
      .slice(0, 12)
      .map(function (name) {
        return '<option value="' + UI.escape(name) + '"></option>';
      })
      .join("");
  }

  function bindEvents() {
    if ($("posSearch")) {
      $("posSearch").addEventListener("input", function () {
        state.search = this.value;
        renderProducts();
      });
    }

    if ($("posCategories")) {
      $("posCategories").addEventListener("click", function (event) {
        var button = event.target.closest("[data-category]");
        if (!button) return;
        state.category = button.getAttribute("data-category") || "";
        renderCategories();
        renderProducts();
      });
    }

    if ($("posGrid")) {
      $("posGrid").addEventListener("click", function (event) {
        var button = event.target.closest("[data-product-id]");
        if (!button || button.disabled) return;
        var product = Store.findProduct(button.getAttribute("data-product-id"));
        if (!product) return;
        if (Number(product.qty) <= 0) {
          UI.toast(product.name + " is out of stock.", { type: "warning" });
          return;
        }
        if (product.sellByWeight) {
          openWeight(product.id);
        } else {
          addToCart(product.id, 1);
        }
      });
    }

    if ($("posCartItems")) {
      $("posCartItems").addEventListener("click", function (event) {
        var button = event.target.closest("[data-cart]");
        if (!button) return;
        var lineEl = button.closest("[data-line]");
        if (!lineEl) return;
        var productId = lineEl.getAttribute("data-line");
        var line = cartLine(productId);
        if (!line) return;
        var action = button.getAttribute("data-cart");

        if (action === "remove") {
          removeLine(productId);
        } else if (action === "inc") {
          setCartQty(productId, line.qty + Number(button.getAttribute("data-step") || 1));
        } else if (action === "dec") {
          setCartQty(productId, line.qty - Number(button.getAttribute("data-step") || 1));
        }
      });

      $("posCartItems").addEventListener("input", function (event) {
        var input = event.target.closest('[data-cart="input"]');
        if (!input) return;
        var lineEl = input.closest("[data-line]");
        if (!lineEl) return;
        setCartQty(lineEl.getAttribute("data-line"), Number(input.value));
      });
    }

    if ($("posClearCart")) {
      $("posClearCart").addEventListener("click", function () {
        if (!state.cart.length) {
          UI.toast("The cart is already empty.", { type: "info", delay: 1800 });
          return;
        }
        UI.confirm({
          title: "Clear the current sale?",
          message: "All items, the discount, and any cash entered will be removed from this cart.",
          confirmLabel: "Clear cart",
          variant: "danger",
          icon: "bi-trash3",
        }).then(function (confirmed) {
          if (confirmed) clearCart();
        });
      });
    }

    if ($("posDiscount")) {
      $("posDiscount").addEventListener("input", renderSummary);
      $("posDiscount").addEventListener("blur", function () {
        var value = Number(this.value);
        var cap = subtotal();
        if (!isFinite(value) || value < 0) value = 0;
        this.value = String(Math.min(round(value), cap));
        renderSummary();
      });
    }

    if ($("posMobileJump")) {
      $("posMobileJump").addEventListener("click", function () {
        var cart = document.querySelector(".pos-cart");
        if (!cart) return;
        cart.scrollIntoView({ behavior: "smooth", block: "start" });
        cart.classList.add("is-flash");
        window.setTimeout(function () {
          cart.classList.remove("is-flash");
        }, 1200);
      });
    }

    bindChoiceGroup("posPaymentGroup", "posPayment", renderChange);
    bindChoiceGroup("posOrderTypeGroup", "posOrderType");

    if ($("posCash")) {
      $("posCash").addEventListener("input", renderChange);
    }

    if ($("posCheckout")) {
      $("posCheckout").addEventListener("click", completeSale);
    }

    // Weight modal
    if ($("weightPresets")) {
      $("weightPresets").addEventListener("click", function (event) {
        var button = event.target.closest("[data-weight]");
        if (!button) return;
        if ($("weightInput")) $("weightInput").value = button.getAttribute("data-weight");
        renderWeightPreview();
      });
    }
    if ($("weightInput")) {
      $("weightInput").addEventListener("input", renderWeightPreview);
    }
    if ($("weightAdd")) {
      $("weightAdd").addEventListener("click", confirmWeight);
    }
    if ($("weightModal")) {
      $("weightModal").addEventListener("hidden.bs.modal", function () {
        weightProductId = null;
      });
    }

    // Receipt printing and history
    if ($("posPrintReceipt")) {
      $("posPrintReceipt").addEventListener("click", printReceipt);
    }
    if ($("cashierSalesBody")) {
      $("cashierSalesBody").addEventListener("click", function (event) {
        var button = event.target.closest("[data-receipt]");
        if (!button) return;
        var txn = Store.data.transactions.find(function (item) {
          return item.id === button.getAttribute("data-receipt");
        });
        if (txn) showReceipt(txn, null, null);
      });
    }
  }

  /* --------------------------------- Init --------------------------------- */

  function init() {
    if ($("cashierDate")) {
      $("cashierDate").textContent = new Date().toLocaleDateString("en-PH", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    fillCustomers();
    syncChoiceGroup("posPaymentGroup", paymentMethod());
    syncChoiceGroup("posOrderTypeGroup", $("posOrderType") ? $("posOrderType").value : "Walk-in");
    renderCategories();
    renderProducts();
    renderCart();
    renderRecentSales();
    bindEvents();

    if ($("posSearch")) {
      window.setTimeout(function () {
        $("posSearch").focus();
      }, 400);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
