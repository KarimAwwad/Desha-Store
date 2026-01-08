/* -----------------------------------------------------------
   🔐 LOGIN-LOGIC.JS - Instant Access Version
----------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Capture credentials from your friend's HTML IDs
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // 2. UI Feedback
        loginBtn.innerText = "Authenticating...";
        loginBtn.disabled = true;

        try {
            // 3. Attempt Login
            // Because "Confirm Email" is OFF, this works instantly after signup
            const {data, error} = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            // 4. Verification Step
            // We ensure the session is active before moving to the store
            if (data.session) {
                console.log("Access Granted for:", data.user.email);

                // 5. Direct Redirect
                // Your script.js on this next page will handle showing/hiding admin buttons
                window.location.href = "index_products.html";
            }

        } catch (error) {
            // If the user hasn't registered yet or typed the wrong password
            alert("Login Error: " + error.message);
            console.error("Auth Error:", error);

            // Reset button so they can try again
            loginBtn.innerText = "Login";
            loginBtn.disabled = false;
        }
    });
});