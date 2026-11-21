/* ==========================================================================
   GUINHAWA — Simple stock in / stock out workflow
   Select product → enter quantity → review → confirm → inventory updated
   ========================================================================== */

(function (window, document) {
  "use strict";

  var Store = window.GuinhawaStore;
  var UI = window.GuinhawaUI;
  if (!Store || !UI) return;

  var $ = function (id) {
    return document.getElementById(id);
  };

  var direction = document.body.getAttribute("data-movement") === "out" ? "out" : "in";
  var isIn = direction === "in";
  var confirmLabel = isIn ? "Confirm Addition" : "Confirm Removal";
  var saving = false;
  var pending = null;
  var confirmModalEl = null;
  var detailModalEl = null;

  /* ------------------------------- Helpers -------------------------------- */

  function selectedProduct() {
    var select = $("movementProduct");
    return select && select.value ? Store.findProduct(select.value) : null;
  }

  function allowsDecimals(product) {
    return !!product && (product.unit === "kg" || !!product.sellByWeight);
  }

  function quantity() {
    var input = $("movementQty");
    if (!input) return 0;
    var raw = String(input.value || "").trim();
    if (raw === "") return 0;
    var value = Number(raw);
    return isFinite(value) ? Store.roundQty(value) : NaN;
  }

  function unitText(product, qty) {
    return Store.unitLabel(product.unit, qty == null ? product.qty : qty);
  }

  function formatQty(product, qty) {
    return Store.number(qty) + " " + unitText(product, qty);
  }

  function entryQty(entry, value) {
    var unit = entry.unit || "";
    return Store.number(value) + " " + Store.unitLabel(unit, value);
  }

  function nextRef(prefix) {
    var year = new Date().getFullYear();
    var pattern = new RegExp("^" + prefix + "-" + year + "-(\\d+)$");
    var highest = 0;
    Store.data.history.forEach(function (entry) {
      var match = pattern.exec(String(entry.ref || ""));
      if (match) highest = Math.max(highest, Number(match[1]));
    });
    return prefix + "-" + year + "-" + String(highest + 1).padStart(4, "0");
  }

  function showError(message) {
    var box = $("movementError");
    if (!box) return;
    box.textContent = message;
    box.classList.remove("d-none");
  }

  function clearError() {
    var box = $("movementError");
    if (box) {
      box.textContent = "";
      box.classList.add("d-none");
    }
  }

  function clearInvalid() {
    ["movementProduct", "movementQty"].forEach(function (id) {
      var field = $(id);
      if (field) field.classList.remove("is-invalid");
    });
  }

  function productThumb(product) {
    return product ? Store.productImage(product) : "/guinhawa_system/shared/assets/products/generic.svg";
  }

  /* ------------------------------- Controls ------------------------------- */

  function populateProducts() {
    var select = $("movementProduct");
    if (!select) return;

    var previous = select.value || "";

    select.innerHTML =
      '<option value="">Select a product&hellip;</option>' +
      Store.data.products
        .map(function (product) {
          return (
            '<option value="' +
            UI.escape(product.id) +
            '">' +
            UI.escape(product.name) +
            " \u2014 " +
            UI.escape(product.sku) +
            " (" +
            Store.number(product.qty) +
            " " +
            UI.escape(Store.unitLabel(product.unit, product.qty)) +
            ")</option>"
          );
        })
        .join("");

    select.value = previous && Store.findProduct(previous) ? previous : "";
  }

  function applyProductState() {
    var product = selectedProduct();
    var input = $("movementQty");
    var unit = $("movementUnit");
    var hint = $("movementQtyHint");
    var glanceLabel = $("movementGlanceLabel");
    var glanceValue = $("movementGlanceValue");
    var glanceBadge = $("movementGlanceBadge");

    if (unit) {
      unit.value = product ? Store.unitLabel(product.unit, 1) : "\u2014";
    }

    if (!product) {
      if (input) {
        input.step = "1";
        input.min = "1";
        input.removeAttribute("max");
        input.placeholder = "0";
      }
      if (hint) hint.textContent = "Select a product first.";
      if (glanceLabel) glanceLabel.textContent = isIn ? "Current stock" : "Available stock";
      if (glanceValue) glanceValue.textContent = "Select a product";
      if (glanceBadge) glanceBadge.classList.add("d-none");
      return;
    }

    var current = Number(product.qty) || 0;
    var decimal = allowsDecimals(product);

    if (input) {
      input.step = decimal ? "0.1" : "1";
      input.min = decimal ? "0.1" : "1";
      if (isIn) {
        input.removeAttribute("max");
      } else {
        input.max = String(current);
      }
      input.placeholder = decimal ? "e.g. 12.5" : "0";
    }

    if (hint) {
      hint.textContent = decimal
        ? "Decimals are allowed for this product (for example 0.5 or 1.5)."
        : "Enter a whole number for this product.";
    }

    if (glanceLabel) {
      glanceLabel.textContent = isIn ? "Current stock" : "Available stock";
    }
    if (glanceValue) {
      glanceValue.textContent = formatQty(product, current);
    }
    if (glanceBadge) {
      var state = Store.stockState(product);
      glanceBadge.className = "stock-glance__badge stock-glance__badge--" + state.badge;
      glanceBadge.textContent = state.label;
      glanceBadge.classList.remove("d-none");
    }
  }

  /* -------------------------------- Preview ------------------------------- */

  function renderPreview() {
    var preview = $("movementPreview");
    var value = $("movementPreviewValue");
    var note = $("movementPreviewNote");
    if (!preview || !value || !note) return;

    var product = selectedProduct();
    var qty = quantity();
    var hasQty = isFinite(qty) && qty > 0;

    preview.classList.remove("is-danger");

    if (!product) {
      value.textContent = "\u2014";
      note.textContent = isIn
        ? "Select a product and enter a quantity to see the new balance."
        : "Select a product and enter a quantity to see the remaining balance.";
      return;
    }

    var current = Number(product.qty) || 0;

    if (!hasQty) {
      value.textContent = "\u2014";
      if (!isIn && current <= 0) {
        preview.classList.add("is-danger");
        note.textContent = "This product has no available stock to remove.";
      } else {
        note.textContent = isIn
          ? "Enter the quantity received to preview the new balance."
          : "Enter the quantity to remove to preview the remaining balance.";
      }
      return;
    }

    if (!isIn && qty > current) {
      preview.classList.add("is-danger");
      value.textContent = "Not enough stock";
      note.textContent =
        "Only " +
        formatQty(product, current) +
        " available. Reduce the quantity to continue.";
      return;
    }

    var after = isIn ? current + qty : current - qty;
    value.textContent = formatQty(product, after);
    note.textContent = isIn
      ? formatQty(product, current) + " on hand + " + formatQty(product, qty) + " added."
      : formatQty(product, current) + " available \u2212 " + formatQty(product, qty) + " removed.";
  }

  /* ------------------------------ Recent rows ----------------------------- */

  function manualRows() {
    return Store.data.history.filter(function (entry) {
      if (entry.type !== direction) return false;
      if (direction === "out" && entry.reason === "Sale") return false;
      return true;
    });
  }

  function renderRecent() {
    var tbody = $("movementRecentBody");
    if (!tbody) return;

    var rows = manualRows().slice(0, 8);

    if (!rows.length) {
      tbody.innerHTML = UI.emptyRow(
        7,
        isIn ? "bi-box-arrow-in-down" : "bi-box-arrow-up",
        isIn ? "No stock in yet" : "No stock out yet",
        isIn
          ? "Stock you add will appear here."
          : "Damaged, expired, and internal-use stock will appear here."
      );
      return;
    }

    tbody.innerHTML = rows
      .map(function (entry) {
        return (
          "<tr>" +
          '<td class="text-nowrap">' +
          Store.formatDateTime(entry.date) +
          "</td>" +
          "<td>" +
          '<span class="cell-strong">' +
          UI.escape(entry.productName) +
          "</span>" +
          '<span class="cell-sub">' +
          UI.escape(entry.sku || "") +
          "</span>" +
          "</td>" +
          '<td class="text-end qty text-nowrap ' +
          (isIn ? "text-app-success" : "text-app-danger") +
          '">' +
          (isIn ? "+" : "\u2212") +
          Store.number(entry.qty) +
          " " +
          UI.escape(Store.unitLabel(entry.unit, entry.qty)) +
          "</td>" +
          "<td>" +
          UI.statusBadge(isIn ? "Stock in" : "Stock out", isIn ? "success" : "warning") +
          "</td>" +
          '<td class="text-truncate" style="max-width:180px">' +
          UI.escape(entry.reason || "\u2014") +
          "</td>" +
          "<td>" +
          UI.escape(entry.user || "\u2014") +
          "</td>" +
          '<td class="text-end">' +
          '<button class="btn btn-outline-app movement-view" type="button" data-history="' +
          UI.escape(entry.id) +
          '" aria-label="View details for this movement">' +
          '<i class="bi bi-eye" aria-hidden="true"></i> View' +
          "</button>" +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderStats() {
    var today = Store.todayISO();
    var todays = manualRows().filter(function (entry) {
      return String(entry.date).slice(0, 10) === today;
    });
    var units = todays.reduce(function (sum, entry) {
      return sum + (Number(entry.qty) || 0);
    }, 0);

    if ($("statTodayCount")) $("statTodayCount").textContent = Store.number(todays.length);
    if ($("statTodayUnits")) $("statTodayUnits").textContent = Store.number(units);
    if ($("statAlert")) $("statAlert").textContent = Store.number(Store.lowStockCount());
  }

  /* ---------------------------- Details modal ----------------------------- */

  function detailRow(label, value, className) {
    return (
      '<div class="confirm-list__row"><dt>' +
      UI.escape(label) +
      "</dt><dd" +
      (className ? ' class="' + className + '"' : "") +
      ">" +
      UI.escape(value) +
      "</dd></div>"
    );
  }

  function showDetails(id) {
    if (!detailModalEl) return;
    var entry = Store.data.history.find(function (item) {
      return item.id === id;
    });
    if (!entry) return;

    var product = Store.findProduct(entry.productId);
    var kindLabel = entry.type === "in" ? "Stock in" : "Stock out";
    var variant = entry.type === "in" ? "success" : "warning";
    var signed = (entry.type === "in" ? "+" : "\u2212") + entryQty(entry, entry.qty);

    $("movementDetailTitle").textContent = kindLabel + " details";
    $("movementDetailSub").textContent =
      Store.formatDateTime(entry.date) + (entry.ref ? " \u00B7 " + entry.ref : "");

    var rows =
      detailRow("Date & time", Store.formatDateTime(entry.date)) +
      detailRow("Quantity", signed, entry.type === "in" ? "text-app-success" : "text-app-danger") +
      detailRow("Previous stock", entryQty(entry, entry.before)) +
      detailRow("New stock", entryQty(entry, entry.after)) +
      detailRow("Reason", entry.reason || "\u2014") +
      detailRow("Recorded by", entry.user || "\u2014") +
      detailRow("Reference", entry.ref || "\u2014");

    if (entry.supplierName) {
      rows += detailRow("Supplier", entry.supplierName);
    }

    $("movementDetailBody").innerHTML =
      '<div class="confirm-product">' +
      '<img class="movement-thumb" src="' +
      UI.escape(productThumb(product)) +
      '" alt="" width="48" height="48">' +
      '<div class="confirm-product__body">' +
      "<strong>" +
      UI.escape(entry.productName) +
      "</strong>" +
      "<span>" +
      UI.escape(
        [entry.sku, product ? product.category : ""].filter(Boolean).join(" \u00B7 ") || "Product record"
      ) +
      "</span>" +
      "</div>" +
      UI.statusBadge(kindLabel, variant) +
      "</div>" +
      '<dl class="confirm-list">' +
      rows +
      "</dl>" +
      '<div class="movement-notes">' +
      '<span class="movement-notes__label">Notes</span>' +
      "<p>" +
      UI.escape(entry.notes || "No notes were added for this movement.") +
      "</p>" +
      "</div>";

    bootstrap.Modal.getOrCreateInstance(detailModalEl).show();
  }

  /* ----------------------------- Confirmation ----------------------------- */

  function validate() {
    clearInvalid();
    var product = selectedProduct();
    var input = $("movementQty");
    var qty = quantity();

    if (!product) {
      if ($("movementProduct")) $("movementProduct").classList.add("is-invalid");
      showError("Choose a product before continuing.");
      return false;
    }

    if (!isFinite(qty) || qty <= 0) {
      if (input) input.classList.add("is-invalid");
      showError("Enter a quantity greater than zero.");
      return false;
    }

    if (!allowsDecimals(product) && Math.round(qty) !== qty) {
      if (input) input.classList.add("is-invalid");
      showError(
        product.name +
          " is counted in whole " +
          Store.unitLabel(product.unit, 2) +
          ". Enter a whole number."
      );
      return false;
    }

    if (!isIn && qty > Number(product.qty)) {
      if (input) input.classList.add("is-invalid");
      showError(
        "Only " +
          formatQty(product, Number(product.qty) || 0) +
          " of " +
          product.name +
          " is available. Enter a smaller quantity."
      );
      return false;
    }

    return true;
  }

  function summaryRow(label, value, className) {
    return (
      '<div class="confirm-list__row"><dt>' +
      UI.escape(label) +
      "</dt><dd" +
      (className ? ' class="' + className + '"' : "") +
      ">" +
      UI.escape(value) +
      "</dd></div>"
    );
  }

  function openConfirmation() {
    clearError();
    if (saving || !validate()) return;

    var product = selectedProduct();
    var qty = quantity();
    var current = Number(product.qty) || 0;
    var after = isIn ? current + qty : current - qty;
    var reasonSelect = $("movementReason");
    var notesInput = $("movementNotes");
    var reason = reasonSelect ? reasonSelect.value : "";

    pending = {
      productId: product.id,
      qty: qty,
      reason: reason,
      notes: notesInput ? notesInput.value.trim() : "",
      ref: nextRef(isIn ? "DR" : "ADJ"),
    };

    var icon = $("movementConfirmIcon");
    if (icon) {
      icon.className = "modal-icon" + (isIn ? "" : " modal-icon--warn");
      icon.innerHTML =
        '<i class="bi ' +
        (isIn ? "bi-box-arrow-in-down" : "bi-box-arrow-up") +
        '" aria-hidden="true"></i>';
    }

    $("movementConfirmTitle").textContent = isIn
      ? "Confirm Stock Addition"
      : "Confirm Stock Removal";
    $("movementConfirmSub").textContent = isIn
      ? "Check the product and new balance before adding."
      : "Check the product and remaining balance before removing.";

    $("movementConfirmProduct").innerHTML =
      '<img class="movement-thumb" src="' +
      UI.escape(productThumb(product)) +
      '" alt="" width="48" height="48">' +
      '<div class="confirm-product__body">' +
      "<strong>" +
      UI.escape(product.name) +
      "</strong>" +
      "<span>" +
      UI.escape(product.sku + " \u00B7 " + product.category) +
      "</span>" +
      "</div>" +
      UI.statusBadge(Store.stockState(product).label, Store.stockState(product).badge);

    $("movementConfirmSummary").innerHTML =
      summaryRow(isIn ? "Current stock" : "Available stock", formatQty(product, current)) +
      summaryRow(
        isIn ? "Quantity to add" : "Quantity to remove",
        formatQty(product, qty),
        isIn ? "text-app-success" : "text-app-danger"
      ) +
      summaryRow(
        isIn ? "New stock balance" : "Remaining stock",
        formatQty(product, after),
        "confirm-list__value--strong"
      ) +
      summaryRow("Reason", reason);

    var note = $("movementConfirmNote");
    if (note) {
      note.className = "alert-app" + (isIn ? "" : " alert-app--warn");
    }

    var accept = $("movementConfirmAccept");
    if (accept) {
      accept.textContent = confirmLabel;
      accept.className = "btn " + (isIn ? "btn-brand" : "btn-danger-soft");
      accept.disabled = false;
    }
    if ($("movementConfirmCancel")) $("movementConfirmCancel").disabled = false;

    bootstrap.Modal.getOrCreateInstance(confirmModalEl).show();
  }

  function confirmMovement() {
    if (saving || !pending) return;
    saving = true;

    var accept = $("movementConfirmAccept");
    var cancel = $("movementConfirmCancel");
    if (accept) {
      accept.disabled = true;
      accept.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving\u2026';
    }
    if (cancel) cancel.disabled = true;

    var result;
    try {
      result = Store.adjustStock(pending.productId, direction, pending.qty, {
        ref: pending.ref,
        reason: pending.reason,
        notes: pending.notes,
      });
    } catch (error) {
      result = {
        ok: false,
        message: "The movement could not be saved. Please try again.",
      };
    }

    if (!result.ok) {
      saving = false;
      if (accept) {
        accept.disabled = false;
        accept.textContent = confirmLabel;
      }
      if (cancel) cancel.disabled = false;
      bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
      showError(result.message);
      UI.toast(result.message, { type: "danger", title: "Movement not saved" });
      return;
    }

    var message = result.message;
    bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();

    resetForm();
    populateProducts();
    applyProductState();
    renderPreview();
    renderStats();
    renderRecent();

    UI.toast(message, {
      type: "success",
      title: isIn ? "Stock added" : "Stock removed",
      delay: 4600,
    });
  }

  function resetForm() {
    var form = $("movementForm");
    if (form) form.reset();

    if ($("movementProduct")) $("movementProduct").value = "";
    if ($("movementQty")) $("movementQty").value = "";
    if ($("movementNotes")) $("movementNotes").value = "";

    clearInvalid();
    clearError();
    applyProductState();
    renderPreview();
  }

  /* --------------------------------- Events ------------------------------- */

  function bindEvents() {
    var form = $("movementForm");
    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        openConfirmation();
      });
    }

    if ($("movementProduct")) {
      $("movementProduct").addEventListener("change", function () {
        this.classList.remove("is-invalid");
        clearError();
        applyProductState();
        renderPreview();
      });
    }

    if ($("movementQty")) {
      $("movementQty").addEventListener("input", function () {
        this.classList.remove("is-invalid");
        clearError();
        renderPreview();
      });
    }

    if ($("movementReset")) {
      $("movementReset").addEventListener("click", function () {
        resetForm();
        UI.toast("The form was cleared.", { type: "info", delay: 1700 });
      });
    }

    if ($("movementRecentBody")) {
      $("movementRecentBody").addEventListener("click", function (event) {
        var button = event.target.closest("[data-history]");
        if (button) showDetails(button.getAttribute("data-history"));
      });
    }

    if ($("movementConfirmAccept")) {
      $("movementConfirmAccept").addEventListener("click", confirmMovement);
    }

    if (confirmModalEl) {
      confirmModalEl.addEventListener("hidden.bs.modal", function () {
        saving = false;
        pending = null;
        var accept = $("movementConfirmAccept");
        var cancel = $("movementConfirmCancel");
        if (accept) {
          accept.disabled = false;
          accept.textContent = confirmLabel;
          accept.className = "btn " + (isIn ? "btn-brand" : "btn-danger-soft");
        }
        if (cancel) cancel.disabled = false;
      });
    }
  }

  /* ---------------------------------- Init -------------------------------- */

  function init() {
    confirmModalEl = $("movementConfirmModal");
    detailModalEl = $("movementDetailModal");

    populateProducts();
    bindEvents();
    resetForm();

    var preselect = UI.param("product");
    var presetQty = UI.param("qty");

    if (preselect && Store.findProduct(preselect) && $("movementProduct")) {
      $("movementProduct").value = preselect;
    }
    if (presetQty && $("movementQty")) {
      $("movementQty").value = presetQty;
    }

    applyProductState();
    renderPreview();
    renderStats();
    renderRecent();

    window.setTimeout(function () {
      if (preselect && $("movementQty")) {
        $("movementQty").focus();
      } else if ($("movementProduct")) {
        $("movementProduct").focus();
      }
    }, 350);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
