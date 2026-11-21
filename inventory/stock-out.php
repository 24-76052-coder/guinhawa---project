<?php require __DIR__ . '/../shared/guard.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#00291c">
  <meta name="description" content="Guinhawa Poultry Supply stock out — remove damaged, expired, and internal-use stock.">
  <title>Stock Out &middot; Guinhawa Admin</title>

  <script src="/guinhawa_system/shared/js/theme-init.js"></script>
  <link rel="icon" type="image/png" href="/guinhawa_system/assets/images/guinhawa-logo.png">
  <link rel="stylesheet" href="/guinhawa_system/shared/bootstrap5/css/bootstrap.min.css">
  <link rel="stylesheet" href="/guinhawa_system/shared/bootstrap-icons/bootstrap-icons.min.css">
  <link rel="stylesheet" href="/guinhawa_system/shared/css/style.css">
</head>
<body data-area="inventory" data-page="stock-out" data-movement="out">
  <a class="skip-link" href="#mainContent">Skip to content</a>

  <div id="sidebarRoot"></div>
  <div id="offcanvasRoot"></div>

  <div class="app-main">
    <div id="topbarRoot"></div>

    <main class="page-content" id="mainContent">
      <div class="page-head">
        <div>
          <div class="page-eyebrow"><i class="bi bi-box-arrow-up" aria-hidden="true"></i> Operations</div>
          <h1 class="page-title">Stock Out</h1>
          <p class="page-sub">
            Remove stock in four simple steps: choose a product, enter the quantity, review the
            remaining balance, then confirm.
          </p>
        </div>
        <div class="page-actions">
          <a class="btn btn-outline-app" href="stock-in.php">
            <i class="bi bi-box-arrow-in-down" aria-hidden="true"></i> Stock in
          </a>
          <a class="btn btn-outline-app" href="history.php">
            <i class="bi bi-clock-history" aria-hidden="true"></i> History
          </a>
        </div>
      </div>

      <div class="row row-cols-1 row-cols-md-3 g-3 mb-3">
        <div class="col">
          <div class="inventory-stat">
            <div class="inventory-stat__icon"><i class="bi bi-box-arrow-up" aria-hidden="true"></i></div>
            <div>
              <span class="inventory-stat__label">Today's stock out</span>
              <span class="inventory-stat__value" id="statTodayCount">&mdash;</span>
              <span class="inventory-stat__meta">Entries recorded today</span>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="inventory-stat">
            <div class="inventory-stat__icon"><i class="bi bi-box-seam" aria-hidden="true"></i></div>
            <div>
              <span class="inventory-stat__label">Total units moved</span>
              <span class="inventory-stat__value" id="statTodayUnits">&mdash;</span>
              <span class="inventory-stat__meta">Units removed today</span>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="inventory-stat inventory-stat--warning">
            <div class="inventory-stat__icon"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i></div>
            <div>
              <span class="inventory-stat__label">Low stock alerts</span>
              <span class="inventory-stat__value" id="statAlert">&mdash;</span>
              <span class="inventory-stat__meta">Products below their minimum</span>
            </div>
          </div>
        </div>
      </div>

      <section class="panel movement-card movement-card--slim mb-3">
        <div class="panel__header">
          <div>
            <h2 class="panel__title"><i class="bi bi-dash-circle" aria-hidden="true"></i> Remove stock</h2>
            <p class="panel__sub">Select a product and enter the quantity to remove.</p>
          </div>
        </div>
        <div class="panel__body">
          <form id="movementForm" novalidate>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label" for="movementProduct">Product <span class="req">*</span></label>
                <select class="form-select" id="movementProduct" required autocomplete="off"></select>
                <div class="invalid-feedback">Choose the product to remove.</div>
              </div>

              <div class="col-12">
                <div class="stock-glance" id="movementGlance">
                  <span class="stock-glance__label">
                    <i class="bi bi-box-seam" aria-hidden="true"></i>
                    <span id="movementGlanceLabel">Available stock</span>
                  </span>
                  <span class="stock-glance__value" id="movementGlanceValue">Select a product</span>
                  <span class="stock-glance__badge d-none" id="movementGlanceBadge"></span>
                </div>
              </div>

              <div class="col-12 col-sm-7">
                <label class="form-label" for="movementQty">Quantity to remove <span class="req">*</span></label>
                <input class="form-control" id="movementQty" type="number" min="1" step="1" placeholder="0" inputmode="decimal" required>
                <div class="form-text" id="movementQtyHint">Select a product first.</div>
                <div class="invalid-feedback" id="movementQtyError">Enter a quantity greater than zero.</div>
              </div>

              <div class="col-12 col-sm-5">
                <label class="form-label" for="movementUnit">Unit</label>
                <input class="form-control" id="movementUnit" type="text" value="&mdash;" readonly aria-readonly="true" tabindex="-1">
              </div>

              <div class="col-12 col-md-5">
                <label class="form-label" for="movementReason">Reason</label>
                <select class="form-select" id="movementReason">
                  <option value="Damaged" selected>Damaged</option>
                  <option value="Expired">Expired</option>
                  <option value="Internal Use">Internal Use</option>
                  <option value="Stock Correction">Stock Correction</option>
                </select>
              </div>

              <div class="col-12 col-md-7">
                <label class="form-label" for="movementNotes">Notes <span class="text-app-muted fw-normal">(optional)</span></label>
                <input class="form-control" id="movementNotes" type="text" maxlength="180" placeholder="e.g. Two sacks damaged by water">
              </div>
            </div>

            <div class="balance-preview balance-preview--out mt-3" id="movementPreview" aria-live="polite">
              <span class="balance-preview__label">Remaining stock balance</span>
              <span class="balance-preview__value" id="movementPreviewValue">&mdash;</span>
              <span class="balance-preview__note" id="movementPreviewNote">Select a product and enter a quantity to see the remaining balance.</span>
            </div>

            <div class="alert-app alert-app--danger mt-3 d-none" id="movementError" role="alert"></div>

            <div class="movement-actions">
              <button class="btn btn-danger-soft" type="submit" id="movementSubmit">
                <i class="bi bi-dash-circle" aria-hidden="true"></i> Remove Stock
              </button>
              <button class="btn btn-outline-app" type="button" id="movementReset">Clear form</button>
            </div>
          </form>
        </div>
      </section>

      <section class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title"><i class="bi bi-clock-history" aria-hidden="true"></i> Recent stock out</h2>
            <p class="panel__sub">The latest removals recorded in the stock ledger.</p>
          </div>
          <a class="panel-link" href="history.php?type=out">Full ledger <i class="bi bi-arrow-right"></i></a>
        </div>
        <div class="panel__body panel__body--flush">
          <div class="table-responsive">
            <table class="table table-app align-middle">
              <thead>
                <tr>
                  <th>Date &amp; time</th>
                  <th>Product</th>
                  <th class="text-end">Quantity</th>
                  <th>Movement type</th>
                  <th>Reason</th>
                  <th>Recorded by</th>
                  <th class="text-end">Action</th>
                </tr>
              </thead>
              <tbody id="movementRecentBody"></tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <div id="footerRoot"></div>
  </div>

  <div class="toast-container" id="toastContainer"></div>

  <!-- Review-before-save modal -->
  <div class="modal fade movement-modal" id="movementConfirmModal" tabindex="-1" aria-labelledby="movementConfirmTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header movement-modal__head">
          <div class="movement-modal__heading">
            <span class="modal-icon modal-icon--warn" id="movementConfirmIcon"><i class="bi bi-box-arrow-up" aria-hidden="true"></i></span>
            <div>
              <h2 class="modal-title" id="movementConfirmTitle">Confirm Stock Removal</h2>
              <p class="movement-modal__sub" id="movementConfirmSub">Review the details before saving.</p>
            </div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="confirm-product" id="movementConfirmProduct"></div>
          <dl class="confirm-list" id="movementConfirmSummary"></dl>
          <div class="alert-app alert-app--warn" id="movementConfirmNote">
            <i class="bi bi-info-circle" aria-hidden="true"></i>
            <div>Stock updates only after you confirm. This movement will be saved to the inventory history.</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-app" data-bs-dismiss="modal" id="movementConfirmCancel">Cancel</button>
          <button type="button" class="btn btn-danger-soft" id="movementConfirmAccept">Confirm Removal</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Movement details modal -->
  <div class="modal fade movement-modal" id="movementDetailModal" tabindex="-1" aria-labelledby="movementDetailTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header movement-modal__head">
          <div class="movement-modal__heading">
            <span class="modal-icon"><i class="bi bi-clock-history" aria-hidden="true"></i></span>
            <div>
              <h2 class="modal-title" id="movementDetailTitle">Movement details</h2>
              <p class="movement-modal__sub" id="movementDetailSub">Recorded inventory movement</p>
            </div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body" id="movementDetailBody"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-app" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <script src="/guinhawa_system/shared/bootstrap5/js/bootstrap.bundle.min.js" defer></script>
  <script src="/guinhawa_system/shared/js/store.js" defer></script>
  <script src="/guinhawa_system/shared/js/charts.js" defer></script>
  <script src="/guinhawa_system/shared/js/app.js" defer></script>
  <script src="/guinhawa_system/shared/js/stock-movement.js" defer></script>
</body>
</html>
