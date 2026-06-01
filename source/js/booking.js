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
    // trim seconds if present e.g. "09:00:00" → "09:00"
    return t.substring(0, 5);
  }

  // ── render card ──
  function renderCard(b, index) {
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

    return '<div class="booking-card" id="bcard-' + b.id + '">'
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

  // ── Render ──
  function render() {
    if (!isLoggedIn()) {
      if (loginWall) loginWall.style.display = 'block';
      listEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'none';
      return;
    }

    if (loginWall) loginWall.style.display = 'none';
    listEl.style.display = 'block';

    var bookings = getBookings();
    updateBadge(bookings.length);

    if (countEl) countEl.textContent = bookings.length;

    var total = bookings.reduce(function (sum, b) { return sum + (Number(b.price) || 0); }, 0);
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);

    if (bookings.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    listEl.innerHTML = bookings.map(renderCard).join('');

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
