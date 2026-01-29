
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// In-memory waiting map: request_id -> resolve function
const waitingRequests = new Map();

/**
 * BOT calls this.
 * THIS REQUEST WILL WAIT until user submits form.
 */
// app.post("/start", async (req, res) => {
//     const { phone, request_id,SID,Token } = req.body;

//     console.log("Start called:", req.body);

//     // 1) Send Twilio message
//     const accountSid = SID;
//     const authToken = Token;

//     const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

//     const formLink = `http://localhost:3000/form.html?request_id=${request_id}`;

//     await axios.post(
//         url,
//         new URLSearchParams({
//             From: "18333931636",
//             To: phone,
//             Body: `Please fill this form: ${formLink}`
//         }),
//         {
//             auth: {
//                 username: accountSid,
//                 password: authToken
//             },
//             headers: {
//                 "Content-Type": "application/x-www-form-urlencoded"
//             }
//         }
//     );

//     console.log("Twilio message sent. Now waiting for user...");

//     // 2) Create a promise and WAIT
//     let resolveFn;
//     const waitPromise = new Promise((resolve) => {
//         resolveFn = resolve;
//     });

//     waitingRequests.set(request_id, resolveFn);

//     // ⏳ THIS LINE WAITS UNTIL FORM IS SUBMITTED
//     const userData = await waitPromise;

//     waitingRequests.delete(request_id);

//     console.log("User submitted form, returning to bot.");

//     // 3) Now finally respond to bot
//     res.json({
//         status: "COMPLETED",
//         data: userData
//     });
// });
app.post("/start", async (req, res) => {
    const { phone, request_id, SID, Token } = req.body;
    console.log(JSON.stringify(req))

    console.log("Start called:", { phone, request_id });

    if (!SID || !Token) {
        return res.status(400).json({ error: "Missing Twilio credentials" });
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;
    const formLink = `https://visivr-1.onrender.com/form.html?request_id=${request_id}`;

    try {
        await axios.post(
            url,
            new URLSearchParams({
                From: "18333931636",
                To: phone,
                Body: `Please fill this form: ${formLink}`
            }),
            {
                auth: {
                    username: SID,
                    password: Token
                },
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );
    } catch (err) {
        return res.status(502).json({ error: "Twilio request failed" });
    }

    // wait logic unchanged
    let resolveFn;
    const waitPromise = new Promise((resolve) => (resolveFn = resolve));
    waitingRequests.set(request_id, resolveFn);

    const userData = await waitPromise;
    waitingRequests.delete(request_id);

    res.json({ status: "COMPLETED", data: userData });
});


/**
 * FORM submits here
 */
app.post("/submit-form", (req, res) => {
    const { request_id, name, age, problem } = req.body;

    console.log("Form received:", req.body);

    if (waitingRequests.has(request_id)) {
        const resolveFn = waitingRequests.get(request_id);

        // 🔥 This unblocks the waiting /start API
        resolveFn({ name, age, problem });
    }

    res.send("<h2>Form submitted successfully. You can close this page.</h2>");
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
