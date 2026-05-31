/* jshint esversion:8, browser:true, globalstrict:true */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  var resultsEl = document.getElementById('search-results');
  if (!resultsEl) {
    return;
  }

  if (window.searchApp && typeof window.searchApp.showLoading === 'function') {
    window.searchApp.showLoading();
  } else {
    resultsEl.innerHTML = '<div class="col-12 text-center py-5"><p>Loading courses...</p></div>';
  }

  fetch('http://localhost:8000/api/courses')
    .then(async response => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to fetch courses (Status: ' + response.status + ')');
      }
      return response.json();
    })
    .then(courses => {
      if (window.searchApp && typeof window.searchApp.setCourses === 'function') {
        window.searchApp.setCourses(courses);
      } else {
        resultsEl.innerHTML = '<div class="col-12 text-center py-5"><p>Courses loaded, but the search module is not initialized.</p></div>';
      }
    })
    .catch(error => {
      console.error('Error fetching courses:', error);
      if (window.searchApp && typeof window.searchApp.showError === 'function') {
        window.searchApp.showError(error);
      } else {
        resultsEl.innerHTML = `
          <div class="col-12 text-center py-5">
            <h3 class="text-danger">Oops! Something went wrong.</h3>
            <p class="text-muted mb-0">We couldn't load the courses right now.</p>
            <p class="text-muted small">Error Details: ${error.message}</p>
          </div>
        `;
      }
    });
});

function bookCourse(courseId) {
  console.log('Booking course:', courseId);
  alert('Booking functionality for course ' + courseId + ' will be implemented soon!');
}
