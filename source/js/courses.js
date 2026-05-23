document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('course-list');
  // Show loading text initially
  container.innerHTML = '<div class="col-12 text-center py-5"><p>Loading courses...</p></div>';

  fetch('http://localhost:8000/api/courses')
    .then(async response => {
      // Check for HTTP errors (404, 500, etc.)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to fetch courses (Status: ' + response.status + ')');
      }
      return response.json();
    })
    .then(courses => {
      // Display courses
      container.innerHTML = courses.map(course => `
        <div class="col-lg-4 col-sm-6 mb-5">
          <div class="card p-0 border-primary rounded-0 hover-shadow">
            <img class="card-img-top rounded-0" src="${course.image_url}" alt="course thumb">
            <div class="card-body">
              <ul class="list-inline mb-2">
                <li class="list-inline-item"><i class="ti-calendar mr-1 text-color"></i>${course.course_date}</li>
                <li class="list-inline-item"><a class="text-color" href="#!">${course.category || 'Uncategorized'}</a></li>
              </ul>
              <a href="#!">
                <h4 class="card-title">${course.title}</h4>
              </a>
              <p class="card-text mb-4">${course.description}</p>
              <div class="d-flex justify-content-between align-items-center">
                <span class="font-weight-bold text-color">$${course.price}</span>
                <span class="text-muted small">Capacity: ${course.current_bookings}/${course.max_capacity} students</span>
              </div>
              <button class="btn btn-primary btn-block mt-3" onclick="bookCourse(${course.id})">Book Course</button>
            </div>
          </div>
        </div>
      `).join('');
    })
    .catch(error => {
      console.error('Error fetching courses:', error);
      // Display error message directly on the page
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <h3 class="text-danger">Oops! Something went wrong.</h3>
          <p class="text-muted mb-0">We couldn't load the courses right now.</p>
          <p class="text-muted small">Error Details: ${error.message}</p>
        </div>
      `;
    });
});

function bookCourse(courseId) {
  console.log('Booking course:', courseId);
  alert('Booking functionality for course ' + courseId + ' will be implemented soon!');
}
