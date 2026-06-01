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

  // ── render card ──
  function renderCard(b, index) {
    var price = Number(b.price) || 0;
    var priceStr = price > 0 ? '$' + price.toFixed(2) : '<span class="badge badge-success">Free</span>';
    var enrolledDate = formatDate(b.enrolledAt);
    var courseDate   = b.course_date ? formatDate(b.course_date) : '—';

    return '<div class="booking-card" id="bcard-' + b.id + '" data-aos="fade-up" data-aos-delay="' + (index * 60) + '">'
         +   '<div class="booking-thumb">'
         +     '<img src="' + (b.image_url || 'images/courses/course-1.jpg') + '" alt="' + b.title + '">'
         +     '<span class="booking-cat-badge">' + b.category + '</span>'
         +   '</div>'
         +   '<div class="booking-info">'
         +     '<h5 class="booking-title">' + b.title + '</h5>'
         +     '<p class="booking-desc">' + (b.description || '').substring(0, 100) + (b.description && b.description.length > 100 ? '…' : '') + '</p>'
         +     '<div class="booking-meta">'
         +       '<span><i class="ti-calendar mr-1"></i>Course date: ' + courseDate + '</span>'
         +       '<span><i class="ti-time mr-1"></i>Enrolled: ' + enrolledDate + '</span>'
         +     '</div>'
         +   '</div>'
         +   '<div class="booking-price-col">'
         +     '<div class="booking-price">' + priceStr + '</div>'
         +     '<button class="btn btn-sm btn-outline-danger remove-booking-btn mt-2" data-id="' + b.id + '">'
         +       '<i class="ti-trash mr-1"></i>Remove'
         +     '</button>'
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
