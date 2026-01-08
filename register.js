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
            alert("Passwords do not match! ❌");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        // 3. UI Loading State
        submitBtn.innerText = "Processing...";
        submitBtn.disabled = true;

        try {
            /* --- STEP 1: CREATE AUTH ACCOUNT --- */
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
            alert("Error: " + error.message);
        } finally {
            submitBtn.innerText = "Create account";
            submitBtn.disabled = false;
        }
    });
});