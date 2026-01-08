/* -----------------------------------------------------------
   🔐 LOGIN-LOGIC.JS - Instant Access Version
----------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    if (!loginForm) return;

    /* --------------------------
        🎨 TOAST NOTIFICATION SYSTEM
    -------------------------- */
    function showToast(message, isError = true) {
        const existingToast = document.querySelector('.desha-toast');
        if (existingToast) existingToast.remove();
        const toast = document.createElement('div');
        toast.className = 'desha-toast';
        toast.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 18px;">${isError ? '⚠️' : '✅'}</span><span>${message}</span></div>`;
        Object.assign(toast.style, {
            position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%) translateY(100px)',
            background: isError ? '#333' : '#4CAF50', color: 'white', padding: '12px 24px', borderRadius: '50px',
            fontSize: '14px', fontWeight: '600', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: '10000',
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', whiteSpace: 'nowrap'
        });
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        loginBtn.innerText = "Authenticating...";
        loginBtn.disabled = true;

        try {
            const {data, error} = await supabaseClient.auth.signInWithPassword({email, password});
            if (error) throw error;
            if (data.session) {
                window.location.href = "index_products.html";
            }
        } catch (error) {
            showToast("Login Error: " + error.message, true);
            loginBtn.innerText = "Login";
            loginBtn.disabled = false;
        }
    });
});