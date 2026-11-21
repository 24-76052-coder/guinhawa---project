/* ==========================================================================
   GUINHAWA — Admin & staff accounts
   ========================================================================== */

(function (window, document) {
  "use strict";

  var Store = window.GuinhawaStore;
  var UI = window.GuinhawaUI;
  if (!Store || !UI) return;

  var $ = function (id) {
    return document.getElementById(id);
  };

  var ROLE_CLASS = {
    Admin: "admin",
    "Inventory Staff": "staff",
    Cashier: "cashier",
  };

  var STANDARD_SCHEDULE = "8:00 AM \u2013 5:00 PM";

  var state = {
    search: UI.param("q"),
    role: "",
    status: "",
  };

  var editingId = null;
  var usernameTouched = false;
  var currentUser = Store.getCurrentUser();

  /* ------------------------------- Feedback ------------------------------- */

  function hasSwal() {
    return typeof window.Swal !== "undefined" && window.Swal && typeof window.Swal.fire === "function";
  }

  function notify(icon, title, text) {
    if (hasSwal()) {
      window.Swal.fire({
        toast: true,
        position: "top-end",
        icon: icon,
        title: title,
        text: text || "",
        showConfirmButton: false,
        timer: 3400,
        timerProgressBar: true,
      });
      return;
    }
    UI.toast(text || title, {
      type: icon === "error" ? "danger" : icon === "warning" ? "warning" : "success",
      title: title,
    });
  }

  function confirmAction(options) {
    if (hasSwal()) {
      var payload = {
        title: options.title,
        icon: options.icon || "question",
        showCancelButton: true,
        confirmButtonText: options.confirmText || "Confirm",
        cancelButtonText: options.cancelText || "Cancel",
        reverseButtons: true,
        focusCancel: true,
      };
      if (options.html) {
        payload.html = options.html;
      } else {
        payload.text = options.text || "";
      }
      return window.Swal.fire(payload).then(function (result) {
        return !!result.isConfirmed;
      });
    }
    return Promise.resolve(window.confirm(options.text || options.title || "Continue?"));
  }

  function htmlEscape(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /* ------------------------------- Rendering ------------------------------ */

  function filteredAccounts() {
    var q = state.search.trim().toLowerCase();
    return Store.data.accounts.filter(function (account) {
      if (state.role && account.role !== state.role) return false;
      if (state.status && account.status !== state.status) return false;
      if (!q) return true;
      return (
        account.name + " " +
        (account.username || "") + " " +
        (account.email || "") + " " +
        (account.phone || "") + " " +
        account.employeeId + " " +
        account.role
      )
        .toLowerCase()
        .indexOf(q) > -1;
    });
  }

  function renderStats() {
    var accounts = Store.data.accounts;
    $("statAccounts").textContent = Store.number(accounts.length);
    $("statAdmins").textContent = Store.number(
      accounts.filter(function (a) {
        return a.role === "Admin";
      }).length
    );
    $("statInventory").textContent = Store.number(
      accounts.filter(function (a) {
        return a.role === "Inventory Staff";
      }).length
    );
    $("statCashiers").textContent = Store.number(
      accounts.filter(function (a) {
        return a.role === "Cashier";
      }).length
    );
  }

  function isProtected(account) {
    return account.role === "Admin" || account.id === currentUser.id;
  }

  function renderTable() {
    var tbody = $("accountsBody");
    var rows = filteredAccounts();

    if (!rows.length) {
      tbody.innerHTML = UI.emptyRow(
        8,
        "bi-people",
        "No accounts match",
        "Adjust the search or filters. Only Admins can create new team accounts."
      );
    } else {
      tbody.innerHTML = rows
        .map(function (account) {
          var statusVariant =
            account.status === "Active"
              ? "success"
              : account.status === "Pending Activation"
              ? "warning"
              : "neutral";
          var initials = UI.initials(account.name);
          var protectedRow = isProtected(account);
          var actions =
            '<button class="btn btn-icon" type="button" data-edit="' + UI.escape(account.id) + '" title="Edit account" aria-label="Edit account"><i class="bi bi-pencil"></i></button> ';
          if (account.role === "Admin") {
            actions +=
              '<button class="btn btn-icon" type="button" disabled title="Administrator password is managed by the owner" aria-label="Reset password unavailable"><i class="bi bi-key"></i></button> ';
            actions +=
              '<button class="btn btn-icon" type="button" disabled title="Administrator accounts cannot be deactivated" aria-label="Deactivate unavailable"><i class="bi bi-lock"></i></button>';
          } else if (account.status === "Pending Activation") {
            actions +=
              '<button class="btn btn-icon" type="button" data-resend="' + UI.escape(account.id) + '" title="Resend activation link" aria-label="Resend activation link"><i class="bi bi-send"></i></button> ';
            actions +=
              '<button class="btn btn-icon btn-icon--danger" type="button" data-cancel="' + UI.escape(account.id) + '" title="Cancel invitation" aria-label="Cancel invitation"><i class="bi bi-x-lg"></i></button>';
          } else {
            actions +=
              '<button class="btn btn-icon ' + (account.status === "Active" ? "btn-icon--danger" : "btn-icon--success") + '" type="button" data-toggle="' + UI.escape(account.id) + '" title="' + (account.status === "Active" ? "Deactivate account" : "Activate account") + '" aria-label="' + (account.status === "Active" ? "Deactivate account" : "Activate account") + '"><i class="bi bi-' + (account.status === "Active" ? "pause" : "play") + '"></i></button>';
            actions +=
              ' <button class="btn btn-icon btn-icon--danger" type="button" data-delete="' + UI.escape(account.id) + '" title="Delete staff (kept in archive)" aria-label="Delete staff"><i class="bi bi-trash3"></i></button>';
          }

          return (
            '<tr data-id="' + UI.escape(account.id) + '">' +
            "<td>" +
            '<div class="avatar-cell">' +
            '<span class="avatar ' + UI.avatarClass(account.role) + '">' + UI.escape(initials) + "</span>" +
            "<div>" +
            '<span class="avatar-cell__name">' + UI.escape(account.name) + (protectedRow ? ' <i class="bi bi-patch-check-fill text-app-success" title="Protected account" aria-label="Protected account"></i>' : "") + "</span>" +
            '<span class="avatar-cell__meta">' + UI.escape(account.email || "\u2014") + "</span>" +
            "</div></div></td>" +
            '<td class="text-tabular">' + UI.escape(account.employeeId) + "</td>" +
            '<td class="text-nowrap"><span style="font-family:Consolas,monospace;font-size:.8rem">@' + UI.escape(account.username || "\u2014") + "</span></td>" +
            "<td>" + UI.roleBadge(account.role) + "</td>" +
            '<td class="text-nowrap">' + UI.escape(account.phone || "\u2014") + "</td>" +
            '<td class="text-nowrap" data-sort-value="' + UI.escape(account.lastActive || "") + '">' + (account.status === "Pending Activation" ? '<span class="text-app-muted">Awaiting activation</span>' : Store.formatDateTime(account.lastActive)) + "</td>" +
            "<td>" + UI.statusBadge(account.status, statusVariant) + "</td>" +
            '<td class="text-end text-nowrap">' + actions + "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    $("accountCount").textContent =
      Store.number(rows.length) + (rows.length === 1 ? " account" : " accounts");
    $("accountsFoot").textContent =
      "Showing " + Store.number(rows.length) + " of " + Store.number(Store.data.accounts.length) + " accounts";
  }

  function renderAll() {
    renderStats();
    renderTable();
  }

  /* -------------------------------- Accounts ------------------------------ */

  function nextEmployeeId(role) {
    var prefix = role === "Cashier" ? "CST-" : "INV-";
    var highest = 0;
    Store.data.accounts.forEach(function (account) {
      if (account.employeeId && account.employeeId.indexOf(prefix) === 0) {
        var value = Number(account.employeeId.replace(prefix, ""));
        if (!isNaN(value)) highest = Math.max(highest, value);
      }
    });
    return prefix + String(highest + 1).padStart(3, "0");
  }

  function roleHelpText(role) {
    if (role === "Cashier") {
      return "Cashiers can record sales and view receipts.";
    }
    return "Inventory staff can receive and release stock.";
  }

  function normalizeUsername(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function suggestUsername(name) {
    return normalizeUsername(name)
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .replace(/\.{2,}/g, ".");
  }

  function usernameTaken(value) {
    var key = normalizeUsername(value);
    if (!key) return false;
    return Store.data.accounts.some(function (account) {
      return account.id !== editingId && normalizeUsername(account.username) === key;
    });
  }

  function openModal(accountId) {
    editingId = accountId || null;
    usernameTouched = false;
    var form = $("accountForm");
    form.reset();
    form.classList.remove("was-validated");

    var roleSelect = $("accountRoleInput");
    var note = $("activationNote");
    var saveLabel = $("saveAccountLabel");

    $("accountEmployeeId").readOnly = true;

    if (accountId) {
      var account = Store.findAccount(accountId);
      if (!account) return;
      $("accountModalTitle").textContent = "Edit staff account";
      $("accountModalSub").textContent = account.role + " account";
      $("accountName").value = account.name;
      $("accountEmployeeId").value = account.employeeId;
      $("accountUsername").value = account.username || "";
      $("accountEmail").value = account.email || "";
      $("accountPhone").value = account.phone || "";
      roleSelect.value = account.role;
      usernameTouched = true;
      if (note) note.classList.add("d-none");
      if (saveLabel) saveLabel.textContent = "Save changes";

      if (account.role === "Admin") {
        roleSelect.disabled = true;
        $("roleHelp").textContent = "Administrator role and status are protected.";
      } else {
        roleSelect.disabled = false;
        $("roleHelp").textContent = roleHelpText(account.role);
      }
    } else {
      $("accountModalTitle").textContent = "Add new staff";
      $("accountModalSub").textContent = "Inventory Staff and Cashier accounts only";
      roleSelect.disabled = false;
      roleSelect.value = "Inventory Staff";
      $("accountEmployeeId").value = nextEmployeeId("Inventory Staff");
      $("accountUsername").value = "";
      $("accountName").value = "";
      $("accountEmail").value = "";
      $("accountPhone").value = "";
      $("roleHelp").textContent = roleHelpText("Inventory Staff");
      if (note) note.classList.remove("d-none");
      if (saveLabel) saveLabel.textContent = "Create staff account";
    }

    bootstrap.Modal.getOrCreateInstance($("accountModal")).show();
  }

  function validateAccount() {
    var form = $("accountForm");
    var valid = form.checkValidity();

    var email = $("accountEmail").value.trim().toLowerCase();
    var emailTaken =
      !!email &&
      Store.data.accounts.some(function (account) {
        return (
          account.id !== editingId &&
          String(account.email || "").toLowerCase() === email
        );
      });

    var employeeId = $("accountEmployeeId").value.trim().toUpperCase();
    var idTaken = Store.data.accounts.some(function (account) {
      return account.id !== editingId && account.employeeId.toUpperCase() === employeeId;
    });

    var username = normalizeUsername($("accountUsername").value);
    var duplicateUsername = usernameTaken(username);
    var usernameField = $("accountUsername");

    if (duplicateUsername) {
      usernameField.setCustomValidity("This username is already taken.");
      usernameField.classList.add("is-invalid");
      valid = false;
    } else {
      usernameField.setCustomValidity("");
      usernameField.classList.remove("is-invalid");
    }

    $("accountEmail").setCustomValidity(emailTaken ? "Email already in use." : "");
    $("accountEmail").classList.toggle("is-invalid", emailTaken);
    $("accountEmployeeId").setCustomValidity(idTaken ? "Employee ID already in use." : "");
    $("accountEmployeeId").classList.toggle("is-invalid", idTaken);

    if (emailTaken) {
      notify("warning", "Duplicate email", "That email is already assigned to a team account.");
    }
    if (idTaken) {
      notify("warning", "Duplicate employee ID", "That employee ID is already in use.");
    }
    if (duplicateUsername) {
      notify("warning", "Duplicate username", "Choose a different username; usernames must be unique.");
    }

    form.classList.add("was-validated");
    return valid && !emailTaken && !idTaken && !duplicateUsername;
  }

  function collectValues() {
    return {
      name: $("accountName").value.trim(),
      employeeId: $("accountEmployeeId").value.trim().toUpperCase(),
      username: normalizeUsername($("accountUsername").value),
      email: $("accountEmail").value.trim().toLowerCase(),
      phone: $("accountPhone").value.trim(),
      role: $("accountRoleInput").value,
    };
  }

  function saveAccount(event) {
    event.preventDefault();
    if (!validateAccount()) return;

    var values = collectValues();
    if (values.role === "Admin" && !editingId) {
      notify("error", "Role not allowed", "Admin accounts are provisioned by the system owner.");
      return;
    }

    if (editingId) {
      var editResult = Store.saveAccount(values, editingId);
      if (!editResult.ok) {
        notify("error", "Account not saved", editResult.message);
        return;
      }
      bootstrap.Modal.getOrCreateInstance($("accountModal")).hide();
      renderAll();
      notify("success", "Account saved", values.name + " was updated.");
      return;
    }

    confirmAction({
      title: "Create this staff account?",
      html:
        "<p class=\"mb-2\">" +
        "<strong>" + htmlEscape(values.name) + "</strong> will be added as a <strong>" +
        htmlEscape(values.role) + "</strong> (" + htmlEscape(values.employeeId) + ").</p>" +
        "<p class=\"mb-0\">A notification email with the Employee ID, username and login link " +
        "will be sent to <strong>" + htmlEscape(values.email) + "</strong>.</p>",
      icon: "question",
      confirmText: "Create account",
      cancelText: "Review details",
    }).then(function (confirmed) {
      if (!confirmed) return;

      var result = Store.saveAccount(values, null);
      if (!result.ok) {
        notify("error", "Account not created", result.message);
        return;
      }

      bootstrap.Modal.getOrCreateInstance($("accountModal")).hide();
      renderAll();
      showAccountReadyResult(values, result.notification || {});
    });
  }

  function showAccountReadyResult(values, notification) {
    var email = notification.email || values.email;
    var sent = notification.sent === true;
    var body =
      "<p class=\"mb-2\"><strong>" + htmlEscape(values.name) + "</strong> was created as a <strong>" +
      htmlEscape(values.role) + "</strong> account and is now <strong>Active</strong>.</p>" +
      (sent
        ? "<p class=\"mb-0\">A notification email with the Employee ID, username and login link was sent to <strong>" +
          htmlEscape(email) + "</strong>. The staff member can sign in, and can use <strong>Forgot password</strong> whenever they need to set or reset their password.</p>"
        : "<p class=\"mb-0\">The account is ready, but the notification email could not be sent. Configure Gmail in <strong>Settings &gt; Email delivery</strong>. " +
          "Give the staff member their Employee ID (<strong>" + htmlEscape(values.employeeId) +
          "</strong>) and username (<strong>@" + htmlEscape(values.username) + "</strong>), and ask them to use " +
          "<strong>Forgot password</strong> on the login page once email delivery is configured.</p>");

    if (hasSwal()) {
      window.Swal.fire({
        icon: sent ? "success" : "warning",
        title: sent ? "Account created" : "Account created, email not sent",
        html: body,
        confirmButtonText: "Got it",
      });
      return;
    }
    UI.toast(values.name + "'s account is ready.", {
      type: sent ? "success" : "warning",
      title: sent ? "Account created" : "Account created, email not sent",
    });
  }

  function resendActivation(id) {
    var account = Store.findAccount(id);
    if (!account) return;

    confirmAction({
      title: "Resend activation link?",
      text:
        account.name + " will receive a new activation link by email. Any earlier link stops working.",
      icon: "question",
      confirmText: "Resend link",
      cancelText: "Cancel",
    }).then(function (confirmed) {
      if (!confirmed) return;
      var result = Store.resendActivation(id);
      if (!result.ok) {
        notify("error", "Link not sent", result.message);
        return;
      }
      renderAll();
      renderActivations();
      if (result.activation && result.activation.sent === false) {
        notify("warning", "Email not sent", result.activation.error || result.message);
      } else {
        notify("success", "Activation link sent", "A fresh link is on its way to " + account.email + ".");
      }
    });
  }

  function cancelActivation(id) {
    var account = Store.findAccount(id);
    if (!account) return;

    confirmAction({
      title: "Cancel this invitation?",
      text:
        account.name + " will no longer be able to activate the account with the emailed link. You can create a new invitation later.",
      icon: "warning",
      confirmText: "Cancel invitation",
      cancelText: "Keep invitation",
    }).then(function (confirmed) {
      if (!confirmed) return;
      var result = Store.cancelActivation(id);
      if (!result.ok) {
        notify("error", "Invitation not cancelled", result.message);
        return;
      }
      renderAll();
      renderActivations();
      notify("success", "Invitation cancelled", account.name + " is now inactive.");
    });
  }

  function toggleAccount(id) {
    var account = Store.findAccount(id);
    if (!account) return;
    if (isProtected(account)) {
      notify("warning", "Protected account", "Administrator accounts cannot be deactivated.");
      return;
    }

    var activating = account.status !== "Active";
    confirmAction({
      title: (activating ? "Activate" : "Deactivate") + " account?",
      text: activating
        ? account.name + " will regain access to the console."
        : account.name + " will no longer be able to sign in. Their past sales and attendance records stay intact.",
      confirmText: activating ? "Activate account" : "Deactivate account",
      cancelText: "Cancel",
      icon: "question",
    }).then(function (confirmed) {
      if (!confirmed) return;
      var result = Store.setAccountStatus(id, activating);
      if (!result.ok) {
        notify("error", "Account not updated", result.message);
        return;
      }
      renderAll();
      notify(activating ? "success" : "warning", "Account updated", account.name + " is now " + (activating ? "active" : "inactive") + ".");
    });
  }

  /* --------------------------- Pending activations ------------------------ */

  function parseDbDate(value) {
    if (!value) return null;
    var text = String(value).trim().replace(" ", "T");
    var date = new Date(text);
    return isNaN(date.getTime()) ? null : date;
  }

  function renderActivations() {
    var tbody = $("activationBody");
    if (!tbody) return;

    var result = Store.pendingActivations();
    var activations = result.activations || [];

    var count = $("activationCount");
    if (count) count.textContent = Store.number(activations.length);

    var panel = $("activationPanel");
    if (panel) panel.classList.toggle("d-none", !activations.length);

    if (!activations.length) {
      tbody.innerHTML = UI.emptyRow(
        6,
        "bi-envelope-paper",
        "No pending activations",
        "Legacy staff invitations appear here until their emailed activation link is used."
      );
      return;
    }

    var now = Date.now();
    tbody.innerHTML = activations
      .map(function (account) {
        var dbId = Number(account.id) || 0;
        var accountKey = "acc" + dbId;
        var sent = parseDbDate(account.activationSentAt);
        var expires = parseDbDate(account.activationExpiresAt);
        var expired = expires ? expires.getTime() < now : false;
        var roleLabel = account.roleLabel || (account.role === "Inventory Staff" ? "Inventory Staff" : "Cashier");

        var expiryCell = expires
          ? '<span class="' + (expired ? "text-app-danger" : "text-app-muted") + '">' +
            (expired ? "Expired " : "") + UI.escape(Store.formatDateTime(account.activationExpiresAt)) +
            "</span>"
          : '<span class="text-app-muted">No link sent</span>';

        var actions =
          '<button class="btn btn-icon" type="button" data-resend="' + UI.escape(accountKey) + '" title="Resend activation link" aria-label="Resend activation link"><i class="bi bi-send"></i></button> ' +
          '<button class="btn btn-icon btn-icon--danger" type="button" data-cancel="' + UI.escape(accountKey) + '" title="Cancel invitation" aria-label="Cancel invitation"><i class="bi bi-x-lg"></i></button>';

        return (
          '<tr data-id="' + dbId + '">' +
          "<td>" +
          '<div class="avatar-cell">' +
          '<span class="avatar ' + UI.avatarClass(roleLabel) + '">' + UI.escape(UI.initials(account.fullName || account.name)) + "</span>" +
          "<div>" +
          '<span class="avatar-cell__name">' + UI.escape(account.fullName || account.name) + "</span>" +
          '<span class="avatar-cell__meta">' + UI.escape(account.employeeId) + " &middot; @" + UI.escape(account.username) + "</span>" +
          "</div></div></td>" +
          '<td class="text-nowrap">' + UI.escape(account.email || "\u2014") + "</td>" +
          "<td>" + UI.roleBadge(roleLabel) + "</td>" +
          '<td class="text-nowrap">' + (sent ? UI.escape(Store.formatDateTime(account.activationSentAt)) : '<span class="text-app-muted">\u2014</span>') + "</td>" +
          '<td class="text-nowrap">' + expiryCell + "</td>" +
          '<td class="text-end text-nowrap">' + actions + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  /* ----------------------------- Archived staff --------------------------- */

  var archivedRows = [];

  function archivedAccount(id) {
    return archivedRows.filter(function (row) {
      return Number(row.id) === Number(id);
    })[0];
  }

  function renderArchived() {
    var panel = $("archivedPanel");
    var tbody = $("archivedBody");
    if (!panel || !tbody) return;

    var result = Store.archivedStaff();
    archivedRows = result.archived || [];

    var count = $("archivedCount");
    if (count) count.textContent = Store.number(archivedRows.length);

    panel.classList.toggle("d-none", archivedRows.length === 0);
    if (!archivedRows.length) {
      tbody.innerHTML = "";
      return;
    }

    tbody.innerHTML = archivedRows
      .map(function (account) {
        var dbId = Number(account.id) || 0;
        var roleLabel = account.roleLabel || account.role || "Staff";
        var actions =
          '<button class="btn btn-icon" type="button" data-view-archived="' + dbId + '" title="View saved record" aria-label="View saved record"><i class="bi bi-eye"></i></button> ' +
          '<button class="btn btn-icon btn-icon--success" type="button" data-restore="' + dbId + '" title="Restore staff record" aria-label="Restore staff record"><i class="bi bi-arrow-counterclockwise"></i></button>';

        return (
          '<tr data-id="' + dbId + '">' +
          "<td>" +
          '<div class="avatar-cell">' +
          '<span class="avatar ' + UI.avatarClass(roleLabel) + '">' + UI.escape(UI.initials(account.fullName || account.name)) + "</span>" +
          "<div>" +
          '<span class="avatar-cell__name">' + UI.escape(account.fullName || account.name) + "</span>" +
          '<span class="avatar-cell__meta">' + UI.escape(account.username ? "@" + account.username : "\u2014") + " &middot; " + UI.escape(account.email || "\u2014") + "</span>" +
          "</div></div></td>" +
          '<td class="text-tabular">' + UI.escape(account.employeeId) + "</td>" +
          "<td>" + UI.roleBadge(roleLabel) + "</td>" +
          '<td class="text-nowrap">' + (account.dateJoined ? UI.escape(Store.formatDate(account.dateJoined)) : '<span class="text-app-muted">\u2014</span>') + "</td>" +
          '<td class="text-nowrap">' + (account.deletedAt ? UI.escape(Store.formatDateTime(account.deletedAt)) : '<span class="text-app-muted">\u2014</span>') + "</td>" +
          '<td class="text-nowrap">' + UI.escape(account.deletedBy || "Administrator") + "</td>" +
          '<td class="text-end text-nowrap">' + actions + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function showArchivedRecord(id) {
    var account = archivedAccount(id);
    if (!account) return;

    var rows = [
      ["Staff member", account.fullName || account.name],
      ["Employee ID", account.employeeId],
      ["Username", "@" + (account.username || "\u2014")],
      ["Work email", account.email || "\u2014"],
      ["Phone", account.contactNumber || "\u2014"],
      ["Role", account.roleLabel || account.role || "\u2014"],
      ["Work schedule", STANDARD_SCHEDULE],
      ["Date joined", account.dateJoined ? Store.formatDate(account.dateJoined) : "\u2014"],
      ["Last active", account.lastLoginAt ? Store.formatDateTime(account.lastLoginAt) : "Never signed in"],
      ["Deleted on", account.deletedAt ? Store.formatDateTime(account.deletedAt) : "\u2014"],
      ["Deleted by", account.deletedBy || "Administrator"],
    ];

    var html =
      '<div style="display:grid;gap:8px;text-align:left">' +
      rows
        .map(function (row) {
          return (
            '<div style="display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid rgba(148,163,184,.18);padding-bottom:6px">' +
            '<span style="opacity:.7">' + htmlEscape(row[0]) + "</span>" +
            '<strong style="text-align:right">' + htmlEscape(row[1]) + "</strong>" +
            "</div>"
          );
        })
        .join("") +
      "</div>" +
      '<p style="margin:14px 0 0;font-size:.82rem;opacity:.75">This is a read-only backup. ' +
      "Sales, attendance and audit history still point to this staff member. " +
      "Use Restore to bring the record back into the team directory.</p>";

    if (hasSwal()) {
      window.Swal.fire({
        title: "Saved staff record",
        html: html,
        width: 560,
        confirmButtonText: "Close",
      });
      return;
    }
    UI.toast("This record is archived and kept as a backup.", { title: "Archived staff" });
  }

  function restoreArchived(id) {
    var account = archivedAccount(id);
    if (!account) return;
    var name = account.fullName || account.name || "This staff member";

    confirmAction({
      title: "Restore this staff record?",
      html:
        "<p class=\"mb-2\"><strong>" + htmlEscape(name) + "</strong> will return to the team directory with all saved details.</p>" +
        "<p class=\"mb-0\">The account comes back as <strong>Inactive</strong>. Activate it when the staff member is ready to sign in again.</p>",
      icon: "question",
      confirmText: "Restore record",
      cancelText: "Cancel",
    }).then(function (confirmed) {
      if (!confirmed) return;

      var result = Store.restoreAccount(id);
      if (!result.ok) {
        notify("error", "Record not restored", result.message);
        return;
      }

      renderAll();
      renderArchived();
      notify("success", "Record restored", name + " is back in the team directory as inactive.");
    });
  }

  function deleteStaffAccount(id) {
    var account = Store.findAccount(id);
    if (!account) return;
    if (isProtected(account)) {
      notify("warning", "Protected account", "Administrator accounts cannot be deleted.");
      return;
    }

    confirmAction({
      title: "Delete this staff account?",
      html:
        "<p class=\"mb-2\"><strong>" + htmlEscape(account.name) + "</strong> (" + htmlEscape(account.employeeId) + ") will be removed from the team directory and can no longer sign in.</p>" +
        "<p class=\"mb-2\">Nothing is erased: personal details, sales, attendance and audit history are kept in <strong>Archived staff</strong>.</p>" +
        "<p class=\"mb-0\">You can restore the record later if needed.</p>",
      icon: "warning",
      confirmText: "Delete and archive",
      cancelText: "Keep account",
    }).then(function (confirmed) {
      if (!confirmed) return;

      var result = Store.deleteAccount(id);
      if (!result.ok) {
        notify("error", "Account not deleted", result.message);
        return;
      }

      renderAll();
      renderArchived();
      notify(
        "success",
        "Account deleted",
        account.name + " was moved to Archived staff as a backup."
      );
    });
  }

  function exportAccounts() {
    var rows = filteredAccounts().map(function (account) {
      return [
        account.name,
        account.employeeId,
        account.username || "",
        account.email || "",
        account.phone || "",
        account.role,
        account.status,
        account.joined,
        account.lastActive || "",
      ];
    });

    UI.exportCSV(
      "guinhawa-accounts-" + Store.todayISO() + ".csv",
      ["Name", "Employee ID", "Username", "Email", "Phone", "Role", "Status", "Joined", "Last active"],
      rows
    );
    UI.toast("Account CSV exported.", {
      type: "info",
      title: "Export ready",
    });
  }

  /* --------------------------------- Events ------------------------------- */

  function bindEvents() {
    var debouncedRender = UI.debounce(renderTable, 160);

    $("accountSearch").addEventListener("input", function (event) {
      state.search = event.target.value;
      debouncedRender();
    });

    $("accountRole").addEventListener("change", function (event) {
      state.role = event.target.value;
      renderTable();
    });

    $("accountStatus").addEventListener("change", function (event) {
      state.status = event.target.value;
      renderTable();
    });

    $("clearAccountFilters").addEventListener("click", function () {
      state = { search: "", role: "", status: "" };
      $("accountSearch").value = "";
      $("accountRole").value = "";
      $("accountStatus").value = "";
      renderTable();
    });

    $("addAccountBtn").addEventListener("click", function () {
      openModal(null);
    });

    $("exportAccounts").addEventListener("click", exportAccounts);
    $("accountForm").addEventListener("submit", saveAccount);

    $("accountRoleInput").addEventListener("change", function (event) {
      $("roleHelp").textContent = roleHelpText(event.target.value);
      if (!editingId) {
        $("accountEmployeeId").value = nextEmployeeId(event.target.value);
      }
    });

    $("accountName").addEventListener("input", function () {
      if (editingId || usernameTouched) return;
      $("accountUsername").value = suggestUsername(this.value);
    });

    $("accountUsername").addEventListener("input", function () {
      usernameTouched = true;
      this.setCustomValidity("");
      this.classList.remove("is-invalid");
    });

    $("accountsBody").addEventListener("click", function (event) {
      var editButton = event.target.closest("[data-edit]");
      if (editButton) {
        openModal(editButton.getAttribute("data-edit"));
        return;
      }
      var resendButton = event.target.closest("[data-resend]");
      if (resendButton) {
        resendActivation(resendButton.getAttribute("data-resend"));
        return;
      }
      var cancelButton = event.target.closest("[data-cancel]");
      if (cancelButton) {
        cancelActivation(cancelButton.getAttribute("data-cancel"));
        return;
      }
      var toggleButton = event.target.closest("[data-toggle]");
      if (toggleButton) {
        toggleAccount(toggleButton.getAttribute("data-toggle"));
        return;
      }
      var deleteButton = event.target.closest("[data-delete]");
      if (deleteButton) {
        deleteStaffAccount(deleteButton.getAttribute("data-delete"));
      }
    });

    var activationBody = $("activationBody");
    if (activationBody) {
      activationBody.addEventListener("click", function (event) {
        var resendButton = event.target.closest("[data-resend]");
        if (resendButton) {
          resendActivation(resendButton.getAttribute("data-resend"));
          return;
        }
        var cancelButton = event.target.closest("[data-cancel]");
        if (cancelButton) {
          cancelActivation(cancelButton.getAttribute("data-cancel"));
        }
      });
    }

    var archivedBody = $("archivedBody");
    if (archivedBody) {
      archivedBody.addEventListener("click", function (event) {
        var viewButton = event.target.closest("[data-view-archived]");
        if (viewButton) {
          showArchivedRecord(viewButton.getAttribute("data-view-archived"));
          return;
        }
        var restoreButton = event.target.closest("[data-restore]");
        if (restoreButton) {
          restoreArchived(restoreButton.getAttribute("data-restore"));
        }
      });
    }

    $("accountModal").addEventListener("hidden.bs.modal", function () {
      editingId = null;
      var roleSelect = $("accountRoleInput");
      roleSelect.disabled = false;
      $("accountForm").classList.remove("was-validated");
    });
  }

  /* ---------------------------------- Init -------------------------------- */

  function init() {
    renderAll();
    renderActivations();
    renderArchived();
    bindEvents();
    $("accountSearch").value = state.search;
    if (state.search) renderTable();

    if (currentUser.role !== "Admin") {
      $("addAccountBtn").disabled = true;
      $("addAccountBtn").title = "Only Admins can add team accounts";
      UI.toast("Only Admin accounts can create staff or cashier accounts.", {
        type: "warning",
        title: "Restricted action",
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
