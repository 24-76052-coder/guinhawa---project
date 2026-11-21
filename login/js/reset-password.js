/* ==========================================================================
   GUINHAWA — Staff reset password (two-step, one-time code)
   ========================================================================== */

(function (window, document) {
  "use strict";

  var Store = window.GuinhawaStore;
  var codeForm = document.getElementById("codeForm");
  var passwordForm = document.getElementById("passwordForm");
  if (!Store || !codeForm || !passwordForm) return;

  var identifierInput = document.getElementById("resetIdentifier");
  var codeInput = document.getElementById("resetCode");
  var verifyButton = document.getElementById("verifyButton");
  var saveButton = document.getElementById("savePasswordButton");
  var codeStatus = document.getElementById("codeStatus");
  var passwordStatus = document.getElementById("passwordStatus");
  var newPassword = document.getElementById("newPassword");
  var confirmPassword = document.getElementById("confirmPassword");
  var subtitle = document.getElementById("resetSubtitle");
  var successPanel = document.getElementById("successPanel");
  var successMessage = document.getElementById("successMessage");
  var resetLinks = document.getElementById("resetLinks");
  var resetNote = document.getElementById("resetNote");

  var identifier = "";

  function setStatus(element, message, type) {
    element.textContent = message || "";
    element.classList.remove("is-info", "is-error");
    if (type) element.classList.add(type === "error" ? "is-error" : "is-info");
  }

  function setBusy(button, labelText, busy, idleText) {
    var label = button.querySelector(".login-button__label");
    button.disabled = busy;
    button.classList.toggle("is-loading", busy);
    if (label) label.textContent = busy ? labelText : idleText;
  }

  function setInvalid(input, message) {
    var field = input.closest(".field");
    if (field) field.classList.toggle("is-invalid", !!message);
    var hint = field ? field.querySelector(".field__error") : null;
    if (hint) hint.textContent = message || "";
  }

  codeInput.addEventListener("input", function () {
    var raw = this.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    this.value = raw.length > 4 ? raw.slice(0, 4) + "-" + raw.slice(4) : raw;
    setInvalid(codeInput, "");
  });

  identifierInput.addEventListener("input", function () {
    setInvalid(identifierInput, "");
  });

  newPassword.addEventListener("input", function () {
    setInvalid(newPassword, "");
  });

  confirmPassword.addEventListener("input", function () {
    setInvalid(confirmPassword, "");
  });

  /* ------------------------------ Step 1 --------------------------------- */

  codeForm.addEventListener("submit", function (event) {
    event.preventDefault();

    identifier = identifierInput.value.trim();
    var code = codeInput.value.trim();

    if (!identifier) {
      setInvalid(identifierInput, "Enter your username or employee ID.");
      identifierInput.focus();
      return;
    }

    if (code.replace(/[^A-Za-z0-9]/g, "").length !== 8) {
      setInvalid(codeInput, "Enter the 8-character reset code.");
      codeInput.focus();
      return;
    }

    setBusy(verifyButton, "Verifying", true, "Verify code");
    setStatus(codeStatus, "Checking your one-time code\u2026", "info");

    Store.staffVerifyResetCode(identifier, code).then(function (result) {
      setBusy(verifyButton, "Verifying", false, "Verify code");

      if (!result.ok) {
        setStatus(codeStatus, result.message, "error");
        return;
      }

      setStatus(codeStatus, "", null);
      codeForm.classList.add("is-hidden");
      passwordForm.classList.remove("is-hidden");

      if (subtitle) {
        subtitle.textContent =
          "Code accepted. Choose a new password for " + identifier + ".";
      }

      window.setTimeout(function () {
        newPassword.focus();
      }, 80);
    });
  });

  /* ------------------------------ Step 2 --------------------------------- */

  passwordForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var value = newPassword.value;
    var confirmation = confirmPassword.value;

    if (value.length < 10) {
      setInvalid(newPassword, "Use at least 10 characters.");
      newPassword.focus();
      return;
    }
    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
      setInvalid(newPassword, "Include an uppercase letter, a lowercase letter and a number.");
      newPassword.focus();
      return;
    }
    if (value !== confirmation) {
      setInvalid(confirmPassword, "The two passwords do not match.");
      confirmPassword.focus();
      return;
    }

    setBusy(saveButton, "Saving", true, "Save new password");
    setStatus(passwordStatus, "Saving your new password\u2026", "info");

    Store.staffResetPassword(value, confirmation).then(function (result) {
      setBusy(saveButton, "Saving", false, "Save new password");

      if (!result.ok) {
        setStatus(passwordStatus, result.message, "error");
        return;
      }

      passwordForm.classList.add("is-hidden");
      if (resetLinks) resetLinks.classList.add("is-hidden");
      if (resetNote) resetNote.classList.add("is-hidden");

      if (subtitle) {
        subtitle.textContent =
          "Your password was changed and every other session was signed out.";
      }
      if (successMessage && result.body && result.body.username) {
        successMessage.textContent =
          "Sign in as @" + result.body.username + " with your new password.";
      }

      successPanel.classList.remove("is-hidden");
    });
  });
})(window, document);
