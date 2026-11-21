/* ==========================================================================
   GUINHAWA — Password recovery by email (OTP)
   ========================================================================== */

(function (window, document) {
  "use strict";

  var Store = window.GuinhawaStore;

  var emailForm = document.getElementById("emailForm");
  var otpForm = document.getElementById("otpForm");
  var passwordForm = document.getElementById("passwordForm");
  var successPanel = document.getElementById("successPanel");
  var forgotLinks = document.getElementById("forgotLinks");
  var forgotNote = document.getElementById("forgotNote");
  var subtitle = document.getElementById("forgotSubtitle");

  if (!Store || !emailForm || !otpForm || !passwordForm) return;

  var emailInput = document.getElementById("email");
  var otpInput = document.getElementById("otp");
  var newPassword = document.getElementById("newPassword");
  var confirmPassword = document.getElementById("confirmPassword");

  var sendCodeButton = document.getElementById("sendCodeButton");
  var verifyButton = document.getElementById("verifyButton");
  var savePasswordButton = document.getElementById("savePasswordButton");
  var resendButton = document.getElementById("resendButton");
  var resendLabel = document.getElementById("resendLabel");
  var changeEmailButton = document.getElementById("changeEmailButton");
  var otpEmail = document.getElementById("otpEmail");
  var successMessage = document.getElementById("successMessage");

  var emailStatus = document.getElementById("emailStatus");
  var otpStatus = document.getElementById("otpStatus");
  var passwordStatus = document.getElementById("passwordStatus");

  var emailError = document.getElementById("email-error");
  var otpError = document.getElementById("otp-error");
  var newPasswordError = document.getElementById("newPassword-error");
  var confirmPasswordError = document.getElementById("confirmPassword-error");

  var state = {
    email: "",
    timer: null,
  };

  /* -------------------------------- Helpers ------------------------------- */

  function setStatus(element, message, type) {
    if (!element) return;
    element.textContent = message || "";
    element.classList.remove("is-info", "is-error");
    if (type) element.classList.add(type === "error" ? "is-error" : "is-info");
  }

  function setBusy(button, busy, busyLabel, idleLabel) {
    if (!button) return;
    var label = button.querySelector(".login-button__label");
    button.disabled = busy;
    button.classList.toggle("is-loading", busy);
    if (label) label.textContent = busy ? busyLabel : idleLabel;
  }

  function fieldOf(input) {
    return input ? input.closest(".field") : null;
  }

  function clearFieldError(input, errorElement) {
    var field = fieldOf(input);
    if (field) field.classList.remove("is-invalid");
    if (errorElement) errorElement.textContent = "";
  }

  function fieldError(input, errorElement, message) {
    var field = fieldOf(input);
    if (field) field.classList.add("is-invalid");
    if (errorElement) errorElement.textContent = message;
    if (input) input.focus();
  }

  function showStep(step) {
    emailForm.classList.toggle("is-hidden", step !== "email");
    otpForm.classList.toggle("is-hidden", step !== "otp");
    passwordForm.classList.toggle("is-hidden", step !== "password");
    successPanel.classList.toggle("is-hidden", step !== "success");
    if (forgotLinks) forgotLinks.classList.toggle("is-hidden", step === "success");

    if (step === "email") {
      subtitle.textContent =
        "Enter the email registered to your account. We will send a 6-digit verification code so you can choose a new password.";
      if (forgotNote) {
        forgotNote.textContent =
          "Codes work once, expire after 5 minutes and allow 5 attempts. Only the registered email address can receive a code.";
      }
      emailInput.focus();
    } else if (step === "otp") {
      subtitle.textContent = "Check your inbox and enter the 6-digit code from the email.";
      if (forgotNote) {
        forgotNote.textContent =
          "Did not receive it? Check the spam folder, wait for the countdown, then resend. Codes expire after 5 minutes.";
      }
      otpInput.focus();
    } else if (step === "password") {
      subtitle.textContent = "Your code was verified. Choose a new password you have not used before.";
      if (forgotNote) {
        forgotNote.textContent =
          "Your password is stored as a one-way hash. Guinhawa staff will never ask you to share it.";
      }
      newPassword.focus();
    }
  }

  function stopCooldown() {
    if (state.timer) {
      window.clearInterval(state.timer);
      state.timer = null;
    }
  }

  function startCooldown(seconds) {
    stopCooldown();
    var remaining = Math.max(1, Number(seconds) || 60);
    resendButton.disabled = true;
    resendLabel.textContent = "Resend code in " + remaining + "s";

    state.timer = window.setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        stopCooldown();
        resendButton.disabled = false;
        resendLabel.textContent = "Resend code";
        return;
      }
      resendLabel.textContent = "Resend code in " + remaining + "s";
    }, 1000);
  }

  function wirePasswordToggle(buttonId, input) {
    var button = document.getElementById(buttonId);
    if (!button || !input) return;

    button.addEventListener("click", function () {
      var visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.classList.toggle("is-visible", !visible);
      button.setAttribute("aria-pressed", String(!visible));
      button.setAttribute("aria-label", visible ? "Show password" : "Hide password");
      input.focus();
    });
  }

  /* ------------------------------ Step 1: email --------------------------- */

  function requestCode(event, isResend) {
    if (event) event.preventDefault();

    var email = emailInput.value.trim().toLowerCase();
    var targetStatus = isResend ? otpStatus : emailStatus;
    var button = isResend ? resendButton : sendCodeButton;

    if (!email) {
      fieldError(emailInput, emailError, "Enter your registered email address.");
      return;
    }

    var control = emailInput;
    if (control.validity && control.validity.typeMismatch) {
      fieldError(emailInput, emailError, "Enter a valid email address, for example name@guinhawa.ph.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldError(emailInput, emailError, "Enter a valid email address, for example name@guinhawa.ph.");
      return;
    }

    clearFieldError(emailInput, emailError);
    state.email = email;

    if (isResend) {
      resendButton.disabled = true;
      setStatus(otpStatus, "Sending a new code\u2026", "info");
    } else {
      setBusy(sendCodeButton, true, "Sending", "Send verification code");
      setStatus(emailStatus, "Checking your email address\u2026", "info");
    }

    Store.forgotPassword(email).then(function (result) {
      if (isResend) {
        if (!result.ok) {
          setStatus(otpStatus, result.message, "error");
          startCooldown(result.retryAfter || 10);
          return;
        }
        setStatus(otpStatus, (result.body && result.body.message) || "A new code is on its way.", "info");
        otpInput.value = "";
        startCooldown(60);
        otpInput.focus();
        return;
      }

      setBusy(sendCodeButton, false, "Sending", "Send verification code");

      if (!result.ok) {
        setStatus(emailStatus, result.message, "error");
        return;
      }

      otpEmail.textContent = email;
      otpInput.value = "";
      clearFieldError(otpInput, otpError);
      setStatus(
        otpStatus,
        (result.body && result.body.message) || "If that address is registered, a 6-digit code is on its way.",
        "info"
      );
      setStatus(emailStatus, "", "");
      showStep("otp");
      startCooldown(60);
    });
  }

  emailForm.addEventListener("submit", function (event) {
    requestCode(event, false);
  });

  emailInput.addEventListener("input", function () {
    clearFieldError(emailInput, emailError);
    setStatus(emailStatus, "", "");
  });

  resendButton.addEventListener("click", function () {
    if (resendButton.disabled) return;
    requestCode(null, true);
  });

  changeEmailButton.addEventListener("click", function () {
    stopCooldown();
    resendButton.disabled = true;
    resendLabel.textContent = "Resend code in 60s";
    otpInput.value = "";
    setStatus(otpStatus, "", "");
    setStatus(emailStatus, "", "");
    showStep("email");
  });

  /* ------------------------------ Step 2: OTP ----------------------------- */

  otpInput.addEventListener("input", function () {
    var digits = otpInput.value.replace(/\D+/g, "").slice(0, 6);
    if (digits !== otpInput.value) otpInput.value = digits;
    clearFieldError(otpInput, otpError);
    setStatus(otpStatus, "", "");
  });

  otpForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var code = otpInput.value.replace(/\D+/g, "");
    if (code.length !== 6) {
      fieldError(otpInput, otpError, "Enter the full 6-digit code from the email.");
      return;
    }

    clearFieldError(otpInput, otpError);
    setBusy(verifyButton, true, "Verifying", "Verify code");
    setStatus(otpStatus, "Checking your code\u2026", "info");

    Store.verifyPasswordOtp(code).then(function (result) {
      setBusy(verifyButton, false, "Verifying", "Verify code");

      if (!result.ok) {
        setStatus(otpStatus, result.message, "error");
        return;
      }

      stopCooldown();
      setStatus(otpStatus, "", "");
      showStep("password");
    });
  });

  /* --------------------------- Step 3: new password ----------------------- */

  wirePasswordToggle("toggleNewPassword", newPassword);
  wirePasswordToggle("toggleConfirmPassword", confirmPassword);

  function passwordProblem(value) {
    if (value.length < 10) return "Use at least 10 characters.";
    if (value.length > 128) return "Use 128 characters or fewer.";
    if (!/[a-z]/.test(value)) return "Include at least one lowercase letter.";
    if (!/[A-Z]/.test(value)) return "Include at least one uppercase letter.";
    if (!/[0-9]/.test(value)) return "Include at least one number.";
    return "";
  }

  newPassword.addEventListener("input", function () {
    clearFieldError(newPassword, newPasswordError);
    setStatus(passwordStatus, "", "");
  });

  confirmPassword.addEventListener("input", function () {
    clearFieldError(confirmPassword, confirmPasswordError);
    setStatus(passwordStatus, "", "");
  });

  passwordForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var value = newPassword.value;
    var confirm = confirmPassword.value;

    var problem = passwordProblem(value);
    if (problem) {
      fieldError(newPassword, newPasswordError, problem);
      return;
    }

    if (value !== confirm) {
      fieldError(confirmPassword, confirmPasswordError, "The two passwords do not match.");
      return;
    }

    clearFieldError(newPassword, newPasswordError);
    clearFieldError(confirmPassword, confirmPasswordError);
    setBusy(savePasswordButton, true, "Saving", "Save new password");
    setStatus(passwordStatus, "Saving your new password\u2026", "info");

    Store.completePasswordReset(value, confirm).then(function (result) {
      setBusy(savePasswordButton, false, "Saving", "Save new password");

      if (!result.ok) {
        setStatus(passwordStatus, result.message, "error");
        return;
      }

      var username = result.body && result.body.username ? result.body.username : "";
      if (successMessage) {
        successMessage.textContent = username
          ? "Sign in as @" + username + " with your new password."
          : "You can now sign in with your new password.";
      }
      passwordForm.reset();
      showStep("success");
    });
  });

  /* --------------------------------- Init --------------------------------- */

  showStep("email");
})(window, document);
