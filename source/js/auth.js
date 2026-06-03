/* jshint esversion:8, browser:true, globalstrict:true */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const signupForm = document.getElementById('signupForm');
  const signupMessage = document.getElementById('signupMessage');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutNavItem = document.getElementById('logoutNavItem');
  const bookingNavItem = document.getElementById('bookingNavItem');
  const loginNavLinks = document.querySelectorAll('a[href="#loginModal"]');
  const signupNavLinks = document.querySelectorAll('a[href="#signupModal"]');

  var passwordPattern = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;

/**
   * Function: updateAuthUI
   * Purpose: Updates the navigation and UI elements based on the user's authentication status.
   * Data Flow: Reads 'authToken' from localStorage -> Toggles visibility of login, signup, logout, and booking nav items.
   */
  function updateAuthUI() {
    const token = localStorage.getItem('authToken');
    const loggedIn = Boolean(token);

    if (logoutNavItem) {
      logoutNavItem.classList.toggle('d-none', !loggedIn);
    }

    if (bookingNavItem) {
      bookingNavItem.classList.toggle('d-none', !loggedIn);
    }

    loginNavLinks.forEach(function (link) {
      if (link.parentElement) {
        link.parentElement.classList.toggle('d-none', loggedIn);
      }
    });
    signupNavLinks.forEach(function (link) {
      if (link.parentElement) {
        link.parentElement.classList.toggle('d-none', loggedIn);
      }
    });
  }

/**
   * Function: handleLogout
   * Purpose: Logs the user out by removing their authentication data and reloading the page.
   * Data Flow: Event Trigger -> Removes 'authToken' and 'userId' from localStorage -> Calls updateAuthUI() -> Reloads page.
   */
  function handleLogout(event) {
    event.preventDefault();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    updateAuthUI();
    window.location.reload();
  }

/**
   * Function: showMessage
   * Purpose: Displays a success or error message within a specified DOM element.
   * Data Flow: Accepts DOM element, text string, and boolean flag -> Updates element's textContent and classes.
   */
  function showMessage(el, text, isError) {
    if (!el) {
      return;
    }
    el.textContent = text;
    el.className = 'text-muted small mb-3';
    if (isError) {
      el.classList.add('text-danger');
    } else {
      el.classList.add('text-success');
    }
  }

  updateAuthUI();

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      showMessage(loginMessage, '', false);

      if (!email || !password) {
        showMessage(loginMessage, 'Please enter both email and password.', true);
        return;
      }

      try {
        const response = await fetch(`${window.ENV.API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (!response.ok) {
          showMessage(loginMessage, result.message || result.error || 'Login failed. Please try again.', true);
          return;
        }

        localStorage.setItem('authToken', result.token);
        if (result.userId) {
          localStorage.setItem('userId', result.userId);
        }
        showMessage(loginMessage, 'Login successful! Token stored in localStorage.', false);
        updateAuthUI();
        if (window.$) {
          window.$('#loginModal').modal('hide');
        }

        setTimeout(function () {
          window.location.reload();
        }, 500);
      } catch (error) {
        showMessage(loginMessage, 'Unable to login. Please check your connection.', true);
        console.error('Login error:', error);
      }
    });
  }

  if (signupForm) {
    var signupButton = signupForm.querySelector('button[type="submit"]');
    var signupInProgress = false;

    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (signupInProgress) {
        return;
      }

      signupInProgress = true;
      if (signupButton) {
        signupButton.disabled = true;
      }

      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;

      showMessage(signupMessage, '', false);

      if (!name || !email || !password) {
        showMessage(signupMessage, 'Please enter name, email, and password.', true);
        signupInProgress = false;
        if (signupButton) {
          signupButton.disabled = false;
        }
        return;
      }

      if (!passwordPattern.test(password)) {
        showMessage(signupMessage, 'Password must be at least 8 characters long and include one uppercase letter and one special character.', true);
        signupInProgress = false;
        if (signupButton) {
          signupButton.disabled = false;
        }
        return;
      }

      try {
        const response = await fetch(`${window.ENV.API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name, email, password })
        });

        const result = await response.json();

        if (!response.ok) {
          showMessage(signupMessage, result.message || result.error || 'Registration failed. Please try again.', true);
          signupInProgress = false;
          if (signupButton) {
            signupButton.disabled = false;
          }
          return;
        }

        if (result.token) {
          localStorage.setItem('authToken', result.token);
          showMessage(signupMessage, 'Registration successful. You are now logged in.', false);
          updateAuthUI();
          signupForm.reset();
          if (window.$) {
            window.$('#signupModal').modal('hide');
          }
          setTimeout(function () {
            window.location.reload();
          }, 300);
        } else {
          showMessage(signupMessage, 'Registration successful. You can now login.', false);
          signupForm.reset();
          if (window.$) {
            window.$('#signupModal').modal('hide');
          }
          signupInProgress = false;
          if (signupButton) {
            signupButton.disabled = false;
          }
        }
      } catch (error) {
        showMessage(signupMessage, 'Unable to register. Please try again later.', true);
        console.error('Registration error:', error);
        signupInProgress = false;
        if (signupButton) {
          signupButton.disabled = false;
        }
      }
    });
  }
});
