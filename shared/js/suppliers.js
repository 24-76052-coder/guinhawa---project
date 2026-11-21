/* ==========================================================================
   GUINHAWA — Suppliers directory
   ========================================================================== */

(function (window, document) {
  "use strict";

  var Store = window.GuinhawaStore;
  var UI = window.GuinhawaUI;
  if (!Store || !UI) return;

  var $ = function (id) {
    return document.getElementById(id);
  };

  var CATEGORIES = [
    "Feeds",
    "Eggs",
    "Livestock",
    "Health & Meds",
    "Equipment",
    "Bedding",
    "Packaging",
  ];

  var state = {
    search: UI.param("q"),
    category: "",
    status: "",
    sort: "name",
  };

  var editingId = null;

  /* ------------------------------- Rendering ------------------------------ */

  function productCount(supplierId) {
    return Store.data.products.filter(function (product) {
      return product.supplierId === supplierId;
    }).length;
  }

  function filteredSuppliers() {
    var q = state.search.trim().toLowerCase();
    var rows = Store.data.suppliers.filter(function (supplier) {
      if (state.status && supplier.status !== state.status) return false;
      if (state.category && supplier.categories.indexOf(state.category) === -1) return false;
      if (!q) return true;
      return (
        supplier.name + " " +
        supplier.contact + " " +
        supplier.phone + " " +
        supplier.email + " " +
        supplier.address + " " +
        supplier.categories.join(" ")
      )
        .toLowerCase()
        .indexOf(q) > -1;
    });

    rows.sort(function (a, b) {
      if (state.sort === "newest") {
        return String(b.since).localeCompare(String(a.since));
      }
      if (state.sort === "products") {
        return productCount(b.id) - productCount(a.id);
      }
      return a.name.localeCompare(b.name);
    });

    return rows;
  }

  function renderStats() {
    var suppliers = Store.data.suppliers;
    var categories = {};
    suppliers.forEach(function (supplier) {
      supplier.categories.forEach(function (category) {
        categories[category] = true;
      });
    });
    var linked = Store.data.products.filter(function (product) {
      return product.supplierId && Store.findSupplier(product.supplierId);
    }).length;

    $("statSuppliers").textContent = Store.number(suppliers.length);
    $("statActive").textContent = Store.number(
      suppliers.filter(function (supplier) {
        return supplier.status === "Active";
      }).length
    );
    $("statLinked").textContent = Store.number(linked);
    $("statCategories").textContent = Store.number(Object.keys(categories).length);
  }

  function renderCategoryOptions() {
    var set = {};
    Store.data.suppliers.forEach(function (supplier) {
      supplier.categories.forEach(function (category) {
        set[category] = true;
      });
    });
    var select = $("supplierCategory");
    select.innerHTML =
      '<option value="">All categories</option>' +
      Object.keys(set)
        .sort()
        .map(function (category) {
          return '<option value="' + UI.escape(category) + '">' + UI.escape(category) + "</option>";
        })
        .join("");
    select.value = state.category;
  }

  function supplierCard(supplier) {
    var count = productCount(supplier.id);
    var statusVariant = supplier.status === "Active" ? "success" : "neutral";
    var categoryTags = supplier.categories
      .map(function (category) {
        return '<span class="badge-soft">' + UI.escape(category) + "</span>";
      })
      .join("");

    return (
      '<div class="col-12 col-md-6 col-xl-4" data-supplier="' + UI.escape(supplier.id) + '">' +
      '<article class="supplier-card d-flex flex-column">' +
      '<div class="supplier-card__head">' +
      '<div class="supplier-logo"><i class="bi bi-truck" aria-hidden="true"></i></div>' +
      '<div class="flex-grow-1 min-w-0">' +
      '<h2 class="supplier-card__name">' + UI.escape(supplier.name) + "</h2>" +
      '<p class="supplier-card__meta">Partner since ' + Store.formatDate(supplier.since) + " &middot; " + UI.escape(supplier.terms) + "</p>" +
      "</div>" +
      UI.statusBadge(supplier.status, statusVariant) +
      "</div>" +
      '<div class="supplier-facts">' +
      '<div class="supplier-fact"><i class="bi bi-person" aria-hidden="true"></i><span>' + UI.escape(supplier.contact) + "</span></div>" +
      '<div class="supplier-fact"><i class="bi bi-telephone" aria-hidden="true"></i><a href="tel:' + UI.escape(supplier.phone.replace(/\s/g, "")) + '" class="text-app-muted">' + UI.escape(supplier.phone) + "</a></div>" +
      '<div class="supplier-fact"><i class="bi bi-envelope" aria-hidden="true"></i><a href="mailto:' + UI.escape(supplier.email) + '" class="text-app-muted" style="overflow-wrap:anywhere">' + UI.escape(supplier.email) + "</a></div>" +
      '<div class="supplier-fact"><i class="bi bi-geo-alt" aria-hidden="true"></i><span>' + UI.escape(supplier.address) + "</span></div>" +
      "</div>" +
      '<div class="supplier-tags">' + categoryTags +
      '<span class="badge-soft"><i class="bi bi-box-seam"></i> ' + Store.number(count) + (count === 1 ? " product" : " products") + "</span></div>" +
      '<div class="d-flex align-items-center gap-2 mt-3 pt-3" style="border-top:1px solid var(--gq-line)">' +
      '<a class="btn btn-soft btn-row" href="products.php?q=' + encodeURIComponent(supplier.name) + '">View products</a>' +
      '<div class="ms-auto d-flex gap-1">' +
      '<button class="btn btn-icon" type="button" data-edit="' + UI.escape(supplier.id) + '" title="Edit supplier" aria-label="Edit supplier"><i class="bi bi-pencil"></i></button>' +
      '<button class="btn btn-icon btn-icon--danger" type="button" data-delete="' + UI.escape(supplier.id) + '" title="Delete supplier" aria-label="Delete supplier"><i class="bi bi-trash3"></i></button>' +
      "</div></div></article></div>"
    );
  }

  function renderGrid() {
    var host = $("supplierGrid");
    var rows = filteredSuppliers();

    if (!rows.length) {
      host.innerHTML =
        '<div class="col-12"><section class="panel"><div class="empty-state">' +
        '<div class="empty-state__icon"><i class="bi bi-truck"></i></div>' +
        "<h6>No suppliers match</h6>" +
        "<p>Try a different search or status filter, or add a new supplier partner.</p>" +
        "</div></section></div>";
    } else {
      host.innerHTML = rows.map(supplierCard).join("");
    }

    $("supplierCount").textContent =
      Store.number(rows.length) + (rows.length === 1 ? " supplier" : " suppliers");
  }

  function renderAll() {
    renderStats();
    renderGrid();
  }

  /* --------------------------------- Modal -------------------------------- */

  function buildCategoryChips() {
    $("supplierCategories").innerHTML = CATEGORIES.map(function (category) {
      return (
        '<label class="check-chip">' +
        '<input type="checkbox" name="supplierCategory" value="' + UI.escape(category) + '">' +
        "<span>" + UI.escape(category) + "</span></label>"
      );
    }).join("");
  }

  function openModal(supplierId) {
    editingId = supplierId || null;
    var form = $("supplierForm");
    form.reset();
    form.classList.remove("was-validated");

    var boxes = document.querySelectorAll('#supplierCategories input');
    boxes.forEach(function (box) {
      box.checked = false;
    });

    if (supplierId) {
      var supplier = Store.findSupplier(supplierId);
      if (!supplier) return;
      $("supplierModalTitle").textContent = "Edit supplier";
      $("supplierName").value = supplier.name;
      $("supplierContact").value = supplier.contact;
      $("supplierPhone").value = supplier.phone;
      $("supplierEmail").value = supplier.email;
      $("supplierAddress").value = supplier.address;
      $("supplierTerms").value = supplier.terms;
      $("supplierSince").value = supplier.since || "";
      $("supplierStatusInput").value = supplier.status;
      boxes.forEach(function (box) {
        if (supplier.categories.indexOf(box.value) > -1) box.checked = true;
      });
    } else {
      $("supplierModalTitle").textContent = "Add supplier";
      $("supplierSince").value = Store.todayISO();
      $("supplierTerms").value = "Cash on delivery";
      $("supplierStatusInput").value = "Active";
    }

    bootstrap.Modal.getOrCreateInstance($("supplierModal")).show();
  }

  function selectedCategories() {
    return Array.prototype.slice
      .call(document.querySelectorAll('#supplierCategories input:checked'))
      .map(function (box) {
        return box.value;
      });
  }

  function saveSupplier(event) {
    event.preventDefault();
    var form = $("supplierForm");
    var categories = selectedCategories();
    var valid = form.checkValidity();

    form.classList.add("was-validated");
    $("supplierCategoryHelp").style.color =
      categories.length ? "" : "var(--gq-rose)";

    if (!valid || !categories.length) {
      if (!categories.length && valid) {
        UI.toast("Choose at least one supply category.", {
          type: "warning",
          title: "Category required",
        });
      }
      return;
    }

    var values = {
      name: $("supplierName").value.trim(),
      contact: $("supplierContact").value.trim(),
      phone: $("supplierPhone").value.trim(),
      email: $("supplierEmail").value.trim(),
      address: $("supplierAddress").value.trim(),
      categories: categories,
      terms: $("supplierTerms").value,
      status: $("supplierStatusInput").value,
      since: $("supplierSince").value || Store.todayISO(),
    };

    if (editingId) {
      var supplier = Store.findSupplier(editingId);
      if (!supplier) return;
      var update = Store.saveSupplier(values, editingId);
      if (!update.ok) {
        UI.toast(update.message, { type: "danger", title: "Supplier not saved" });
        return;
      }
      UI.toast(values.name + " was updated.", { title: "Supplier saved" });
    } else {
      var created = Store.saveSupplier(values, "");
      if (!created.ok) {
        UI.toast(created.message, { type: "danger", title: "Supplier not saved" });
        return;
      }
      UI.toast(values.name + " was added to the supplier directory.", {
        title: "Supplier created",
      });
    }

    bootstrap.Modal.getOrCreateInstance($("supplierModal")).hide();
    renderCategoryOptions();
    renderAll();
  }

  function deleteSupplier(id) {
    var supplier = Store.findSupplier(id);
    if (!supplier) return;
    var linked = productCount(id);

    if (linked > 0) {
      UI.toast(
        supplier.name + " is linked to " + linked + " product(s). Reassign those products before deleting, or set the supplier to Inactive.",
        { type: "warning", title: "Supplier is in use", delay: 6000 }
      );
      return;
    }

    UI.confirm({
      title: "Delete supplier?",
      message: "Remove " + supplier.name + " from the directory? This cannot be undone.",
      confirmLabel: "Delete supplier",
      icon: "bi-trash3",
    }).then(function (confirmed) {
      if (!confirmed) return;
      var result = Store.deleteSupplier(id);
      if (!result.ok) {
        UI.toast(result.message, { type: "danger", title: "Supplier not removed" });
        return;
      }
      renderCategoryOptions();
      renderAll();
      UI.toast(supplier.name + " was removed.", {
        type: "warning",
        title: "Supplier deleted",
      });
    });
  }

  /* --------------------------------- Export ------------------------------- */

  function exportSuppliers() {
    var rows = filteredSuppliers().map(function (supplier) {
      return [
        supplier.name,
        supplier.contact,
        supplier.phone,
        supplier.email,
        supplier.address,
        supplier.categories.join("; "),
        supplier.terms,
        supplier.status,
        supplier.since,
        productCount(supplier.id),
      ];
    });

    UI.exportCSV(
      "guinhawa-suppliers-" + Store.todayISO() + ".csv",
      ["Supplier", "Contact", "Phone", "Email", "Address", "Categories", "Terms", "Status", "Partner since", "Products"],
      rows
    );
    UI.toast("Supplier CSV exported.", {
      type: "info",
      title: "Export ready",
    });
  }

  /* --------------------------------- Events ------------------------------- */

  function bindEvents() {
    var debouncedRender = UI.debounce(renderGrid, 160);

    $("supplierSearch").addEventListener("input", function (event) {
      state.search = event.target.value;
      debouncedRender();
    });

    $("supplierCategory").addEventListener("change", function (event) {
      state.category = event.target.value;
      renderGrid();
    });

    $("supplierStatus").addEventListener("change", function (event) {
      state.status = event.target.value;
      renderGrid();
    });

    $("supplierSort").addEventListener("change", function (event) {
      state.sort = event.target.value;
      renderGrid();
    });

    $("clearSupplierFilters").addEventListener("click", function () {
      state = { search: "", category: "", status: "", sort: "name" };
      $("supplierSearch").value = "";
      $("supplierCategory").value = "";
      $("supplierStatus").value = "";
      $("supplierSort").value = "name";
      renderGrid();
    });

    $("addSupplierBtn").addEventListener("click", function () {
      openModal(null);
    });

    $("exportSuppliers").addEventListener("click", exportSuppliers);
    $("supplierForm").addEventListener("submit", saveSupplier);

    $("supplierGrid").addEventListener("click", function (event) {
      var editButton = event.target.closest("[data-edit]");
      if (editButton) {
        openModal(editButton.getAttribute("data-edit"));
        return;
      }
      var deleteButton = event.target.closest("[data-delete]");
      if (deleteButton) {
        deleteSupplier(deleteButton.getAttribute("data-delete"));
      }
    });

    $("supplierModal").addEventListener("hidden.bs.modal", function () {
      editingId = null;
      $("supplierForm").classList.remove("was-validated");
      $("supplierCategoryHelp").style.color = "";
    });
  }

  /* ---------------------------------- Init -------------------------------- */

  function init() {
    buildCategoryChips();
    renderCategoryOptions();
    renderAll();
    bindEvents();
    $("supplierSearch").value = state.search;
    if (state.search) renderGrid();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
