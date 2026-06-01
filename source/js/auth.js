/* jshint esversion:8, browser:true, globalstrict:true */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const signupForm = document.getElementById('signupForm');
  const signupMessage = document.getElementById('signupMessage');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutNavItem = document.getElementById('logoutNavItem');
  const loginNavLinks = document.querySelectorAll('a[href="#loginModal"]');
  const signupNavLinks = document.querySelectorAll('a[href="#signupModal"]');

  var passwordPattern = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;

  function updateAuthUI() {
    const token = localStorage.getItem('authToken');
    const loggedIn = Boolean(token);

    if (logoutNavItem) {
      logoutNavItem.classList.toggle('d-none', !loggedIn);
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

  function handleLogout(event) {
    event.preventDefault();
    localStorage.removeItem('authToken');
    updateAuthUI();
    window.location.reload();
  }

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
        const response = await fetch('http://localhost:8000/api/auth/login', {
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
        showMessage(loginMessage, 'Login successful! Token stored in localStorage.', false);
        updateAuthUI();

        setTimeout(() => {
          window.location.reload();
        }, 800);
      } catch (error) {
        showMessage(loginMessage, 'Unable to login. Please check your connection.', true);
        console.error('Login error:', error);
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;

      showMessage(signupMessage, '', false);

      if (!name || !email || !password) {
        showMessage(signupMessage, 'Please enter name, email, and password.', true);
        return;
      }

      if (!passwordPattern.test(password)) {
        showMessage(signupMessage, 'Password must be at least 8 characters long and include one uppercase letter and one special character.', true);
        return;
      }

      try {
        const response = await fetch('http://localhost:8000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name, email, password })
        });

        const result = await response.json();

        if (!response.ok) {
          showMessage(signupMessage, result.message || result.error || 'Registration failed. Please try again.', true);
          return;
        }

        showMessage(signupMessage, 'Registration successful. You can now login.', false);
        signupForm.reset();
      } catch (error) {
        showMessage(signupMessage, 'Unable to register. Please try again later.', true);
        console.error('Registration error:', error);
      }
    });
  }
});
