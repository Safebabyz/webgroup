/* jshint esversion:8, browser:true, globalstrict:true */
/* global URLSearchParams */
'use strict';

(function () {
  var ITEMS_PER_PAGE = 6;

  var state = {
    all:       [],
    filtered:  [],
    page:      1,
    query:     '',
    category:  'all',
    sortBy:    'default',
    priceMin:  0,
    priceMax:  500,
    onlyAvail: false,
    onlyFree:  false,
    viewMode:  'grid'
  };

  var searchInput     = document.getElementById('search-input');
  var searchBtn       = document.getElementById('search-btn');
  var resultsEl       = document.getElementById('search-results');
  var noResultsEl     = document.getElementById('no-results');
  var statsEl         = document.getElementById('search-stats');
  var toolbarEl       = document.getElementById('results-toolbar');
  var paginationEl    = document.getElementById('pagination');
  var paginationRow   = document.getElementById('pagination-row');
  var sortSelect      = document.getElementById('sort-select');
  var priceMinEl      = document.getElementById('price-min');
  var priceMaxEl      = document.getElementById('price-max');
  var priceMinDisp    = document.getElementById('price-min-display');
  var priceMaxDisp    = document.getElementById('price-max-display');
  var filterAvail     = document.getElementById('filter-available');
  var filterFree      = document.getElementById('filter-free');
  var viewGridBtn     = document.getElementById('view-grid');
  var viewListBtn     = document.getElementById('view-list');
  var activeFiltersWrap = document.getElementById('active-filters-wrap');
  var activeFilterTags  = document.getElementById('active-filter-tags');
  var clearAllBtn     = document.getElementById('clear-all-btn');
  var resetFiltersBtn = document.getElementById('reset-filters-btn');
  var categoryRadios  = document.querySelectorAll('input[name="category"]');

  function hl(text, q) {
    if (!q || !text) return text || '';
    var esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + esc + ')', 'gi'), '<mark class="sh">$1</mark>');
  }

  function showSkeleton() {
    var html = '';
    for (var i = 0; i < ITEMS_PER_PAGE; i++) {
      html += '<div class="col-lg-4 col-sm-6 col-item mb-4">'
            +   '<div class="skeleton-card">'
            +     '<div class="skeleton-img"></div>'
            +     '<div class="skeleton-body">'
            +       '<div class="skeleton-line short"></div>'
            +       '<div class="skeleton-line title"></div>'
            +       '<div class="skeleton-line"></div>'
            +       '<div class="skeleton-line short"></div>'
            +     '</div>'
            +   '</div>'
            + '</div>';
    }
    resultsEl.innerHTML = html;
    noResultsEl.style.display   = 'none';
    toolbarEl.style.setProperty('display', 'none', 'important');
    paginationRow.style.display = 'none';
  }

  function renderCard(course) {
    var q        = state.query;
    var title    = course.title || '';
    var category = course.category || 'General';
    var desc     = (course.description || '').substring(0, 110) + '…';
    var price    = course.price != null ? '$' + Number(course.price).toFixed(2) : 'Free';
    var dateStr  = course.course_date || '';
    var imgSrc   = course.image_url || 'images/courses/course-1.jpg';
    var seats    = (course.current_capacity != null && course.max_capacity != null)
                   ? course.current_capacity + '/' + course.max_capacity
                   : '';

    return '<div class="col-lg-4 col-sm-6 col-item mb-4 course-card">'
         +   '<div class="card p-0 border-primary rounded-0 hover-shadow">'
         +     '<img class="card-img-top rounded-0" src="' + imgSrc + '" alt="' + title + '">' 
         +     '<div class="card-body d-flex flex-column">'
         +       '<ul class="list-inline mb-2">'
         +         '<li class="list-inline-item"><i class="ti-calendar mr-1 text-color"></i>' + dateStr + '</li>'
         +         '<li class="list-inline-item"><span class="category-badge">' + hl(category, q) + '</span></li>'
         +       '</ul>'
         +       '<a href="#!"><h4 class="card-title">' + hl(title, q) + '</h4></a>'
         +       '<p class="card-text mb-3 flex-grow-1">' + hl(desc, q) + '</p>'
         +       '<div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">'
         +         '<span class="font-weight-bold text-color">' + price + '</span>'
         +         '<button class="btn btn-sm btn-primary enroll-btn" data-course-id="' + course.id + '"><i class="ti-check mr-1"></i>Enroll</button>'
         +       '</div>'
         +       (seats ? '<div class="text-muted small mt-2"><i class="ti-user mr-1"></i>' + seats + ' students enrolled</div>' : '')
         +     '</div>'
         +   '</div>'
         + '</div>';
  }

  function renderPage() {
    var start = (state.page - 1) * ITEMS_PER_PAGE;
    var end   = start + ITEMS_PER_PAGE;
    var page  = state.filtered.slice(start, end);

    if (page.length === 0) {
      resultsEl.innerHTML = '';
      noResultsEl.style.display   = 'block';
      toolbarEl.style.setProperty('display', 'none', 'important');
      paginationRow.style.display = 'none';
      return;
    }

    noResultsEl.style.display = 'none';
    toolbarEl.style.setProperty('display', 'flex', 'important');

    if (state.viewMode === 'list') {
      resultsEl.classList.add('list-view');
    } else {
      resultsEl.classList.remove('list-view');
    }

    resultsEl.innerHTML = page.map(renderCard).join('');

    resultsEl.querySelectorAll('.enroll-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var courseId = this.getAttribute('data-course-id');
        var course = state.all.find(function (c) { return c.id == courseId; });
        if (!course) return;

        // ── เช็คว่า login อยู่ไหม ──
        var token = localStorage.getItem('authToken');
        if (!token) {
          // ยังไม่ login → เปิด login modal
          var loginModal = document.getElementById('loginModal');
          if (loginModal && window.jQuery) {
            window.jQuery('#loginModal').modal('show');
          } else if (loginModal) {
            loginModal.style.display = 'flex';
          }
          // แสดง toast แจ้งเตือน
          showBookingToast('Please login to enroll in a course.', 'warning');
          return;
        }

        // ── login แล้ว → บันทึกลง bookingList ──
        var bookings = JSON.parse(localStorage.getItem('bookingList') || '[]');
        var alreadyBooked = bookings.some(function (b) { return b.id == course.id; });
        if (alreadyBooked) {
          showBookingToast('You have already enrolled in "' + course.title + '".', 'info');
          return;
        }
        bookings.push({
          id:           course.id,
          title:        course.title,
          category:     course.category || 'General',
          price:        course.price || 0,
          image_url:    course.image_url || 'images/courses/course-1.jpg',
          course_date:  course.course_date || '',
          description:  course.description || '',
          enrolledAt:   new Date().toISOString()
        });
        localStorage.setItem('bookingList', JSON.stringify(bookings));

        // อัปเดตปุ่มและ badge
        this.innerHTML = '<i class="ti-check mr-1"></i>Enrolled';
        this.disabled = true;
        this.classList.replace('btn-primary', 'btn-success');
        updateBookingBadge();
        showBookingToast('"' + course.title + '" added to your bookings!', 'success');
      });
    });

    // ── อัปเดตสถานะปุ่มที่ enroll แล้ว ──
    var bookings = JSON.parse(localStorage.getItem('bookingList') || '[]');
    var bookedIds = bookings.map(function (b) { return String(b.id); });
    resultsEl.querySelectorAll('.enroll-btn').forEach(function (btn) {
      if (bookedIds.indexOf(btn.getAttribute('data-course-id')) !== -1) {
        btn.innerHTML = '<i class="ti-check mr-1"></i>Enrolled';
        btn.disabled = true;
        btn.classList.replace('btn-primary', 'btn-success');
      }
    });

    var from = start + 1;
    var to   = Math.min(end, state.filtered.length);
    statsEl.textContent = 'Showing ' + from + '–' + to + ' of ' + state.filtered.length
      + ' course' + (state.filtered.length !== 1 ? 's' : '')
      + (state.query ? ' for "' + state.query + '"' : '');

    renderPagination();
    updateActiveTags();
  }

  function renderPagination() {
    var total = Math.ceil(state.filtered.length / ITEMS_PER_PAGE);
    if (total <= 1) { paginationRow.style.display = 'none'; return; }
    paginationRow.style.display = 'block';
    var html = '';
    for (var i = 1; i <= total; i++) {
      html += '<li class="list-inline-item">'
            + '<span class="page-btn' + (i === state.page ? ' active' : '') + '" data-page="' + i + '">' + i + '</span>'
            + '</li>';
    }
    paginationEl.innerHTML = html;
    paginationEl.querySelectorAll('.page-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.page = parseInt(this.getAttribute('data-page'));
        renderPage();
        window.scrollTo({ top: 300, behavior: 'smooth' });
      });
    });
  }

  function sortCourses(arr) {
    var sorted = arr.slice();
    switch (state.sortBy) {
      case 'title-asc':
        sorted.sort(function (a, b) { return (a.title || '').localeCompare(b.title || ''); });
        break;
      case 'title-desc':
        sorted.sort(function (a, b) { return (b.title || '').localeCompare(a.title || ''); });
        break;
      case 'price-asc':
        sorted.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
        break;
      case 'price-desc':
        sorted.sort(function (a, b) { return (b.price || 0) - (a.price || 0); });
        break;
      case 'date-desc':
        sorted.sort(function (a, b) { return new Date(b.course_date || 0) - new Date(a.course_date || 0); });
        break;
      case 'date-asc':
        sorted.sort(function (a, b) { return new Date(a.course_date || 0) - new Date(b.course_date || 0); });
        break;
      default:
        break;
    }
    return sorted;
  }

  function applyFilters() {
    var q = state.query.toLowerCase().trim();

    state.filtered = state.all.filter(function (c) {
      if (q && !(
        (c.title       || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.category    || '').toLowerCase().includes(q)
      )) return false;

      if (state.category !== 'all' && (c.category || '').toLowerCase() !== state.category.toLowerCase()) return false;

      var price = Number(c.price) || 0;
      if (price < state.priceMin || price > state.priceMax) return false;

      if (state.onlyAvail && c.max_capacity != null && c.current_capacity != null) {
        if (c.current_capacity >= c.max_capacity) return false;
      }

      if (state.onlyFree && price > 0) return false;

      return true;
    });

    state.filtered = sortCourses(state.filtered);
    state.page = 1;
    renderPage();
  }

  function updateActiveTags() {
    var tags = [];
    if (state.query)             tags.push({ key: 'query',    label: 'Search: "' + state.query + '"' });
    if (state.category !== 'all') tags.push({ key: 'category', label: 'Category: ' + state.category });
    if (state.priceMin > 0 || state.priceMax < 500)
      tags.push({ key: 'price', label: 'Price: $' + state.priceMin + '–$' + state.priceMax });
    if (state.onlyAvail) tags.push({ key: 'avail', label: 'Available only' });
    if (state.onlyFree)  tags.push({ key: 'free',  label: 'Free only' });

    if (tags.length === 0) {
      activeFiltersWrap.style.display = 'none';
      return;
    }
    activeFiltersWrap.style.display = 'block';
    activeFilterTags.innerHTML = tags.map(function (t) {
      return '<span class="filter-tag">' + t.label
           + '<span class="remove-tag" data-key="' + t.key + '">×</span></span>';
    }).join('');
    activeFilterTags.querySelectorAll('.remove-tag').forEach(function (el) {
      el.addEventListener('click', function () { removeTag(this.getAttribute('data-key')); });
    });
  }

  function removeTag(key) {
    switch (key) {
      case 'query':
        state.query = '';
        searchInput.value = '';
        break;
      case 'category':
        state.category = 'all';
        document.querySelector('input[name="category"][value="all"]').checked = true;
        break;
      case 'price':
        state.priceMin = 0; state.priceMax = 500;
        priceMinEl.value = 0; priceMaxEl.value = 500;
        priceMinDisp.textContent = '0'; priceMaxDisp.textContent = '500';
        break;
      case 'avail':
        state.onlyAvail = false;
        filterAvail.checked = false;
        break;
      case 'free':
        state.onlyFree = false;
        filterFree.checked = false;
        break;
    }
    applyFilters();
  }

  function resetAllFilters() {
    state.query    = '';
    state.category = 'all';
    state.priceMin = 0; state.priceMax = 500;
    state.sortBy   = 'default';
    state.onlyAvail = false;
    state.onlyFree  = false;
    searchInput.value = '';
    document.querySelector('input[name="category"][value="all"]').checked = true;
    priceMinEl.value = 0; priceMaxEl.value = 500;
    priceMinDisp.textContent = '0'; priceMaxDisp.textContent = '500';
    sortSelect.value = 'default';
    filterAvail.checked = false;
    filterFree.checked  = false;
    applyFilters();
  }

  function setCourses(courses) {
    state.all = Array.isArray(courses) ? courses : [];

    var maxPrice = Math.max.apply(null, state.all.map(function (c) { return Number(c.price) || 0; }));
    if (maxPrice > 0) {
      var ceil = Math.ceil(maxPrice / 100) * 100;
      priceMaxEl.max = ceil;
      priceMinEl.max = ceil;
      priceMaxEl.value = ceil;
      state.priceMax = ceil;
      priceMaxDisp.textContent = ceil;
    }

    applyFilters();
  }

  function showError(err) {
    console.error('Courses: failed to load courses', err);
    resultsEl.innerHTML =
      '<div class="col-12 text-center py-5">'
      + '<h4 class="text-danger"><i class="ti-alert mr-2"></i>Could not load courses</h4>'
      + '<p class="text-muted">Make sure the backend server is running on port 8000.</p>'
      + '</div>';
    noResultsEl.style.display = 'none';
  }

  function showLoading() {
    showSkeleton();
  }

  function fetchCourses() {
    if (!resultsEl) return;
    showLoading();

    fetch('http://localhost:8000/api/courses')
      .then(async function (response) {
        if (!response.ok) {
          var errorData = await response.json().catch(function () { return {}; });
          throw new Error(errorData.message || errorData.error || 'Failed to fetch courses (Status: ' + response.status + ')');
        }
        return response.json();
      })
      .then(function (courses) {
        setCourses(courses);
      })
      .catch(function (error) {
        showError(error);
      });
  }

  searchBtn.addEventListener('click', function () { state.query = searchInput.value; applyFilters(); });
  searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { state.query = searchInput.value; applyFilters(); } });
  var debounce;
  searchInput.addEventListener('input', function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () { state.query = searchInput.value; applyFilters(); }, 350);
  });

  categoryRadios.forEach(function (radio) {
    radio.addEventListener('change', function () { state.category = this.value; applyFilters(); });
  });

  sortSelect.addEventListener('change', function () { state.sortBy = this.value; applyFilters(); });

  priceMinEl.addEventListener('input', function () {
    state.priceMin = parseInt(this.value);
    if (state.priceMin > state.priceMax) { state.priceMin = state.priceMax; this.value = state.priceMax; }
    priceMinDisp.textContent = state.priceMin;
    clearTimeout(debounce);
    debounce = setTimeout(applyFilters, 300);
  });
  priceMaxEl.addEventListener('input', function () {
    state.priceMax = parseInt(this.value);
    if (state.priceMax < state.priceMin) { state.priceMax = state.priceMin; this.value = state.priceMin; }
    priceMaxDisp.textContent = state.priceMax;
    clearTimeout(debounce);
    debounce = setTimeout(applyFilters, 300);
  });

  filterAvail.addEventListener('change', function () { state.onlyAvail = this.checked; applyFilters(); });
  filterFree.addEventListener('change',  function () { state.onlyFree  = this.checked; applyFilters(); });

  viewGridBtn.addEventListener('click', function () {
    state.viewMode = 'grid';
    viewGridBtn.classList.add('active'); viewListBtn.classList.remove('active');
    renderPage();
  });
  viewListBtn.addEventListener('click', function () {
    state.viewMode = 'list';
    viewListBtn.classList.add('active'); viewGridBtn.classList.remove('active');
    renderPage();
  });

  clearAllBtn.addEventListener('click', resetAllFilters);
  resetFiltersBtn.addEventListener('click', resetAllFilters);

  document.addEventListener('DOMContentLoaded', function () {
    var urlQ = new URLSearchParams(window.location.search).get('q') || '';
    if (urlQ) { searchInput.value = urlQ; state.query = urlQ; }
    fetchCourses();
    updateBookingBadge();
  });

  // ── Toast Notification ──
  function showBookingToast(msg, type) {
    var existing = document.getElementById('booking-toast');
    if (existing) existing.remove();

    var colors = {
      success: { bg: '#28a745', icon: 'ti-check-box' },
      warning: { bg: '#f36523', icon: 'ti-lock' },
      info:    { bg: '#17a2b8', icon: 'ti-info-alt' }
    };
    var c = colors[type] || colors.info;

    var toast = document.createElement('div');
    toast.id = 'booking-toast';
    toast.style.cssText = [
      'position:fixed', 'bottom:28px', 'right:28px', 'z-index:9999',
      'background:' + c.bg, 'color:#fff',
      'padding:14px 22px', 'border-radius:8px',
      'box-shadow:0 6px 24px rgba(0,0,0,.25)',
      'font-size:.92rem', 'font-weight:600',
      'display:flex', 'align-items:center', 'gap:10px',
      'opacity:0', 'transform:translateY(20px)',
      'transition:opacity .3s,transform .3s', 'max-width:340px'
    ].join(';');
    toast.innerHTML = '<i class="' + c.icon + '" style="font-size:1.1rem;flex-shrink:0;"></i><span>' + msg + '</span>';
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity  = '1';
      toast.style.transform = 'translateY(0)';
    });
    setTimeout(function () {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 350);
    }, 3200);
  }

  // ── Badge count บน nav link ──
  function updateBookingBadge() {
    var badge = document.getElementById('booking-nav-badge');
    if (!badge) return;
    var count = JSON.parse(localStorage.getItem('bookingList') || '[]').length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
})();
