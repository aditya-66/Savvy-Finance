document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    
    // In auth pages, check if logged in
    const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html');
    const isLoggedIn = localStorage.getItem('savvy_auth_token');
    
    if (isAuthPage && isLoggedIn) {
        window.location.href = 'index.html';
        return;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('savvy_auth_token', data.token);
                    localStorage.setItem('savvy_user_name', data.name);
                    window.location.href = 'index.html';
                } else {
                    alert('Login failed: ' + data.error);
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred during login.');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await response.json();
                
                if (response.ok) {
                    alert('Registration successful! Please login.');
                    window.location.href = 'login.html';
                } else {
                    alert('Registration failed: ' + data.error);
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred during registration.');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('savvy_auth_token');
            localStorage.removeItem('savvy_user_name');
            window.location.href = 'login.html';
        });
    }
});
