require('dotenv').config();
const { OAuth2Client } = require('google-auth-library'); // Correct import
const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);
const { google } = require('googleapis');
const FILE_NAME = "cardholderdycdcd.json";

exports.handler = async function (event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*', // Adjust as needed
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };
    try {
        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
            console.log("googleAuth :: option request received");
            return {
                statusCode: 204,
                headers,
            };
        }
        const code = JSON.parse(event.body).code;

        const response = await oauth2Client.getToken(code);
        delete response.res;
        console.log("googleAuth :: token generated successfully");
        return {
            headers: headers,
            statusCode: 200,
            body: JSON.stringify({ response }),
        };
    } catch (e) {
        console.error("googleAuth :: " + e.message);
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ error: e.message }),
        };
    }

};