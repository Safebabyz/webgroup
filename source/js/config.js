// Global Configuration File for Frontend
window.ENV = {
    // Determine API Base URL dynamically based on the current hostname
    // You can override this if you want to point to a specific production API
    API_BASE_URL: window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://' + window.location.hostname
};
