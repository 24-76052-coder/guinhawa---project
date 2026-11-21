<?php require __DIR__ . '/../shared/guard.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#00291c">
  <meta name="description" content="Guinhawa Poultry Supply inventory movement history.">
  <title>Inventory History &middot; Guinhawa Admin</title>

  <script src="/guinhawa_system/shared/js/theme-init.js"></script>
  <link rel="icon" type="image/png" href="/guinhawa_system/assets/images/guinhawa-logo.png">
  <link rel="stylesheet" href="/guinhawa_system/shared/bootstrap5/css/bootstrap.min.css">
  <link rel="stylesheet" href="/guinhawa_system/shared/bootstrap-icons/bootstrap-icons.min.css">
  <link rel="stylesheet" href="/guinhawa_system/shared/css/style.css">
</head>
<body data-page="history">
  <a class="skip-link" href="#mainContent">Skip to content</a>

  <div id="sidebarRoot"></div>
  <div id="offcanvasRoot"></div>

  <div class="app-main">
    <div id="topbarRoot"></div>

    <main class="page-content" id="mainContent">
      <div class="page-head">
        <div>
          <div class="page-eyebrow"><i class="bi bi-clock-history" aria-hidden="true"></i> Operations</div>
          <h1 class="page-title">Inventory History</h1>
          <p class="page-sub">
            A read-only ledger of every stock movement — deliveries, releases, corrections,
            and sales. Newest movements appear first.
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline-app" type="button" id="exportHistory">
            <i class="bi bi-download" aria-hidden="true"></i> Export CSV
          </button>
          <a class="btn btn-brand" href="stock-in.php">
            <i class="bi bi-box-arrow-in-down" aria-hidden="true"></i> Record stock in
          </a>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-6 col-xl-3">
          <div class="inventory-stat">
            <div class="inventory-stat__icon"><i class="bi bi-arrow-left-right" aria-hidden="true"></i></div>
            <div><span class="inventory-stat__label">Movements logged</span><span class="inventory-stat__value" id="statMovements">&mdash;</span></div>
          </div>
        </div>
        <div class="col-6 col-xl-3">
          <div class="inventory-stat">
            <div class="inventory-stat__icon"><i class="bi bi-box-arrow-in-down" aria-hidden="true"></i></div>
            <div><span class="inventory-stat__label">Units received</span><span class="inventory-stat__value" id="statIn">&mdash;</span></div>
          </div>
        </div>
        <div class="col-6 col-xl-3">
          <div class="inventory-stat">
            <div class="inventory-stat__icon"><i class="bi bi-box-arrow-up" aria-hidden="true"></i></div>
            <div><span class="inventory-stat__label">Units released</span><span class="inventory-stat__value" id="statOut">&mdash;</span></div>
          </div>
        </div>
        <div class="col-6 col-xl-3">
          <div class="inventory-stat">
            <div class="inventory-stat__icon"><i class="bi bi-calendar-check" aria-hidden="true"></i></div>
            <div><span class="inventory-stat__label">Today&rsquo;s movements</span><span class="inventory-stat__value" id="statToday">&mdash;</span></div>
          </div>
        </div>
      </div>

      <section class="panel mb-3">
        <div class="panel__body panel__body--filters">
          <div class="filter-bar">
            <div class="search-field">
              <i class="bi bi-search" aria-hidden="true"></i>
              <input class="form-control" type="search" id="historySearch" placeholder="Search product, SKU, reference, or staff" aria-label="Search history">
            </div>
            <select class="form-select" id="historyType" aria-label="Filter by movement type" style="max-width:170px">
              <option value="">All movement types</option>
              <option value="in">Stock in</option>
              <option value="out">Stock out</option>
              <option value="sale">Sales</option>
            </select>
            <div class="d-flex align-items-center gap-1">
              <input class="form-control" type="date" id="historyFrom" aria-label="From date" style="max-width:150px">
              <span class="text-app-muted" style="font-size:.8rem">to</span>
              <input class="form-control" type="date" id="historyTo" aria-label="To date" style="max-width:150px">
            </div>
            <button class="btn btn-outline-app" type="button" id="clearHistoryFilters">
              <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Clear
            </button>
            <span class="pill-count ms-auto" id="historyCount">0 movements</span>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title"><i class="bi bi-journal-code" aria-hidden="true"></i> Movement ledger</h2>
            <p class="panel__sub">Balances show the stock level before and after each movement</p>
          </div>
          <span class="demo-watermark"><span class="dot"></span> Immutable stock log</span>
        </div>
        <div class="panel__body panel__body--flush">
          <div class="table-responsive">
            <table class="table table-app" id="historyTable">
              <thead>
                <tr>
                  <th class="sortable">Date &amp; time <i class="bi bi-arrow-down-up sort-icon"></i></th>
                  <th class="sortable">Product <i class="bi bi-arrow-down-up sort-icon"></i></th>
                  <th class="sortable">Type <i class="bi bi-arrow-down-up sort-icon"></i></th>
                  <th class="sortable text-end">Quantity <i class="bi bi-arrow-down-up sort-icon"></i></th>
                  <th class="text-end">Balance</th>
                  <th>Reference</th>
                  <th>Supplier / reason</th>
                  <th class="sortable">Recorded by <i class="bi bi-arrow-down-up sort-icon"></i></th>
                </tr>
              </thead>
              <tbody id="historyBody"></tbody>
            </table>
          </div>
          <div class="table-foot">
            <span id="historyFoot">Showing 0 of 0 movements</span>
            <span class="d-inline-flex align-items-center gap-2">
              <span class="legend-chip"><span class="dot" style="background:var(--gq-emerald)"></span> Stock in</span>
              <span class="legend-chip"><span class="dot" style="background:var(--gq-amber)"></span> Stock out</span>
              <span class="legend-chip"><span class="dot" style="background:var(--gq-blue)"></span> Sale</span>
            </span>
          </div>
        </div>
      </section>
    </main>

    <div id="footerRoot"></div>
  </div>

  <div class="toast-container" id="toastContainer"></div>

  <script src="/guinhawa_system/shared/bootstrap5/js/bootstrap.bundle.min.js" defer></script>
  <script src="/guinhawa_system/shared/js/store.js" defer></script>
  <script src="/guinhawa_system/shared/js/charts.js" defer></script>
  <script src="/guinhawa_system/shared/js/app.js" defer></script>
  <script src="/guinhawa_system/shared/js/history.js" defer></script>
</body>
</html>
