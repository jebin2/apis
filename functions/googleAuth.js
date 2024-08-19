require('dotenv').config();
const { OAuth2Client } = require('google-auth-library'); // Correct import
const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);
const { createAppDataFile, getAppDataFile, getDriveObject } = require("./utils/DataProcessor");

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
        const content = JSON.parse(event.body).content;
        let response = await oauth2Client.getToken(code);
        response.access_token = response.tokens.access_token;
        response.refresh_token = response.tokens.refresh_token;
        delete response.res;
        delete response.tokens;

        if(content) {
            let drive = await getDriveObject(response);
            await createAppDataFile(drive, content);
            let res = await getAppDataFile(drive);
            response.content = res.content;
        }
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