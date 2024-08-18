require('dotenv').config();
const { OAuth2Client } = require('google-auth-library'); // Correct import
const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);
const { google } = require('googleapis');
const FILE_NAME = "cardholder.json";

exports.handler = async function (event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };
    try {
        if (event.httpMethod === 'OPTIONS') {
            console.log("getCardHolderData :: option request received");
            return {
                statusCode: 204,
                headers,
            };
        }
        const payload = JSON.parse(event.body);
        let access_token = payload.access_token;
        let refresh_token = payload.refresh_token;
        let newFileContent = payload.content;
        let type = payload.type;
        let response = {
            access_token: access_token,
            refresh_token: refresh_token
        };

        oauth2Client.setCredentials({
            access_token: response.access_token,
            refresh_token: response.refresh_token,
        });
        let drive;
        try {
            drive = google.drive({ version: 'v3', auth: oauth2Client });
            console.log("getCardHolderData :: drive object generated");
        } catch (error) {
            console.warn("getCardHolderData :: token expirted, trying to generate with refresh token " + error.message);
            if (error.response && error.response.data && error.response.data.error === 'invalid_grant') {
                response = await oauth2Client.refreshToken(tokens.refreshToken);
                console.log("getCardHolderData :: token successfully generated with refresh token");
                delete response.res;
                oauth2Client.setCredentials({
                    access_token: response.tokens.access_token,
                    refresh_token: response.tokens.refresh_token,
                });
                drive = google.drive({ version: 'v3', auth: oauth2Client });
                console.log("getCardHolderData :: drive object generated with refresh token");
            } else {
                throw error;
            }
        } finally {
            if (!drive) {
                throw ("getCardHolderData :: error in generating token.");
            }
        }
        switch (type) {
            case "create":
            case "fetch":
                await createAppDataFile(drive);
                break;
            case "update":
                await updateAppDataFile(drive, newFileContent);
                break;
            case "delete":
                await deleteAppDataFiles(drive);
                break;
        }
        const file = type === "delete" ? {content: []} : await getAppDataFile(drive);

        return {
            headers: headers,
            statusCode: 200,
            body: JSON.stringify({
                ...response,
                content: file.content
            }),
        };
    } catch (error) {
        console.error("getCardHolderData :: " + error.message);
        return {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            statusCode: 500,
            body: JSON.stringify({ error: 'Error getting tokens', details: error.message }),
        };
    }
};
async function createAppDataFile(drive) {
    try {
        let isFileAlreadyExists = await isAppDataFileExists(drive);
        if (isFileAlreadyExists) {
            console.warn("createAppDataFile :: file already exists.");
            return true;
        }

        await drive.files.create({
            resource: {
                name: FILE_NAME,
                parents: ['appDataFolder'] // Place it in the appDataFolder
            },
            media: {
                mimeType: 'application/json',
                body: JSON.stringify([])
            },
            fields: 'id'
        });

        console.warn("createAppDataFile :: file created successfully.");
        return true;
    } catch (error) {
        console.error('createAppDataFile :: ' + error.message);
        throw error;
    }
}

async function updateAppDataFile(drive, newFileContent) {
    try {
        const file = await getAppDataFile(drive);
        let fileId = file.id;
        await drive.files.update({
            fileId: fileId,
            media: {
                mimeType: 'application/json',
                body: JSON.stringify(newFileContent)
            },
            fields: 'id'
        });
        console.log('updateAppDataFile :: file updated successfully');
        return true;
    } catch (error) {
        console.error('updateAppDataFile :: ' + error.message);
        throw error;
    }
}

async function getAppDataFile(drive) {
    try {
        const res = await drive.files.list({
            spaces: 'appDataFolder',
            fields: 'files(id, name)',
        });

        const file = res.data.files.find(file => file.name === FILE_NAME);

        if (!file) {
            console.error("getAppDataFile :: file not found.");
            throw new Error("getAppDataFile :: file not found.");
        }

        const fileContent = await drive.files.get({
            fileId: file.id,
            alt: 'media', // Get the file content directly
        });

        console.log("getAppDataFile :: file retrieved successfully.");
        return {
            id: file.id,
            content: fileContent.data ? fileContent.data : []
        };
    } catch (error) {
        console.error("getAppDataFile :: " + error.message);
        throw error;
    }
}

async function isAppDataFileExists(drive) {
    try {
        const res = await drive.files.list({
            spaces: 'appDataFolder',
            fields: 'files(id, name)',
        });
        const file = res.data.files.find(file => file.name === FILE_NAME);
        return !!file;
    } catch (error) {
        console.error("isAppDataFileExists :: " + error.message);
        throw error;
    }
}
async function listAppDataFiles(drive) {
    try {
        const res = await drive.files.list({
            spaces: 'appDataFolder',
            fields: 'files(id, name)'
        });

        res.data.files.forEach(file => {
            console.log(`Found file: ${file.name} (${file.id})`);
        });

        if (res.data.files.length > 0) {
            const fileId = res.data.files[0].id; // Assuming you want to read the first file
            const fileContent = await drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            console.log('File content:', fileContent.data);
        }
    } catch (error) {
        console.error('Error listing files:', error);
    }
}
async function deleteAppDataFiles(drive) {
    try {
        const res = await drive.files.list({
            spaces: 'appDataFolder',
            fields: 'files(id, name)'
        });
        if(res.data.files.length > 0) {
            for (let file of res.data.files) {
                await drive.files.delete({ fileId: file.id });
            }
        }

        console.log('Files deleted successfully');
    } catch (error) {
        console.error('Error deleting files:', error);
    }
}
