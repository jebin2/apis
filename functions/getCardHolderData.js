const { createAppDataFile, getAppDataFile, getDriveObject, updateAppDataFile } = require("./utils/DataProcessor");
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
        let drive = await getDriveObject(response);
        
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
