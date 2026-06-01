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

  // ── Notify checkout bar via checkout.js ──
  function notifyCheckoutBar(bookings) {
    if (typeof window.updateCheckoutBar === 'function') {
      window.updateCheckoutBar(bookings);
    }
  }

  // ── Render ──
  function render() {
    if (!isLoggedIn()) {
      if (loginWall) loginWall.style.display = 'block';
      listEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'none';
      notifyCheckoutBar([]);
      return;
    }

    if (loginWall) loginWall.style.display = 'none';
    listEl.style.display = 'block';

    var bookings = getBookings();
    updateBadge(bookings.length);
    notifyCheckoutBar(bookings);

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

  // ── Listen for checkout completion event ──
  window.addEventListener('checkoutComplete', function () {
    render();
  });

  // ── Init ──
  document.addEventListener('DOMContentLoaded', function () {
    render();
  });
})();
