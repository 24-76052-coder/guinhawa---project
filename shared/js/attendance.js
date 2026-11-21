/* ==========================================================================
   GUINHAWA — Staff attendance
   ========================================================================== */

(function (window, document) {
  "use strict";

  var Store = window.GuinhawaStore;
  var UI = window.GuinhawaUI;
  if (!Store || !UI) return;

  var $ = function (id) {
    return document.getElementById(id);
  };

  var STATUS_VARIANTS = {
    Present: "success",
    Late: "warning",
    "Half Day": "info",
    "On Leave": "violet",
    Absent: "danger",
    "Not recorded": "neutral",
  };

  var selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(UI.param("date") || "")
    ? UI.param("date")
    : Store.todayISO();
  selectedDate = selectedDate > Store.todayISO() ? Store.todayISO() : selectedDate;

  var state = {
    search: "",
    status: "",
  };

  var currentUser = Store.getSession() || Store.getCurrentUser();
  var isAdmin = !!currentUser && currentUser.role === "Admin";

  var editingKey = null;

  /* ------------------------------- Utilities ------------------------------ */

  function timeToMinutes(value) {
    if (!value) return null;
    var parts = String(value).split(":");
    if (parts.length < 2) return null;
    var hours = Number(parts[0]);
    var minutes = Number(parts[1]);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  function clampTime(value) {
    var minutes = timeToMinutes(value);
    if (minutes == null) return null;
    if (minutes > 23 * 60 + 59) return "23:59";
    if (minutes < 0) return "00:00";
    return value;
  }

  function workedHours(timeIn, timeOut) {
    var start = timeToMinutes(timeIn);
    var end = timeToMinutes(timeOut);
    if (start == null || end == null || end <= start) return 0;
    return Math.max(0, Math.round(((end - start - 60) / 60) * 10) / 10);
  }

  function nowTime() {
    var now = new Date();
    return (
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0")
    );
  }

  function displayDate(value) {
    var d = new Date(value + "T00:00:00");
    return d.toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function shiftDate(value, delta) {
    var d = new Date(value + "T00:00:00");
    d.setDate(d.getDate() + delta);
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function findRecord(accountId, date) {
    return Store.data.attendance.find(function (record) {
      return record.accountId === accountId && record.date === date;
    });
  }

  /* ------------------------------- Rendering ------------------------------ */

  function dayAccounts() {
    if (!isAdmin) {
      return currentUser ? [currentUser] : [];
    }
    var accounts = Store.data.accounts.filter(function (account) {
      return (
        account.status === "Active" ||
        Store.data.attendance.some(function (record) {
          return record.accountId === account.id && record.date === selectedDate;
        })
      );
    });
    return accounts.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  }

  function dayRows() {
    return dayAccounts().map(function (account) {
      var record = findRecord(account.id, selectedDate);
      return {
        account: account,
        record: record || null,
        status: record && record.status ? record.status : "Not recorded",
      };
    });
  }

  function visibleRows() {
    var q = state.search.trim().toLowerCase();
    return dayRows().filter(function (row) {
      if (state.status && row.status !== state.status) return false;
      if (!q) return true;
      return (row.account.name + " " + row.account.role).toLowerCase().indexOf(q) > -1;
    });
  }

  function renderStats() {
    var rows = dayRows();
    var present = rows.filter(function (row) {
      return row.status === "Present";
    }).length;
    var late = rows.filter(function (row) {
      return row.status === "Late";
    }).length;
    var away = rows.filter(function (row) {
      return row.status === "On Leave" || row.status === "Absent" || row.status === "Not recorded";
    }).length;
    var total = rows.length;
    var rate = total ? Math.round(((present + late) / total) * 100) : 0;

    $("statPresent").textContent = Store.number(present);
    $("statLate").textContent = Store.number(late);
    $("statAway").textContent = Store.number(away);
    $("statRate").textContent = rate + "%";
  }

  function actionMarkup(row) {
    var record = row.record;
    var actions = "";
    var isToday = selectedDate === Store.todayISO();

    if (!isAdmin) {
      if (!isToday) {
        return '<span class="badge-soft"><i class="bi bi-lock"></i> Read only</span>';
      }
      if (!record || !record.timeIn) {
        actions =
          '<button class="btn btn-soft btn-row" type="button" data-time="in" data-account="' +
          UI.escape(row.account.id) +
          '"><i class="bi bi-fingerprint"></i> Time in</button>';
      } else if (!record.timeOut) {
        actions =
          '<button class="btn btn-brand btn-row" type="button" data-time="out" data-account="' +
          UI.escape(row.account.id) +
          '"><i class="bi bi-stopwatch"></i> Time out</button>';
      } else {
        actions = '<span class="badge-soft"><i class="bi bi-check2-circle"></i> Complete</span>';
      }
      return actions;
    }

    if (!record || !record.timeIn) {
      actions =
        '<button class="btn btn-soft btn-row" type="button" data-time="in" data-account="' +
        UI.escape(row.account.id) +
        '"><i class="bi bi-fingerprint"></i> Time in</button>';
    } else if (!record.timeOut) {
      actions =
        '<button class="btn btn-brand btn-row" type="button" data-time="out" data-account="' +
        UI.escape(row.account.id) +
        '"><i class="bi bi-stopwatch"></i> Time out</button>';
    } else {
      actions = '<span class="badge-soft"><i class="bi bi-check2-circle"></i> Complete</span>';
    }

    actions +=
      ' <button class="btn btn-icon" type="button" data-edit="' +
      UI.escape(row.account.id) +
      '" title="Edit attendance" aria-label="Edit attendance"><i class="bi bi-pencil"></i></button>';

    return actions;
  }

  function renderTable() {
    var tbody = $("attendanceBody");
    var rows = visibleRows();

    if (!rows.length) {
      tbody.innerHTML = UI.emptyRow(
        8,
        "bi-calendar2-check",
        "No attendance records",
        "No active staff match this date and filter combination."
      );
    } else {
      tbody.innerHTML = rows
        .map(function (row) {
          var record = row.record;
          var status = row.status;
          var variant = STATUS_VARIANTS[status] || "neutral";
          return (
            '<tr data-account="' + UI.escape(row.account.id) + '">' +
            "<td>" +
            '<div class="avatar-cell">' +
            '<span class="avatar avatar--sm ' + UI.avatarClass(row.account.role) + '">' + UI.escape(UI.initials(row.account.name)) + "</span>" +
            "<div>" +
            '<span class="avatar-cell__name">' + UI.escape(row.account.name) + "</span>" +
            '<span class="avatar-cell__meta">' + UI.escape(row.account.employeeId) + "</span>" +
            "</div></div></td>" +
            "<td>" + UI.roleBadge(row.account.role) + "</td>" +
            "<td>" + UI.escape(row.account.shift || "\u2014") + "</td>" +
            "<td>" +
            (record && record.timeIn
              ? '<span class="time-cell"><i class="bi bi-box-arrow-in-right text-app-success"></i>' + Store.formatTime(record.timeIn) + "</span>"
              : '<span class="text-app-muted">&mdash;</span>') +
            "</td>" +
            "<td>" +
            (record && record.timeOut
              ? '<span class="time-cell"><i class="bi bi-box-arrow-right text-app-danger"></i>' + Store.formatTime(record.timeOut) + "</span>"
              : '<span class="text-app-muted">&mdash;</span>') +
            "</td>" +
            '<td class="text-end text-tabular" data-sort-value="' + (record ? Number(record.hours) || 0 : 0) + '">' +
            (record && record.hours ? record.hours.toFixed(1) + " h" : "\u2014") +
            "</td>" +
            "<td>" + UI.statusBadge(status, variant) + "</td>" +
            '<td class="text-end text-nowrap">' + actionMarkup(row) + "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    $("attendanceCount").textContent =
      Store.number(rows.length) + (rows.length === 1 ? " staff member" : " staff");
    $("attendanceFoot").textContent =
      "Showing " + Store.number(rows.length) + " of " + Store.number(dayRows().length) + " staff for " + Store.formatDate(selectedDate);
  }

  function renderDate() {
    $("attendanceDate").value = selectedDate;
    $("attendanceDate").max = Store.todayISO();
    $("nextDate").disabled = selectedDate >= Store.todayISO();
    $("attendanceDayLabel").textContent = displayDate(selectedDate);
    if (!isAdmin) {
      var title = document.querySelector(".page-title");
      if (title) title.textContent = "My Attendance";
      $("attendanceSub").textContent =
        "Your time-in and time-out record for " + displayDate(selectedDate) + ".";
    } else {
      $("attendanceSub").textContent =
        "Attendance records for " + displayDate(selectedDate) + ".";
    }
    $("attendanceNote").innerHTML = selectedDate === Store.todayISO()
      ? '<i class="bi bi-broadcast"></i> Today'
      : '<i class="bi bi-clock-history"></i> Historical';
  }

  function renderAll() {
    renderDate();
    renderStats();
    renderTable();
  }

  /* -------------------------------- Actions ------------------------------- */

  function clockIn(accountId) {
    if (
      !isAdmin &&
      (!currentUser || accountId !== currentUser.id || selectedDate !== Store.todayISO())
    ) {
      UI.toast("You can only time in for yourself today.", {
        type: "warning",
        title: "Not allowed",
      });
      return;
    }
    var account = Store.findAccount(accountId);
    if (!account) return;

    var isToday = selectedDate === Store.todayISO();
    var time = isToday ? nowTime() : "07:45";
    var isLate = timeToMinutes(time) > 8 * 60;

    var result = isToday
      ? Store.clockIn(account.id, selectedDate, account.name)
      : Store.saveAttendance(account.id, selectedDate, {
          timeIn: "07:45",
          timeOut: null,
          status: isLate ? "Late" : "Present",
          note: "",
        });

    if (!result.ok) {
      UI.toast(result.message, { type: "danger", title: "Time in not recorded" });
      return;
    }

    renderAll();
    UI.toast(
      account.name + " timed in at " + Store.formatTime(time) + (isLate ? " (late)." : "."),
      { title: "Time in recorded" }
    );
  }

  function clockOut(accountId) {
    if (
      !isAdmin &&
      (!currentUser || accountId !== currentUser.id || selectedDate !== Store.todayISO())
    ) {
      UI.toast("You can only time out for yourself today.", {
        type: "warning",
        title: "Not allowed",
      });
      return;
    }
    var account = Store.findAccount(accountId);
    if (!account) return;
    var record = findRecord(account.id, selectedDate);
    if (!record || !record.timeIn) {
      UI.toast("Record a time in before timing out.", {
        type: "warning",
        title: "Missing time in",
      });
      return;
    }

    var isToday = selectedDate === Store.todayISO();
    var time = isToday ? nowTime() : "17:00";
    if (timeToMinutes(time) <= timeToMinutes(record.timeIn)) {
      UI.toast("Time out must be later than time in. Use Edit to correct the record.", {
        type: "danger",
        title: "Invalid time",
      });
      return;
    }

    var result = isToday
      ? Store.clockOut(account.id, selectedDate, account.name)
      : Store.saveAttendance(account.id, selectedDate, {
          timeIn: record.timeIn,
          timeOut: time,
          status: record.status === "Late" ? "Late" : "Present",
          note: record.note || "Recorded from attendance sheet",
        });

    if (!result.ok) {
      UI.toast(result.message, { type: "danger", title: "Time out not recorded" });
      return;
    }

    var hours = workedHours(record.timeIn, time);
    renderAll();
    UI.toast(
      account.name + " timed out at " + Store.formatTime(time) + " (" + hours.toFixed(1) + " h).",
      { title: "Time out recorded" }
    );
  }

  /* --------------------------------- Modal -------------------------------- */

  function openEditModal(accountId) {
    if (!isAdmin) return;
    var account = Store.findAccount(accountId);
    if (!account) return;
    editingKey = account.id;
    var record = findRecord(account.id, selectedDate);
    var form = $("attendanceForm");
    form.classList.remove("was-validated");
    $("attendanceError").classList.add("d-none");

    $("attendanceModalTitle").textContent = "Edit attendance";
    $("attendanceModalSub").textContent = displayDate(selectedDate);
    $("attendanceStaffName").textContent = account.name;
    $("attendanceStaffRole").textContent = account.role + " \u00B7 " + account.employeeId;

    $("attendanceStatusInput").value = record && record.status !== "Not recorded" ? record.status : "Present";
    $("attendanceTimeIn").value = record && record.timeIn ? record.timeIn : "";
    $("attendanceTimeOut").value = record && record.timeOut ? record.timeOut : "";
    $("attendanceNoteInput").value = record && record.note ? record.note : "";

    updateHoursPreview();
    bootstrap.Modal.getOrCreateInstance($("attendanceModal")).show();
  }

  function updateHoursPreview() {
    var timeIn = $("attendanceTimeIn").value;
    var timeOut = $("attendanceTimeOut").value;
    var status = $("attendanceStatusInput").value;
    var box = $("attendanceHoursPreview");
    var error = $("attendanceError");
    error.classList.add("d-none");

    if (status === "On Leave" || status === "Absent") {
      box.className = "alert-app";
      box.innerHTML =
        '<i class="bi bi-info-circle" aria-hidden="true"></i><div>Leave and absence records do not require time entries.</div>';
      return;
    }

    if (!timeIn && !timeOut) {
      box.className = "alert-app";
      box.innerHTML =
        '<i class="bi bi-hourglass-split" aria-hidden="true"></i><div>Worked hours are computed on save, excluding a one-hour break.</div>';
      return;
    }

    if (timeIn && timeOut && timeToMinutes(timeOut) <= timeToMinutes(timeIn)) {
      box.className = "alert-app alert-app--danger";
      box.innerHTML =
        '<i class="bi bi-exclamation-octagon" aria-hidden="true"></i><div>Time out must be later than time in.</div>';
      return;
    }

    var hours = workedHours(timeIn, timeOut);
    box.className = "alert-app";
    box.innerHTML =
      '<i class="bi bi-hourglass-split" aria-hidden="true"></i><div>Computed hours: <strong>' +
      (timeIn && timeOut ? hours.toFixed(1) + " h" : "pending time out") +
      "</strong> &middot; one-hour break excluded.</div>";
  }

  function saveAttendance(event) {
    event.preventDefault();
    if (!isAdmin) return;
    if (!editingKey) return;
    var account = Store.findAccount(editingKey);
    if (!account) return;

    var status = $("attendanceStatusInput").value;
    var timeIn = clampTime($("attendanceTimeIn").value);
    var timeOut = clampTime($("attendanceTimeOut").value);
    var note = $("attendanceNoteInput").value.trim();
    var error = $("attendanceError");

    if (status !== "On Leave" && status !== "Absent") {
      if (timeIn && timeOut && timeToMinutes(timeOut) <= timeToMinutes(timeIn)) {
        error.classList.remove("d-none");
        error.innerHTML =
          '<i class="bi bi-exclamation-octagon" aria-hidden="true"></i><div>Time out must be later than time in.</div>';
        UI.toast("Time out must be later than time in.", { type: "danger", title: "Check the times" });
        return;
      }
      if (timeOut && !timeIn) {
        error.classList.remove("d-none");
        error.innerHTML =
          '<i class="bi bi-exclamation-octagon" aria-hidden="true"></i><div>Add a time in before a time out.</div>';
        return;
      }
    }

    var record = {
      status: status,
      note: note,
      timeIn: null,
      timeOut: null,
    };

    if (status === "On Leave" || status === "Absent") {
      if (status === "On Leave" && !record.note) record.note = "Approved leave";
    } else {
      record.timeIn = timeIn || null;
      record.timeOut = timeOut || null;
    }

    var result = Store.saveAttendance(account.id, selectedDate, record);
    if (!result.ok) {
      UI.toast(result.message, { type: "danger", title: "Attendance not saved" });
      return;
    }

    bootstrap.Modal.getOrCreateInstance($("attendanceModal")).hide();
    renderAll();
    UI.toast(account.name + " attendance saved for " + Store.formatDate(selectedDate) + ".", {
      title: "Attendance updated",
    });
  }

  /* --------------------------------- Export ------------------------------- */

  function exportAttendance() {
    var rows = visibleRows().map(function (row) {
      var record = row.record;
      return [
        row.account.name,
        row.account.role,
        row.account.shift || "",
        selectedDate,
        record && record.timeIn ? record.timeIn : "",
        record && record.timeOut ? record.timeOut : "",
        record && record.hours ? record.hours.toFixed(1) : "0",
        row.status,
        record && record.note ? record.note : "",
      ];
    });

    UI.exportCSV(
      "guinhawa-attendance-" + selectedDate + ".csv",
      ["Staff", "Role", "Schedule", "Date", "Time in", "Time out", "Hours", "Status", "Note"],
      rows
    );
    UI.toast("Attendance CSV exported for " + Store.formatDate(selectedDate) + ".", {
      type: "info",
      title: "Export ready",
    });
  }

  /* --------------------------------- Events ------------------------------- */

  function setDate(value) {
    if (!value) return;
    selectedDate = value > Store.todayISO() ? Store.todayISO() : value;
    var next = new URL(window.location.href);
    next.searchParams.set("date", selectedDate);
    window.history.replaceState({}, "", next.pathname.split("/").pop() + "?" + next.searchParams.toString());
    renderAll();
  }

  function bindEvents() {
    $("attendanceDate").addEventListener("change", function (event) {
      setDate(event.target.value);
    });

    $("prevDate").addEventListener("click", function () {
      setDate(shiftDate(selectedDate, -1));
    });

    $("nextDate").addEventListener("click", function () {
      setDate(shiftDate(selectedDate, 1));
    });

    $("todayDate").addEventListener("click", function () {
      setDate(Store.todayISO());
    });

    $("attendanceSearch").addEventListener(
      "input",
      UI.debounce(function (event) {
        state.search = event.target.value;
        renderTable();
      }, 160)
    );

    $("attendanceFilter").addEventListener("change", function (event) {
      state.status = event.target.value;
      renderTable();
    });

    $("attendanceBody").addEventListener("click", function (event) {
      var timeButton = event.target.closest("[data-time]");
      if (timeButton) {
        if (timeButton.getAttribute("data-time") === "in") {
          clockIn(timeButton.getAttribute("data-account"));
        } else {
          clockOut(timeButton.getAttribute("data-account"));
        }
        return;
      }
      var editButton = event.target.closest("[data-edit]");
      if (editButton) openEditModal(editButton.getAttribute("data-edit"));
    });

    $("attendanceStatusInput").addEventListener("change", updateHoursPreview);
    $("attendanceTimeIn").addEventListener("input", updateHoursPreview);
    $("attendanceTimeOut").addEventListener("input", updateHoursPreview);
    $("attendanceForm").addEventListener("submit", saveAttendance);
    $("exportAttendance").addEventListener("click", exportAttendance);

    $("attendanceModal").addEventListener("hidden.bs.modal", function () {
      editingKey = null;
    });
  }

  /* ---------------------------------- Init -------------------------------- */

  function init() {
    renderAll();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
