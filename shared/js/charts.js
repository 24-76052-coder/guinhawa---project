/* ==========================================================================
   GUINHAWA — Lightweight SVG chart renderers (no chart library)
   ========================================================================== */

(function (window) {
  "use strict";

  var gradientCounter = 0;

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function compact(value, prefix) {
    var n = Number(value) || 0;
    var out;
    if (Math.abs(n) >= 1000000) {
      out = (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    } else if (Math.abs(n) >= 1000) {
      out = (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k";
    } else {
      out = String(Math.round(n));
    }
    return (prefix || "") + out;
  }

  function niceMax(value) {
    if (value <= 0) return 100;
    var exponent = Math.pow(10, Math.floor(Math.log10(value)));
    var fraction = value / exponent;
    var nice;
    if (fraction <= 1) nice = 1;
    else if (fraction <= 2) nice = 2;
    else if (fraction <= 2.5) nice = 2.5;
    else if (fraction <= 5) nice = 5;
    else nice = 10;
    return nice * exponent;
  }

  function smoothPath(points) {
    if (!points.length) return "";
    if (points.length === 1) {
      return "M " + points[0].x + " " + points[0].y;
    }
    var d = "M " + points[0].x + " " + points[0].y;
    for (var i = 1; i < points.length; i++) {
      var prev = points[i - 1];
      var curr = points[i];
      var midX = (prev.x + curr.x) / 2;
      d +=
        " C " +
        midX +
        " " +
        prev.y +
        ", " +
        midX +
        " " +
        curr.y +
        ", " +
        curr.x +
        " " +
        curr.y;
    }
    return d;
  }

  /* ------------------------------- Bar chart ------------------------------ */

  function barChart(container, rows, options) {
    if (!container) return;
    var opts = options || {};
    var data = rows || [];
    var width = 680;
    var height = opts.height || 260;
    var padding = { top: 16, right: 10, bottom: 32, left: 52 };
    var plotW = width - padding.left - padding.right;
    var plotH = height - padding.top - padding.bottom;
    var maxValue = niceMax(
      data.reduce(function (max, row) {
        return Math.max(max, Number(row.value) || 0);
      }, 0)
    );
    var prefix = opts.currency ? "\u20B1" : "";
    var gradId = "gqBarGrad" + ++gradientCounter;

    var gridCount = 4;
    var grid = "";
    for (var g = 0; g <= gridCount; g++) {
      var gy = padding.top + (plotH / gridCount) * g;
      var gv = maxValue - (maxValue / gridCount) * g;
      grid +=
        '<line class="chart-grid" x1="' +
        padding.left +
        '" y1="' +
        gy +
        '" x2="' +
        (width - padding.right) +
        '" y2="' +
        gy +
        '"></line>';
      grid +=
        '<text class="chart-axis" x="' +
        (padding.left - 9) +
        '" y="' +
        (gy + 3.5) +
        '" text-anchor="end">' +
        escapeHTML(compact(gv, prefix)) +
        "</text>";
    }

    var slot = plotW / Math.max(data.length, 1);
    var barW = Math.min(46, slot * 0.5);
    var bars = "";
    data.forEach(function (row, index) {
      var value = Number(row.value) || 0;
      var barH = maxValue === 0 ? 0 : (value / maxValue) * plotH;
      var x = padding.left + slot * index + (slot - barW) / 2;
      var y = padding.top + plotH - barH;
      var title = row.title || row.label + ": " + compact(value, prefix);
      var radius = Math.min(7, barW / 2);

      bars +=
        '<g class="chart-bar">' +
        "<title>" +
        escapeHTML(title) +
        "</title>" +
        '<rect x="' +
        x.toFixed(1) +
        '" y="' +
        y.toFixed(1) +
        '" width="' +
        barW.toFixed(1) +
        '" height="' +
        Math.max(barH, 2).toFixed(1) +
        '" rx="' +
        radius +
        '" fill="url(#' +
        gradId +
        ')"' +
        (value === 0 ? ' opacity="0.24"' : "") +
        "></rect>" +
        '<text class="chart-axis" x="' +
        (x + barW / 2).toFixed(1) +
        '" y="' +
        (height - 10) +
        '" text-anchor="middle">' +
        escapeHTML(row.label) +
        "</text>" +
        "</g>";
    });

    container.innerHTML =
      '<svg class="chart-svg" viewBox="0 0 ' +
      width +
      " " +
      height +
      '" role="img" aria-label="' +
      escapeHTML(opts.ariaLabel || "Bar chart") +
      '" preserveAspectRatio="xMidYMid meet">' +
      "<defs>" +
      '<linearGradient id="' +
      gradId +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#27a75b"></stop>' +
      '<stop offset="100%" stop-color="#0f6d3c"></stop>' +
      "</linearGradient>" +
      "</defs>" +
      grid +
      bars +
      "</svg>";
  }

  /* ------------------------------- Line chart ----------------------------- */

  function lineChart(container, rows, options) {
    if (!container) return;
    var opts = options || {};
    var data = rows || [];
    var width = 680;
    var height = opts.height || 260;
    var padding = { top: 22, right: 14, bottom: 32, left: 54 };
    var plotW = width - padding.left - padding.right;
    var plotH = height - padding.top - padding.bottom;
    var maxValue = niceMax(
      data.reduce(function (max, row) {
        return Math.max(max, Number(row.value) || 0);
      }, 0)
    );
    var prefix = opts.currency ? "\u20B1" : "";
    var gradId = "gqAreaGrad" + ++gradientCounter;

    var points = data.map(function (row, index) {
      var x =
        padding.left +
        (data.length === 1 ? plotW / 2 : (plotW / (data.length - 1)) * index);
      var y =
        padding.top +
        plotH -
        ((Number(row.value) || 0) / maxValue) * plotH;
      return { x: x, y: y, row: row };
    });

    var gridCount = 4;
    var grid = "";
    for (var g = 0; g <= gridCount; g++) {
      var gy = padding.top + (plotH / gridCount) * g;
      var gv = maxValue - (maxValue / gridCount) * g;
      grid +=
        '<line class="chart-grid" x1="' +
        padding.left +
        '" y1="' +
        gy +
        '" x2="' +
        (width - padding.right) +
        '" y2="' +
        gy +
        '"></line>';
      grid +=
        '<text class="chart-axis" x="' +
        (padding.left - 9) +
        '" y="' +
        (gy + 3.5) +
        '" text-anchor="end">' +
        escapeHTML(compact(gv, prefix)) +
        "</text>";
    }

    var linePath = smoothPath(points);
    var areaPath =
      linePath +
      " L " +
      points[points.length - 1].x +
      " " +
      (padding.top + plotH) +
      " L " +
      points[0].x +
      " " +
      (padding.top + plotH) +
      " Z";

    var labelStep = Math.max(1, Math.ceil(data.length / 7));
    var dots = "";
    data.forEach(function (row, index) {
      var point = points[index];
      var showLabel = index % labelStep === 0 || index === data.length - 1;
      if (showLabel) {
        dots +=
          '<text class="chart-axis" x="' +
          point.x.toFixed(1) +
          '" y="' +
          (height - 10) +
          '" text-anchor="middle">' +
          escapeHTML(row.label) +
          "</text>";
      }
      dots +=
        '<g class="chart-bar">' +
        "<title>" +
        escapeHTML(
          (row.fullLabel || row.label) +
            ": " +
            (opts.currency
              ? (opts.symbol || "\u20B1") + (Number(row.value) || 0).toLocaleString("en-PH")
              : compact(row.value, prefix))
        ) +
        "</title>" +
        '<circle class="chart-point" cx="' +
        point.x.toFixed(1) +
        '" cy="' +
        point.y.toFixed(1) +
        '" r="3.6"></circle>' +
        '<circle cx="' +
        point.x.toFixed(1) +
        '" cy="' +
        point.y.toFixed(1) +
        '" r="12" fill="transparent"></circle>' +
        "</g>";
    });

    container.innerHTML =
      '<svg class="chart-svg" viewBox="0 0 ' +
      width +
      " " +
      height +
      '" role="img" aria-label="' +
      escapeHTML(opts.ariaLabel || "Line chart") +
      '" preserveAspectRatio="xMidYMid meet">' +
      "<defs>" +
      '<linearGradient id="' +
      gradId +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#27a75b" stop-opacity="0.28"></stop>' +
      '<stop offset="100%" stop-color="#27a75b" stop-opacity="0"></stop>' +
      "</linearGradient>" +
      "</defs>" +
      grid +
      '<path d="' +
      areaPath +
      '" fill="url(#' +
      gradId +
      ')"></path>' +
      '<path class="chart-line" d="' +
      linePath +
      '"></path>' +
      dots +
      "</svg>";
  }

  /* ------------------------------- Donut chart ---------------------------- */

  function donutChart(container, segments, options) {
    if (!container) return;
    var opts = options || {};
    var rows = (segments || []).filter(function (row) {
      return Number(row.value) > 0;
    });
    var total = rows.reduce(function (sum, row) {
      return sum + (Number(row.value) || 0);
    }, 0);
    var labeled = !!opts.outsideLabels;
    var viewW = labeled ? 400 : 200;
    var viewH = labeled ? 320 : 200;
    var cx = labeled ? 200 : 100;
    var cy = labeled ? 160 : 100;
    var radius = labeled ? 90 : 78;
    var stroke = labeled ? 26 : 22;
    var gap = labeled ? 4 : 3;
    var circumference = 2 * Math.PI * radius;
    var labelRadius = 120;
    var cumulative = 0;
    var labelRows = [];

    var circles =
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      radius +
      '" fill="none" stroke="var(--gq-soft)" stroke-width="' +
      stroke +
      '"></circle>';

    rows.forEach(function (row, index) {
      var value = Number(row.value) || 0;
      var fraction = total ? value / total : 0;
      var length = Math.max(0, fraction * circumference - gap);
      var offset = cumulative * circumference;
      var delay = index * 70 + "ms";
      var dash = length.toFixed(2) + " " + circumference.toFixed(2);
      circles +=
        '<circle class="donut-seg" cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        radius +
        '" fill="none" stroke="' +
        row.color +
        '" stroke-width="' +
        stroke +
        '" stroke-linecap="' +
        (labeled ? "butt" : "round") +
        '" stroke-dasharray="0 ' +
        circumference.toFixed(2) +
        '" data-dash="' +
        dash +
        '" stroke-dashoffset="' +
        (-offset).toFixed(2) +
        '" style="--seg-color:' +
        row.color +
        ";transition-delay:" +
        delay +
        '" transform="rotate(-90 ' +
        cx +
        " " +
        cy +
        ')"><title>' +
        escapeHTML(row.label + ": " + (row.display || value)) +
        "</title></circle>";

      if (labeled) {
        var midFraction = cumulative + fraction / 2;
        var angle = (-90 + midFraction * 360) * (Math.PI / 180);
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        labelRows.push({
          row: row,
          side:
            cos > 0.25 ? "right" : cos < -0.25 ? "left" : sin < 0 ? "top" : "bottom",
          px: cx + labelRadius * cos,
          py: cy + labelRadius * sin,
          ringX: cx + (radius + stroke / 2 + 2) * cos,
          ringY: cy + (radius + stroke / 2 + 2) * sin,
        });
      }

      cumulative += fraction;
    });

    var leadersMarkup = "";
    var labelsMarkup = "";

    if (labeled && labelRows.length) {
      var minGap = 17;
      ["right", "left"].forEach(function (side) {
        var group = labelRows.filter(function (item) {
          return item.side === side;
        });
        group.sort(function (a, b) {
          return a.py - b.py;
        });
        for (var i = 1; i < group.length; i++) {
          if (group[i].py - group[i - 1].py < minGap) {
            group[i].py = group[i - 1].py + minGap;
          }
        }
        var bottomLimit = viewH - 22;
        var overflow = group.length
          ? group[group.length - 1].py - bottomLimit
          : 0;
        if (overflow > 0) {
          group[group.length - 1].py = bottomLimit;
          for (var j = group.length - 2; j >= 0; j--) {
            if (group[j + 1].py - group[j].py < minGap) {
              group[j].py = group[j + 1].py - minGap;
            }
          }
        }
      });

      labelRows.forEach(function (item, index) {
        var anchor =
          item.side === "right"
            ? "start"
            : item.side === "left"
              ? "end"
              : "middle";
        var tx =
          item.side === "right"
            ? item.px + 5
            : item.side === "left"
              ? item.px - 5
              : item.px;
        var label = item.row.label + ": " + (item.row.display || item.row.value);
        var approxWidth = label.length * 6.4;
        if (item.side === "right" && tx + approxWidth > viewW - 4) {
          anchor = "end";
          tx = viewW - 4;
        } else if (item.side === "left" && tx - approxWidth < 4) {
          anchor = "start";
          tx = 4;
        }
        leadersMarkup +=
          '<path class="donut-leader" d="M' +
          item.ringX.toFixed(1) +
          " " +
          item.ringY.toFixed(1) +
          " L" +
          item.px.toFixed(1) +
          " " +
          item.py.toFixed(1) +
          '" stroke="' +
          item.row.color +
          '"></path>' +
          '<circle class="donut-leader-dot" cx="' +
          item.ringX.toFixed(1) +
          '" cy="' +
          item.ringY.toFixed(1) +
          '" r="1.7" fill="' +
          item.row.color +
          '"></circle>';
        labelsMarkup +=
          '<text class="donut-label" x="' +
          tx.toFixed(1) +
          '" y="' +
          item.py.toFixed(1) +
          '" dy="0.32em" text-anchor="' +
          anchor +
          '" fill="' +
          item.row.color +
          '" style="animation-delay:' +
          (240 + index * 60) +
          'ms">' +
          escapeHTML(label) +
          "</text>";
      });
    }

    container.innerHTML =
      '<div class="donut-wrap' +
      (labeled ? " donut-wrap--labels" : "") +
      '">' +
      '<svg class="chart-svg" viewBox="0 0 ' +
      viewW +
      " " +
      viewH +
      '" role="img" aria-label="' +
      escapeHTML(opts.ariaLabel || "Donut chart") +
      '">' +
      circles +
      (labeled
        ? '<circle class="donut-orbit" cx="' +
          cx +
          '" cy="' +
          cy +
          '" r="' +
          radius +
          '" fill="none" stroke="#9ff0c0" stroke-width="' +
          stroke +
          '" stroke-linecap="round" stroke-dasharray="24 ' +
          circumference.toFixed(2) +
          '" style="transform-origin:' +
          cx +
          "px " +
          cy +
          'px"></circle>' +
          leadersMarkup +
          labelsMarkup
        : "") +
      "</svg>" +
      '<div class="donut-center">' +
      '<span class="donut-center__label">' +
      escapeHTML(opts.centerLabel || "Total") +
      "</span>" +
      '<span class="donut-center__value">' +
      escapeHTML(opts.centerValue || "") +
      "</span>" +
      "</div>" +
      "</div>";

    var segmentEls = container.querySelectorAll(".donut-seg");
    if (opts.animate === false) {
      segmentEls.forEach(function (seg) {
        seg.style.strokeDasharray = seg.getAttribute("data-dash");
      });
    } else {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          segmentEls.forEach(function (seg) {
            seg.style.strokeDasharray = seg.getAttribute("data-dash");
          });
        });
      });
    }
  }

  /* ------------------------------- Sparkline ------------------------------ */

  function sparkline(values, options) {
    var opts = options || {};
    var data = (values || []).map(Number);
    if (!data.length) data = [0, 0];
    var width = 80;
    var height = 34;
    var pad = 3;
    var max = Math.max.apply(null, data);
    var min = Math.min.apply(null, data);
    var span = max - min || 1;
    var points = data.map(function (value, index) {
      var x =
        pad +
        (data.length === 1 ? 0 : ((width - pad * 2) / (data.length - 1)) * index);
      var y =
        height -
        pad -
        ((value - min) / span) * (height - pad * 2);
      return { x: x, y: y };
    });
    var line = smoothPath(points);
    var area =
      line +
      " L " +
      points[points.length - 1].x +
      " " +
      height +
      " L " +
      points[0].x +
      " " +
      height +
      " Z";
    var color = opts.color || "var(--gq-emerald)";
    var id = "gqSpark" + ++gradientCounter;

    return (
      '<svg class="stat-spark" viewBox="0 0 ' +
      width +
      " " +
      height +
      '" aria-hidden="true">' +
      "<defs>" +
      '<linearGradient id="' +
      id +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' +
      color +
      '" stop-opacity="0.22"></stop>' +
      '<stop offset="100%" stop-color="' +
      color +
      '" stop-opacity="0"></stop>' +
      "</linearGradient>" +
      "</defs>" +
      '<path d="' +
      area +
      '" fill="url(#' +
      id +
      ')"></path>' +
      '<path d="' +
      line +
      '" fill="none" stroke="' +
      color +
      '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>' +
      '<circle cx="' +
      points[points.length - 1].x.toFixed(1) +
      '" cy="' +
      points[points.length - 1].y.toFixed(1) +
      '" r="2.2" fill="' +
      color +
      '"></circle>' +
      "</svg>"
    );
  }

  function legendHTML(segments) {
    return (segments || [])
      .map(function (row) {
        return (
          '<div class="chart-legend-row">' +
          '<span class="swatch" style="background:' +
          row.color +
          '"></span>' +
          '<span class="name">' +
          escapeHTML(row.label) +
          "</span>" +
          '<span class="value">' +
          escapeHTML(row.display || String(row.value)) +
          "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  window.GuinhawaCharts = {
    barChart: barChart,
    lineChart: lineChart,
    donutChart: donutChart,
    sparkline: sparkline,
    legendHTML: legendHTML,
    compact: compact,
    palette: [
      "#168b4d",
      "#27a75b",
      "#6fdf9f",
      "#2f6f8f",
      "#b7791f",
      "#6d5aa8",
      "#b83c50",
    ],
  };
})(window);
