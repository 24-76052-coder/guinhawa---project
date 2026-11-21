<?php
/**
 * Shared Appearance settings panel.
 *
 * Included by admin/settings.php, inventory/settings.php and
 * cashier/settings.php so every role uses the same combination library and
 * the same saved preferences. All colours are applied by
 * shared/js/theme-init.js as CSS custom properties; this file only provides
 * the labelled controls.
 */

declare(strict_types=1);

$appearanceDisplay = [
    [
        'key' => 'fontSize',
        'label' => 'Font size',
        'icon' => 'bi-fonts',
        'hint' => 'Scales text across every page without changing the layout.',
        'options' => [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']],
    ],
    [
        'key' => 'density',
        'label' => 'Layout density',
        'icon' => 'bi-distribute-vertical',
        'hint' => 'Spacing inside cards, tables and page padding.',
        'options' => [['compact', 'Compact'], ['comfortable', 'Comfortable'], ['spacious', 'Spacious']],
    ],
    [
        'key' => 'corners',
        'label' => 'Card corners',
        'icon' => 'bi-bounding-box',
        'hint' => 'Square for a crisp grid, rounded for a softer feel.',
        'options' => [['square', 'Square'], ['rounded', 'Rounded']],
    ],
    [
        'key' => 'animations',
        'label' => 'Animation',
        'icon' => 'bi-magic',
        'hint' => 'Motion for hovers, panels and page transitions.',
        'options' => [['off', 'Off'], ['subtle', 'Subtle'], ['smooth', 'Smooth']],
    ],
];

$appearanceInterface = [
    [
        'key' => 'sidebar',
        'label' => 'Sidebar',
        'icon' => 'bi-layout-sidebar-inset',
        'hint' => 'Keep the full navigation labels, or collapse it to icons. You can also use the button beside the logo or press Ctrl+B.',
        'options' => [['expanded', 'Expanded'], ['collapsed', 'Collapsed']],
    ],
    [
        'key' => 'cardStyle',
        'label' => 'Card appearance',
        'icon' => 'bi-window-stack',
        'hint' => 'How panels, stat cards and tables are drawn.',
        'options' => [['flat', 'Flat'], ['bordered', 'Bordered'], ['elevated', 'Elevated']],
    ],
    [
        'key' => 'background',
        'label' => 'Background style',
        'icon' => 'bi-brightness-high',
        'hint' => 'A flat canvas or a gentle gradient behind the content.',
        'options' => [['solid', 'Solid'], ['gradient', 'Subtle gradient']],
    ],
];
?>
          <!-- Appearance -->
          <section class="settings-card mb-4 appearance-card" id="appearance">
            <header class="appearance-head settings-card__head">
              <span class="settings-card__icon" aria-hidden="true"><i class="bi bi-palette"></i></span>
              <div class="settings-card__headtext">
                <h2 class="settings-card__title">Appearance</h2>
                <p class="settings-card__sub">
                  Choose one prepared colour combination, then adjust the way the workspace reads.
                  Every change previews instantly and follows your account.
                </p>
              </div>
              <span class="appearance-state" id="appearanceState" role="status">
                <i class="bi bi-check2-circle" aria-hidden="true"></i> Saved
              </span>
            </header>

            <nav class="appearance-jump" aria-label="Appearance sections">
              <a href="#appearanceTheme"><i class="bi bi-circle-half" aria-hidden="true"></i> Theme mode</a>
              <a href="#appearanceColours"><i class="bi bi-palette2" aria-hidden="true"></i> Colours</a>
              <a href="#appearanceDisplay"><i class="bi bi-fonts" aria-hidden="true"></i> Display</a>
              <a href="#appearanceInterface"><i class="bi bi-layout-sidebar-inset" aria-hidden="true"></i> Interface</a>
              <a href="#appearancePreview"><i class="bi bi-eye" aria-hidden="true"></i> Preview</a>
            </nav>

            <div class="appearance-layout">
              <div class="appearance-controls">
                <!-- A. Theme mode -->
                <fieldset class="appearance-block" id="appearanceTheme">
                  <legend class="appearance-block__title"><span class="appearance-step">A</span> Theme mode</legend>
                  <p class="appearance-block__hint">
                    Pick a fixed scheme, or let Guinhawa follow each device automatically.
                  </p>
                  <div class="mode-grid">
                    <label class="mode-option">
                      <input type="radio" name="themeMode" value="light">
                      <span class="mode-card">
                        <span class="mode-thumb mode-thumb--light" aria-hidden="true">
                          <span class="mode-thumb__side"></span>
                          <span class="mode-thumb__main">
                            <span class="mode-thumb__line"></span>
                            <span class="mode-thumb__line mode-thumb__line--short"></span>
                            <span class="mode-thumb__block"></span>
                          </span>
                        </span>
                        <span class="mode-card__label"><i class="bi bi-sun" aria-hidden="true"></i> Light</span>
                      </span>
                    </label>
                    <label class="mode-option">
                      <input type="radio" name="themeMode" value="dark">
                      <span class="mode-card">
                        <span class="mode-thumb mode-thumb--dark" aria-hidden="true">
                          <span class="mode-thumb__side"></span>
                          <span class="mode-thumb__main">
                            <span class="mode-thumb__line"></span>
                            <span class="mode-thumb__line mode-thumb__line--short"></span>
                            <span class="mode-thumb__block"></span>
                          </span>
                        </span>
                        <span class="mode-card__label"><i class="bi bi-moon-stars" aria-hidden="true"></i> Dark</span>
                      </span>
                    </label>
                    <label class="mode-option">
                      <input type="radio" name="themeMode" value="system">
                      <span class="mode-card">
                        <span class="mode-thumb mode-thumb--system" aria-hidden="true">
                          <span class="mode-thumb__side"></span>
                          <span class="mode-thumb__main">
                            <span class="mode-thumb__line"></span>
                            <span class="mode-thumb__line mode-thumb__line--short"></span>
                            <span class="mode-thumb__block"></span>
                          </span>
                        </span>
                        <span class="mode-card__label"><i class="bi bi-display" aria-hidden="true"></i> System</span>
                      </span>
                    </label>
                  </div>
                </fieldset>

                <!-- B. Colour combinations -->
                <fieldset class="appearance-block" id="appearanceColours">
                  <legend class="appearance-block__title"><span class="appearance-step">B</span> Colour combinations</legend>
                  <p class="appearance-block__hint">
                    <strong id="themeCount">&mdash;</strong> ready-made combinations &mdash; eight greens and one ocean blue.
                    Every one is paired for Light and Dark, and only one can be active.
                  </p>

                  <div class="theme-current" id="themeCurrent">
                    <span class="theme-current__swatches" id="themeCurrentSwatches" aria-hidden="true"></span>
                    <span class="theme-current__text">
                      <span class="theme-current__eyebrow">Active combination</span>
                      <strong class="theme-current__name" id="themeCurrentName">Forest Green</strong>
                      <span class="theme-current__desc" id="themeCurrentDesc">The signature Guinhawa green.</span>
                    </span>
                    <span class="theme-current__mode" id="themeCurrentMode">Light</span>
                  </div>

                  <div class="palette-search">
                    <i class="bi bi-search" aria-hidden="true"></i>
                    <label class="visually-hidden" for="themeSearch">Search colour combinations</label>
                    <input class="palette-search__input" id="themeSearch" type="search" autocomplete="off" placeholder="Search combinations, e.g. ocean, sage or mint">
                    <button class="palette-search__clear" id="themeSearchClear" type="button" aria-label="Clear search" hidden>
                      <i class="bi bi-x-lg" aria-hidden="true"></i>
                    </button>
                  </div>

                  <div class="palette-filters" id="themeCategoryFilters" role="group" aria-label="Filter combinations by family"></div>
                  <p class="palette-result" id="themeResult" role="status" aria-live="polite"></p>
                  <div class="palette-grid" id="paletteGrid" role="radiogroup" aria-label="Colour combinations"></div>
                </fieldset>

                <!-- C. Display preferences -->
                <fieldset class="appearance-block" id="appearanceDisplay">
                  <legend class="appearance-block__title"><span class="appearance-step">C</span> Display preferences</legend>
                  <p class="appearance-block__hint">Readability and motion. These apply on top of every combination.</p>
                  <div class="pref-grid">
                    <?php foreach ($appearanceDisplay as $appearanceSegment): ?>
                      <div class="pref-item">
                        <div class="pref-item__head">
                          <span class="pref-item__label" id="<?= htmlspecialchars($appearanceSegment['key'], ENT_QUOTES) ?>Label">
                            <i class="bi <?= htmlspecialchars($appearanceSegment['icon'], ENT_QUOTES) ?>" aria-hidden="true"></i>
                            <?= htmlspecialchars($appearanceSegment['label'], ENT_QUOTES) ?>
                          </span>
                          <span class="pref-item__value" id="<?= htmlspecialchars($appearanceSegment['key'], ENT_QUOTES) ?>Value">&mdash;</span>
                        </div>
                        <div class="pref-segmented" role="radiogroup" aria-labelledby="<?= htmlspecialchars($appearanceSegment['key'], ENT_QUOTES) ?>Label">
                          <?php foreach ($appearanceSegment['options'] as $appearanceOption): ?>
                            <label>
                              <input type="radio" name="<?= htmlspecialchars($appearanceSegment['key'], ENT_QUOTES) ?>" value="<?= htmlspecialchars($appearanceOption[0], ENT_QUOTES) ?>">
                              <span><?= htmlspecialchars($appearanceOption[1], ENT_QUOTES) ?></span>
                            </label>
                          <?php endforeach; ?>
                        </div>
                        <span class="pref-item__hint"><?= htmlspecialchars($appearanceSegment['hint'], ENT_QUOTES) ?></span>
                      </div>
                    <?php endforeach; ?>
                  </div>
                </fieldset>

                <!-- D. Interface preferences -->
                <fieldset class="appearance-block" id="appearanceInterface">
                  <legend class="appearance-block__title"><span class="appearance-step">D</span> Interface preferences</legend>
                  <p class="appearance-block__hint">Layout and surface treatment for the navigation, panels and page background.</p>
                  <div class="pref-grid">
                    <?php foreach ($appearanceInterface as $appearanceSegment): ?>
                      <div class="pref-item">
                        <div class="pref-item__head">
                          <span class="pref-item__label" id="<?= htmlspecialchars($appearanceSegment['key'], ENT_QUOTES) ?>Label">
                            <i class="bi <?= htmlspecialchars($appearanceSegment['icon'], ENT_QUOTES) ?>" aria-hidden="true"></i>
                            <?= htmlspecialchars($appearanceSegment['label'], ENT_QUOTES) ?>
                          </span>
                          <span class="pref-item__value" id="<?= htmlspecialchars($appearanceSegment['key'], ENT_QUOTES) ?>Value">&mdash;</span>
                        </div>
                        <div class="pref-segmented" role="radiogroup" aria-labelledby="<?= htmlspecialchars($appearanceSegment['key'], ENT_QUOTES) ?>Label">
                          <?php foreach ($appearanceSegment['options'] as $appearanceOption): ?>
                            <label>
                              <input type="radio" name="<?= htmlspecialchars($appearanceSegment['key'], ENT_QUOTES) ?>" value="<?= htmlspecialchars($appearanceOption[0], ENT_QUOTES) ?>">
                              <span><?= htmlspecialchars($appearanceOption[1], ENT_QUOTES) ?></span>
                            </label>
                          <?php endforeach; ?>
                        </div>
                        <span class="pref-item__hint"><?= htmlspecialchars($appearanceSegment['hint'], ENT_QUOTES) ?></span>
                      </div>
                    <?php endforeach; ?>
                  </div>
                </fieldset>
              </div>

              <!-- E. Live preview -->
              <aside class="appearance-preview" id="appearancePreview" aria-label="Live preview">
                <div class="appearance-preview__head">
                  <span><i class="bi bi-eye" aria-hidden="true"></i> E &middot; Live preview</span>
                  <span class="preview-live">Live</span>
                </div>

                <div class="pv-window" aria-hidden="true">
                  <div class="pv-sidebar">
                    <div class="pv-brand">
                      <span class="pv-brand__mark">G</span>
                      <span class="pv-brand__word">Guinhawa</span>
                    </div>
                    <span class="pv-nav is-active"><i class="bi bi-grid-1x2-fill"></i><span>Dashboard</span></span>
                    <span class="pv-nav"><i class="bi bi-box-seam"></i><span>Products</span></span>
                    <span class="pv-nav"><i class="bi bi-cart3"></i><span>Cashier</span></span>
                    <span class="pv-nav"><i class="bi bi-graph-up"></i><span>Reports</span></span>
                    <span class="pv-nav"><i class="bi bi-gear"></i><span>Settings</span></span>
                    <span class="pv-user"><span class="pv-user__dot"></span><span>Admin</span></span>
                  </div>

                  <div class="pv-main">
                    <div class="pv-topbar">
                      <span class="pv-topbar__title">Dashboard</span>
                      <span class="pv-search"><i class="bi bi-search"></i><span>Search</span></span>
                      <span class="pv-avatar"></span>
                    </div>

                    <div class="pv-summary">
                      <div class="pv-summary__text">
                        <span class="pv-eyebrow">Sales summary &middot; Today</span>
                        <strong class="pv-value">&#8369;24,580</strong>
                        <span class="pv-trend"><i class="bi bi-arrow-up-right"></i> 12.4% vs yesterday</span>
                      </div>
                      <div class="pv-spark">
                        <span style="height: 34%"></span>
                        <span style="height: 52%"></span>
                        <span style="height: 41%"></span>
                        <span style="height: 68%"></span>
                        <span style="height: 58%"></span>
                        <span style="height: 86%"></span>
                      </div>
                    </div>

                    <div class="pv-actions">
                      <span class="pv-btn pv-btn--primary"><i class="bi bi-plus-lg"></i> New sale</span>
                      <span class="pv-btn pv-btn--secondary">Export</span>
                    </div>

                    <div class="pv-cards">
                      <div class="pv-card">
                        <span class="pv-card__name">Layer Mash</span>
                        <span class="pv-card__price">&#8369;1,240</span>
                        <span class="pv-card__tag">In stock</span>
                      </div>
                      <div class="pv-card">
                        <span class="pv-card__name">Egg Tray</span>
                        <span class="pv-card__price">&#8369;320</span>
                        <span class="pv-card__tag">In stock</span>
                      </div>
                      <div class="pv-card">
                        <span class="pv-card__name">Booster</span>
                        <span class="pv-card__price">&#8369;480</span>
                        <span class="pv-card__tag pv-card__tag--warn">Low</span>
                      </div>
                    </div>

                    <div class="pv-table">
                      <div class="pv-table__row pv-table__row--head"><span>Product</span><span>Stock</span></div>
                      <div class="pv-table__row"><span>Layer Mash 50kg</span><span class="pv-chip">24</span></div>
                      <div class="pv-table__row"><span>Chick Booster</span><span class="pv-chip pv-chip--warn">8</span></div>
                    </div>

                    <div class="pv-notice">
                      <i class="bi bi-bell"></i>
                      <span>Low stock alert</span>
                      <span class="pv-notice__count">3 items</span>
                    </div>
                  </div>
                </div>

                <div class="pv-swatches" id="previewSwatches"></div>

                <p class="preview-note">
                  <i class="bi bi-info-circle" aria-hidden="true"></i>
                  Saved combinations follow your account on every page, role and device.
                </p>
              </aside>
            </div>

            <div class="appearance-actions">
              <div class="appearance-actions__info" id="appearanceSavedInfo">
                <i class="bi bi-shield-check" aria-hidden="true"></i>
                <span>Preferences are saved to your account and this browser.</span>
              </div>
              <div class="appearance-actions__buttons">
                <button class="btn btn-outline-app" type="button" id="cancelAppearanceBtn">
                  <i class="bi bi-x-lg" aria-hidden="true"></i> Cancel
                </button>
                <button class="btn btn-outline-app" type="button" id="resetAppearanceBtn">
                  <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reset<span class="d-none d-sm-inline"> to default</span>
                </button>
                <button class="btn btn-brand" type="button" id="saveAppearanceBtn">
                  <i class="bi bi-check2" aria-hidden="true"></i> Save<span class="d-none d-sm-inline"> changes</span>
                </button>
              </div>
            </div>
          </section>
