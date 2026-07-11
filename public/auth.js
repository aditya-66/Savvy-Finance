document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    
    // In auth pages, check if logged in
    const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html') || window.location.pathname.includes('verify.html');
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
                    if (data.action === 'REDIRECT_TO_VERIFICATION') {
                        window.location.href = `verify.html?email=${encodeURIComponent(email)}`;
                    } else {
                        alert('Login failed: ' + data.error);
                    }
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
                
                if (response.ok || (response.status === 201 && data.action === 'REDIRECT_TO_VERIFICATION')) {
                    alert('Registration successful! Please verify your email.');
                    window.location.href = `verify.html?email=${encodeURIComponent(email)}`;
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

    // --- Verification Page Logic ---
    const verifyForm = document.getElementById('verify-form');
    if (verifyForm) {
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');
        const displayEmail = document.getElementById('display-email');
        if (email && displayEmail) {
            displayEmail.textContent = email;
        } else if (!email) {
            window.location.href = 'login.html'; // No email to verify
        }

        const inputs = document.querySelectorAll('.otp-input');
        
        // Auto-focus next input
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                    inputs[index - 1].focus();
                }
            });
        });

        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let otp = '';
            inputs.forEach(input => otp += input.value);
            
            if (otp.length !== 6) {
                alert('Please enter all 6 digits.');
                return;
            }

            try {
                const response = await fetch('/api/auth/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp })
                });
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('savvy_auth_token', data.token);
                    localStorage.setItem('savvy_user_name', data.name);
                    alert('Email verified successfully!');
                    window.location.href = 'index.html';
                } else {
                    alert('Verification failed: ' + data.error);
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred during verification.');
            }
        });

        const resendBtn = document.getElementById('resend-otp');
        if (resendBtn) {
            resendBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const response = await fetch('/api/auth/resend-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        alert('A new verification code has been sent to your email.');
                    } else {
                        alert('Failed to resend code: ' + data.error);
                    }
                } catch (err) {
                    console.error(err);
                    alert('An error occurred while resending the code.');
                }
            });
        }
    }
});
