// require('dotenv').config();
const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
} = process.env;

const { google } = require('googleapis');
const axios = require('axios');

exports.handler = async function (event, context) {
    const code = event.queryStringParameters.code;
    const clientId = GOOGLE_CLIENT_ID;
    const clientSecret = GOOGLE_CLIENT_SECRET;
    const redirectUri = GOOGLE_REDIRECT_URI;

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        const res = await drive.files.list();
        return {
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow all origins (adjust as needed)
                'Content-Type': 'application/json',
            },
            statusCode: 200,
            body: JSON.stringify(res.data),
        };
    } catch (error) {
        console.error('Error getting tokens:', error);
        return {
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow all origins (adjust as needed)
                'Content-Type': 'application/json',
            },
            statusCode: 500,
            body: 'Error getting tokens',
        };
    }
};
