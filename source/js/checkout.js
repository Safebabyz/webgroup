/* jshint esversion:8, browser:true, globalstrict:true */
'use strict';

(function () {
  // ═══════════════════════════════════
  // CHECKOUT BAR
  // ═══════════════════════════════════
  var checkoutBar      = document.getElementById('checkout-bar');
  var checkoutBtn      = document.getElementById('checkout-btn');
  var checkoutBarCount = document.getElementById('checkout-course-count');
  var checkoutBarTotal = document.getElementById('checkout-bar-total');

  function isLoggedIn() {
    return Boolean(localStorage.getItem('authToken'));
  }

  function getBookingStorageKey() {
    var userId = localStorage.getItem('userId');
    return userId ? 'bookingList_' + userId : 'bookingList';
  }

  function getBookings() {
    return JSON.parse(localStorage.getItem(getBookingStorageKey()) || '[]');
  }

  function saveBookings(arr) {
    localStorage.setItem(getBookingStorageKey(), JSON.stringify(arr));
  }

/**
   * Function: updateCheckoutBar
   * Purpose: Updates the sticky checkout bar's item count and total price based on the current bookings.
   * Data Flow: Accepts bookings array -> Calculates total price -> Updates DOM elements (count, total) -> Toggles bar visibility.
   */
  function updateCheckoutBar(bookings) {
    if (!checkoutBar) return;
    if (!isLoggedIn() || bookings.length === 0) {
      checkoutBar.style.display = 'none';
      return;
    }
    var total = bookings.reduce(function (s, b) { return s + (Number(b.price) || 0); }, 0);
    checkoutBar.style.display = 'block';
    if (checkoutBarCount) checkoutBarCount.textContent = bookings.length + ' course' + (bookings.length > 1 ? 's' : '');
    if (checkoutBarTotal) checkoutBarTotal.textContent = '$' + total.toFixed(2);
  }

  // ═══════════════════════════════════
  // CHECKOUT MODAL
  // ═══════════════════════════════════
  var checkoutModal        = document.getElementById('checkoutModal');
  var checkoutModalClose   = document.getElementById('checkout-modal-close');
  var checkoutModalSummary = document.getElementById('checkout-modal-summary');
  var checkoutOrderItems   = document.getElementById('checkout-order-items');
  var checkoutAlert        = document.getElementById('checkout-alert');
  var checkoutPayAmount    = document.getElementById('checkout-pay-amount');
  var checkoutForm         = document.getElementById('checkoutForm');
  var checkoutSubmitBtn    = document.getElementById('checkout-submit-btn');

  var successModal = document.getElementById('checkoutSuccessModal');
  var successMsg   = document.getElementById('checkout-success-msg');
  var successClose = document.getElementById('checkout-success-close');

  function isFull(b) {
    return b.max_capacity != null && b.current_capacity != null &&
           Number(b.current_capacity) >= Number(b.max_capacity);
  }

  function showCheckoutAlert(msg, type) {
    if (!checkoutAlert) return;
    checkoutAlert.className = 'checkout-alert-' + type;
    checkoutAlert.innerHTML = '<i class="ti-alert"></i> ' + msg;
    checkoutAlert.style.display = 'flex';
  }

  function hideCheckoutAlert() {
    if (checkoutAlert) checkoutAlert.style.display = 'none';
  }

/**
   * Function: openCheckoutModal
   * Purpose: Prepares and displays the checkout modal, handling full courses and rendering the order summary.
   * Data Flow: getBookings() -> Filters out full courses -> Updates modal DOM with summary and payable total -> Shows modal.
   */
  function openCheckoutModal() {
    var bookings = getBookings();

    // 1) ตรวจสอบ Login
    if (!isLoggedIn()) {
      if (typeof $ !== 'undefined' && $.fn && $.fn.modal) {
        $('#loginModal').modal('show');
      } else {
        var lm = document.getElementById('loginModal');
        if (lm) lm.style.display = 'block';
      }
      return;
    }

    // 2) ตรวจว่ามี booking
    if (bookings.length === 0) return;

    // 3) ตรวจ full courses
    var fullCourses = bookings.filter(isFull);
    var availableCourses = bookings.filter(function (b) { return !isFull(b); });
    hideCheckoutAlert();

    if (availableCourses.length === 0) {
      if (checkoutForm) {
        checkoutForm.reset();
        checkoutForm.style.display = 'none';
      }
      if (checkoutSubmitBtn) {
        checkoutSubmitBtn.disabled = true;
      }
      showCheckoutAlert(
        'All selected courses are currently full. Please remove them from your list before checkout.',
        'warning'
      );
      if (checkoutModal) {
        checkoutModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
      return;
    }

    if (checkoutForm) {
      checkoutForm.style.display = '';
      checkoutForm.reset();
    }
    if (checkoutSubmitBtn) {
      checkoutSubmitBtn.disabled = false;
    }

    // 4) Populate summary
    var total   = bookings.reduce(function (s, b) { return s + (Number(b.price) || 0); }, 0);
    var payable = availableCourses.reduce(function (s, b) { return s + (Number(b.price) || 0); }, 0);

    if (checkoutModalSummary) {
      checkoutModalSummary.innerHTML = bookings.length + ' course' + (bookings.length > 1 ? 's' : '') + ' &bull; $' + total.toFixed(2);
    }

    if (checkoutOrderItems) {
      var itemsHtml = bookings.map(function (b) {
        var price    = Number(b.price) || 0;
        var full     = isFull(b);
        var statusHtml = full
          ? '<span class="checkout-order-item-status checkout-status-full">Full</span>'
          : '<span class="checkout-order-item-status checkout-status-ok">Available</span>';
        var priceStr = price === 0 ? 'FREE' : '$' + price.toFixed(2);
        var priceStyle = full ? ' style="text-decoration:line-through;color:#ccc!important"' : '';
        return '<div class="checkout-order-item">'
             + '<span class="checkout-order-item-name">' + b.title + '</span>'
             + statusHtml
             + '<span class="checkout-order-item-price"' + priceStyle + '>' + priceStr + '</span>'
             + '</div>';
      }).join('');
      itemsHtml += '<div class="checkout-order-total">'
                 + '<span>Total (available courses)</span>'
                 + '<span class="checkout-order-total-val">$' + payable.toFixed(2) + '</span>'
                 + '</div>';
      checkoutOrderItems.innerHTML = itemsHtml;
    }

    if (checkoutPayAmount) checkoutPayAmount.textContent = '$' + payable.toFixed(2);

    // 5) Warning ถ้ามี full courses
    if (fullCourses.length > 0) {
      var names = fullCourses.map(function (b) { return '"' + b.title + '"'; }).join(', ');
      showCheckoutAlert(
        fullCourses.length + ' course' + (fullCourses.length > 1 ? 's are' : ' is') +
        ' full and will be excluded from payment: ' + names,
        'warning'
      );
    }

    // 6) Reset form & errors
    if (checkoutForm) checkoutForm.reset();
    clearFieldErrors();

    // 7) แสดง modal
    if (checkoutModal) checkoutModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeCheckoutModal() {
    if (checkoutModal) checkoutModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // ── Field validation helpers ──
  function setError(inputId, errorId, msg) {
    var inp = document.getElementById(inputId);
    var err = document.getElementById(errorId);
    if (inp) inp.classList.add('co-input-error');
    if (err) err.textContent = msg;
  }

  function clearError(inputId, errorId) {
    var inp = document.getElementById(inputId);
    var err = document.getElementById(errorId);
    if (inp) inp.classList.remove('co-input-error');
    if (err) err.textContent = '';
  }

  function clearFieldErrors() {
    [['co-email','co-email-error'],['co-card-number','co-card-error'],
     ['co-expiry','co-expiry-error'],['co-cvv','co-cvv-error'],['co-name','co-name-error']]
    .forEach(function (pair) { clearError(pair[0], pair[1]); });
  }

/**
   * Function: validateCheckoutForm
   * Purpose: Validates the user's input in the checkout form (email, card number, expiry, CVV, name).
   * Data Flow: Reads input values from DOM -> Applies regex and logic checks -> Sets or clears error messages -> Returns boolean validation status.
   */
  function validateCheckoutForm() {
    var valid = true;
    clearFieldErrors();

    // Email
    var email = (document.getElementById('co-email') || {}).value || '';
    if (!email.trim()) {
      setError('co-email', 'co-email-error', 'Email is required.'); valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('co-email', 'co-email-error', 'Please enter a valid email address.'); valid = false;
    }

    // Card Number (16 digits)
    var cardRaw = ((document.getElementById('co-card-number') || {}).value || '').replace(/\s/g, '');
    if (!cardRaw) {
      setError('co-card-number', 'co-card-error', 'Card number is required.'); valid = false;
    } else if (!/^\d{16}$/.test(cardRaw)) {
      setError('co-card-number', 'co-card-error', 'Card number must be 16 digits.'); valid = false;
    }

    // Expiry MM/YY
    var expiry = ((document.getElementById('co-expiry') || {}).value || '').replace(/\s/g, '');
    if (!expiry) {
      setError('co-expiry', 'co-expiry-error', 'Expiry date is required.'); valid = false;
    } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      setError('co-expiry', 'co-expiry-error', 'Use MM/YY format (e.g. 08/27).'); valid = false;
    } else {
      var exParts = expiry.split('/');
      var expMonth = parseInt(exParts[0], 10);
      var expYear  = 2000 + parseInt(exParts[1], 10);
      var now = new Date();
      if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
        setError('co-expiry', 'co-expiry-error', 'Your card has expired.'); valid = false;
      }
    }

    // CVV
    var cvv = ((document.getElementById('co-cvv') || {}).value || '');
    if (!cvv) {
      setError('co-cvv', 'co-cvv-error', 'CVV is required.'); valid = false;
    } else if (!/^\d{3,4}$/.test(cvv)) {
      setError('co-cvv', 'co-cvv-error', 'CVV must be 3–4 digits.'); valid = false;
    }

    // Cardholder Name
    var cname = ((document.getElementById('co-name') || {}).value || '').trim();
    if (!cname) {
      setError('co-name', 'co-name-error', 'Cardholder name is required.'); valid = false;
    } else if (cname.length < 2) {
      setError('co-name', 'co-name-error', 'Please enter a valid name.'); valid = false;
    }

    return valid;
  }

  // ── Card number auto-format (xxxx xxxx xxxx xxxx) ──
  var cardInput = document.getElementById('co-card-number');
  if (cardInput) {
    cardInput.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').substring(0, 16);
      this.value = v.replace(/(.{4})/g, '$1 ').trim();
    });
  }

  // ── Expiry auto-format (MM / YY) ──
  var expiryInput = document.getElementById('co-expiry');
  if (expiryInput) {
    expiryInput.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').substring(0, 4);
      if (v.length >= 3) {
        this.value = v.substring(0, 2) + ' / ' + v.substring(2);
      } else {
        this.value = v;
      }
    });
  }

  // ── CVV: digits only ──
  var cvvInput = document.getElementById('co-cvv');
  if (cvvInput) {
    cvvInput.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').substring(0, 4);
    });
  }

  // ── Checkout button ──
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', openCheckoutModal);
  }

  // ── Close modal (X button & overlay click) ──
  if (checkoutModalClose) {
    checkoutModalClose.addEventListener('click', closeCheckoutModal);
  }
  if (checkoutModal) {
    checkoutModal.addEventListener('click', function (e) {
      if (e.target === checkoutModal) closeCheckoutModal();
    });
  }

  // ── Form submit ──
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateCheckoutForm()) return;

      var bookings = getBookings();
      var availableCourses = bookings.filter(function (b) { return !isFull(b); });

      if (availableCourses.length === 0) {
        alert('No available courses to checkout.');
        return;
      }

      var totalAmount = availableCourses.reduce(function (sum, b) { return sum + (Number(b.price) || 0); }, 0);
      var userId = localStorage.getItem('userId'); // Requires userId to be stored on login

      if (!userId) {
        alert('User ID not found. Please log in again.');
        return;
      }

      // Process payment
      if (checkoutSubmitBtn) {
        checkoutSubmitBtn.disabled = true;
        checkoutSubmitBtn.innerHTML = '<i class="ti-reload mr-2"></i>Processing…';
      }

      var email = (document.getElementById('co-email') || {}).value || '';

      // Call backend API to create booking (use backend server port)
      var apiUrl = 'http://localhost:8000/api/checkout/process';
      fetch(apiUrl, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, (localStorage.getItem('authToken') ? { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') } : {})),
        body: JSON.stringify({
          userId: parseInt(userId, 10),
          courses: availableCourses,
          totalAmount: totalAmount
        })
      })
      .then(function (response) {
        if (!response.ok) {
          return response.json().then(function (err) {
            var error = new Error(err && err.message ? err.message : 'Checkout failed');
            error.status = response.status;
            error.conflicts = err && err.conflicts ? err.conflicts : [];
            throw error;
          }).catch(function () {
            var error = new Error('Checkout failed (status ' + response.status + ')');
            error.status = response.status;
            throw error;
          });
        }
        return response.json();
      })
      .then(function (data) {
        closeCheckoutModal();

        // Success modal
        if (successMsg) {
          successMsg.textContent = 'Thank you for your enrollment! A confirmation has been sent to ' + email + '.';
        }
        if (successModal) successModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Clear only available (non-full) bookings from localStorage
        var remaining = bookings.filter(function (b) { return isFull(b); });
        saveBookings(remaining);

        // Re-enable button
        if (checkoutSubmitBtn) {
          checkoutSubmitBtn.disabled = false;
          checkoutSubmitBtn.innerHTML = '<i class="ti-check mr-2"></i>Confirm & Pay <span id="checkout-pay-amount">$0.00</span>';
        }
      })
      .catch(function (err) {
        console.error('Checkout error:', err);

        if (err.status === 409 && err.conflicts && err.conflicts.length) {
          var names = err.conflicts.map(function (item) { return '"' + item.title + '"'; }).join(', ');
          showCheckoutAlert(
            (err.conflicts.length > 1 ? 'These courses are' : 'This course is') +
            ' right now full: ' + names + '. Please remove ' +
            (err.conflicts.length > 1 ? 'them from' : 'it from') + ' your list and try again.',
            'warning'
          );
        } else {
          alert(err && err.message ? err.message : 'Checkout failed. Please try again.');
        }

        // Re-enable button
        if (checkoutSubmitBtn) {
          checkoutSubmitBtn.disabled = false;
          checkoutSubmitBtn.innerHTML = '<i class="ti-check mr-2"></i>Confirm & Pay <span id="checkout-pay-amount">$0.00</span>';
        }
      });
    });
  }

  // ── Success modal close ──
  if (successClose) {
    successClose.addEventListener('click', function () {
      if (successModal) successModal.style.display = 'none';
      document.body.style.overflow = '';
      // Dispatch custom event to notify booking.js to re-render
      window.dispatchEvent(new CustomEvent('checkoutComplete'));
    });
  }
  if (successModal) {
    successModal.addEventListener('click', function (e) {
      if (e.target === successModal) {
        successModal.style.display = 'none';
        document.body.style.overflow = '';
        // Dispatch custom event to notify booking.js to re-render
        window.dispatchEvent(new CustomEvent('checkoutComplete'));
      }
    });
  }

  // ── Public API to update checkout bar ──
  window.updateCheckoutBar = updateCheckoutBar;
})();
