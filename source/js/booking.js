/* jshint esversion:8, browser:true, globalstrict:true */
'use strict';

(function () {
  var STORAGE_KEY = 'bookingList';

  var listEl    = document.getElementById('booking-list');
  var emptyEl   = document.getElementById('booking-empty');
  var countEl   = document.getElementById('booking-count');
  var totalEl   = document.getElementById('booking-total');
  var clearBtn  = document.getElementById('booking-clear-all');
  var loginWall = document.getElementById('booking-login-wall');

  // ── Guard: ต้องมี element ──
  if (!listEl) return;

  // ── เช็ค Login ──
  function isLoggedIn() {
    return Boolean(localStorage.getItem('authToken'));
  }

  // ── โหลด bookings ──
  function getBookings() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }

  // ── บันทึก bookings ──
  function saveBookings(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // ── ลบ booking ──
  function removeBooking(id) {
    var arr = getBookings().filter(function (b) { return String(b.id) !== String(id); });
    saveBookings(arr);
    render();
  }

  // ── format date ──
  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── format time (HH:MM) ──
  function formatTime(t) {
    if (!t) return '';
    var parts = String(t).split(':');
    return parts.slice(0, 2).join(':');
  }

  function parseMinutes(time) {
    if (!time) return null;
    var parts = String(time).split(':').slice(0, 2);
    var hour = Number(parts[0]);
    var minute = Number(parts[1] || 0);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  }

  function timesOverlap(startA, endA, startB, endB) {
    var a = parseMinutes(startA);
    var b = parseMinutes(endA);
    var c = parseMinutes(startB);
    var d = parseMinutes(endB);
    if (a === null || b === null || c === null || d === null) return false;
    return a < d && c < b;
  }

  function getBookingKey(b) {
    return [b.course_date || '', formatTime(b.start_time), formatTime(b.end_time)].join('|');
  }

  function formatConflictTitles(titles) {
    if (!titles || !titles.length) return '';
    if (titles.length === 1) return titles[0];
    if (titles.length === 2) return titles[0] + ' and ' + titles[1];
    return titles.slice(0, -1).join(', ') + ', and ' + titles[titles.length - 1];
  }

  function computeBookingStatuses(bookings) {
    var statusMap = {};

    bookings.forEach(function (b) {
      statusMap[b.id] = {
        status: (b.max_capacity != null && b.current_capacity != null && Number(b.current_capacity) >= Number(b.max_capacity)) ? 'full' : null,
        conflicts: []
      };
    });

    for (var i = 0; i < bookings.length; i++) {
      for (var j = i + 1; j < bookings.length; j++) {
        var a = bookings[i];
        var b = bookings[j];
        if (!a.course_date || !b.course_date || a.course_date !== b.course_date) continue;
        if (timesOverlap(formatTime(a.start_time), formatTime(a.end_time), formatTime(b.start_time), formatTime(b.end_time))) {
          if (statusMap[a.id].status !== 'full') statusMap[a.id].status = 'conflict';
          if (statusMap[b.id].status !== 'full') statusMap[b.id].status = 'conflict';
          statusMap[a.id].conflicts.push(b.title);
          statusMap[b.id].conflicts.push(a.title);
        }
      }
    }

    Object.keys(statusMap).forEach(function (id) {
      if (statusMap[id].status === 'conflict') {
        statusMap[id].conflicts = statusMap[id].conflicts.filter(function (value, index, self) {
          return self.indexOf(value) === index;
        });
      }
    });

    return statusMap;
  }

  // ── render card ──
  function renderCard(b, index, status) {
    var price    = Number(b.price) || 0;
    var isFree   = price === 0;
    var priceStr = isFree ? 'FREE' : '$' + price.toFixed(2);
    var priceClass = isFree ? 'booking-price free' : 'booking-price';

    var courseDate = b.course_date ? formatDate(b.course_date) : null;
    var startTime  = formatTime(b.start_time);
    var endTime    = formatTime(b.end_time);
    var timeRange  = (startTime && endTime) ? startTime + ' – ' + endTime
                   : startTime ? startTime : null;

    var seats = (b.max_capacity != null && b.current_capacity != null)
                ? b.current_capacity + ' / ' + b.max_capacity + ' enrolled'
                : null;

    var imgSrc = b.image_url || 'images/courses/course-1.jpg';

    var alertHtml = '';
    if (status && status.status === 'full') {
      alertHtml = '<div class="bk-alert bk-alert-full"><i class="ti-alert mr-1"></i>This course is full and has reached capacity.</div>';
    } else if (status && status.status === 'conflict') {
      var titleList = formatConflictTitles(status.conflicts || []);
      var conflictText = titleList
        ? 'Schedule conflicts with ' + titleList + '.'
        : 'Schedule conflict detected with another booking.';
      alertHtml = '<div class="bk-alert bk-alert-conflict"><i class="ti-alert mr-1"></i>' + conflictText + '</div>';
    }

    // build time/date block
    var metaHtml = '';
    if (courseDate) {
      metaHtml += '<div class="bk-meta-item">'
               +    '<span class="bk-meta-icon"><i class="ti-calendar"></i></span>'
               +    '<div><span class="bk-meta-label">Course Date</span>'
               +    '<span class="bk-meta-val">' + courseDate + '</span></div>'
               + '</div>';
    }
    if (timeRange) {
      metaHtml += '<div class="bk-meta-item">'
               +    '<span class="bk-meta-icon"><i class="ti-time"></i></span>'
               +    '<div><span class="bk-meta-label">Class Time</span>'
               +    '<span class="bk-meta-val">' + timeRange + '</span></div>'
               + '</div>';
    }
    if (seats) {
      metaHtml += '<div class="bk-meta-item">'
               +    '<span class="bk-meta-icon"><i class="ti-user"></i></span>'
               +    '<div><span class="bk-meta-label">Enrollment</span>'
               +    '<span class="bk-meta-val">' + seats + '</span></div>'
               + '</div>';
    }

    return '<div class="booking-card' + (status ? ' booking-card--' + status : '') + '" id="bcard-' + b.id + '">'
         +     alertHtml
         +   '<div class="bk-img-wrap">'
         +     '<img src="' + imgSrc + '" alt="' + b.title + '" class="bk-img">'
         +     '<span class="bk-cat-pill">' + b.category + '</span>'
         +   '</div>'
         +   '<div class="bk-body">'
         +     '<div class="bk-top">'
         +       '<h5 class="bk-title">' + b.title + '</h5>'
         +       '<div class="' + priceClass + '">' + priceStr + '</div>'
         +     '</div>'
         +     (b.description ? '<p class="bk-desc">' + b.description.substring(0, 120) + (b.description.length > 120 ? '…' : '') + '</p>' : '')
         +     '<div class="bk-meta-row">' + metaHtml + '</div>'
         +     '<div class="bk-footer">'
         +       '<span class="bk-enrolled-on"><i class="ti-bookmark mr-1"></i>Enrolled on ' + formatDate(b.enrolledAt) + '</span>'
         +       '<button class="btn btn-sm remove-booking-btn" data-id="' + b.id + '">'
         +         '<i class="ti-trash mr-1"></i>Remove'
         +       '</button>'
         +     '</div>'
         +   '</div>'
         + '</div>';
  }

  // ── update badge ──
  function updateBadge(count) {
    var badge = document.getElementById('booking-nav-badge');
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  // ═══════════════════════════════════
  // CHECKOUT BAR
  // ═══════════════════════════════════
  var checkoutBar      = document.getElementById('checkout-bar');
  var checkoutBtn      = document.getElementById('checkout-btn');
  var checkoutBarCount = document.getElementById('checkout-course-count');
  var checkoutBarTotal = document.getElementById('checkout-bar-total');

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
    hideCheckoutAlert();

    // 4) Populate summary
    var total   = bookings.reduce(function (s, b) { return s + (Number(b.price) || 0); }, 0);
    var payable = bookings.filter(function (b) { return !isFull(b); })
                          .reduce(function (s, b) { return s + (Number(b.price) || 0); }, 0);

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

      // Simulate payment processing
      if (checkoutSubmitBtn) {
        checkoutSubmitBtn.disabled = true;
        checkoutSubmitBtn.innerHTML = '<i class="ti-reload mr-2"></i>Processing…';
      }

      var email = (document.getElementById('co-email') || {}).value || '';

      setTimeout(function () {
        closeCheckoutModal();

        // Success modal
        if (successMsg) {
          successMsg.textContent = 'Thank you for your enrollment! A confirmation has been sent to ' + email + '.';
        }
        if (successModal) successModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Clear only available (non-full) bookings
        var remaining = getBookings().filter(function (b) { return isFull(b); });
        saveBookings(remaining);

        // Re-enable button
        if (checkoutSubmitBtn) {
          checkoutSubmitBtn.disabled = false;
          checkoutSubmitBtn.innerHTML = '<i class="ti-check mr-2"></i>Confirm & Pay <span id="checkout-pay-amount">$0.00</span>';
        }
      }, 1800);
    });
  }

  // ── Success modal close ──
  if (successClose) {
    successClose.addEventListener('click', function () {
      if (successModal) successModal.style.display = 'none';
      document.body.style.overflow = '';
      render();
    });
  }
  if (successModal) {
    successModal.addEventListener('click', function (e) {
      if (e.target === successModal) {
        successModal.style.display = 'none';
        document.body.style.overflow = '';
        render();
      }
    });
  }

  // ── Render ──
  function render() {
    if (!isLoggedIn()) {
      if (loginWall) loginWall.style.display = 'block';
      listEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'none';
      if (checkoutBar) checkoutBar.style.display = 'none';
      return;
    }

    if (loginWall) loginWall.style.display = 'none';
    listEl.style.display = 'block';

    var bookings = getBookings();
    updateBadge(bookings.length);
    updateCheckoutBar(bookings);

    if (countEl) countEl.textContent = bookings.length;

    var total = bookings.reduce(function (sum, b) { return sum + (Number(b.price) || 0); }, 0);
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);

    if (bookings.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    var statuses = computeBookingStatuses(bookings);
    listEl.innerHTML = bookings.map(function (b, index) { return renderCard(b, index, statuses[b.id]); }).join('');

    // bind remove buttons
    listEl.querySelectorAll('.remove-booking-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var card = document.getElementById('bcard-' + id);
        if (card) {
          card.style.transition = 'opacity .3s, transform .3s';
          card.style.opacity = '0';
          card.style.transform = 'scale(.95)';
          setTimeout(function () { removeBooking(id); }, 300);
        } else {
          removeBooking(id);
        }
      });
    });
  }

  // ── Clear All ──
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (!confirm('Remove all bookings?')) return;
      saveBookings([]);
      render();
    });
  }

  // ── Init ──
  document.addEventListener('DOMContentLoaded', function () {
    render();
  });
})();
