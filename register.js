/* -----------------------------------------------------------
   🔓 AUTH.JS - Registration Logic (Fast-Track Version)
   Handles: User Signup + Profile Creation (Double-Insert)
----------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById('registerForm');
    const submitBtn = document.getElementById('submitBtn');
    // 🆕 Select modal elements
    const successModal = document.getElementById('successModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    if (!registerForm) return;

    /* --------------------------
        🎨 TOAST NOTIFICATION SYSTEM
    -------------------------- */
    function showToast(message, isError = true) {
        const existingToast = document.querySelector('.desha-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'desha-toast';
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">${isError ? '⚠️' : '✅'}</span>
                <span>${message}</span>
            </div>
        `;

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%) translateY(100px)',
            background: isError ? '#333' : '#4CAF50',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '50px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: '10000',
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            whiteSpace: 'nowrap'
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

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Grab values from the HTML
        const fullName = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        // 🆕 NEW: Grab address value
        const address = document.getElementById('regAddress').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        // Debugging: Log the address to verify it is captured before sending
        console.log("Registering address:", address);

        // 2. Client-side Validation
        if (password !== confirmPassword) {
            showToast("Passwords do not match, bestie! ❌", true);
            return;
        }

        if (password.length < 6) {
            showToast("Password should be at least 6 characters!", true);
            return;
        }

        try {
            submitBtn.innerText = "Creating account...";
            submitBtn.disabled = true;

            /* --- STEP 1: SIGN UP IN SUPABASE AUTH --- */
            const {data: authData, error: authError} = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) throw authError;

            const user = authData.user;

            /* --- STEP 2: CREATE USER PROFILE --- */
            if (user) {
                const {error: profileError} = await supabaseClient
                    .from('user_profiles')
                    .insert([
                        {
                            id: user.id,
                            full_name: fullName,
                            phone: phone,
                            // 🆕 NEW: Insert address into Supabase table
                            address: address,
                            is_admin: false
                        }
                    ]);

                if (profileError) throw profileError;

                // ✅ SUCCESS: Show the Cool Custom Modal
                successModal.style.display = "flex";

                // Handle the redirect only when they click the modal button
                modalCloseBtn.onclick = () => {
                    window.location.href = "index_login.html";
                };
            }

        } catch (error) {
            console.error("Registration Error:", error.message);
            showToast("Error: " + error.message, true);
        } finally {
            submitBtn.innerText = "Create account";
            submitBtn.disabled = false;
        }
    });
});