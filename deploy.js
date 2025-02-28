const ftp = require("basic-ftp");
const path = require("path");
require('dotenv').config();

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    
    try {
        await client.access({
            host: "ftp.butterandbytes.com",
            user: "bread1@butterandbytes.com",
            password: "jNp.EtmQG=0Q",
            port: 21,
            secure: true, // Using FTPS
            secureOptions: {
                rejectUnauthorized: false // Accept self-signed certificates if any
            }
        });

        console.log("FTP Connection established");
        console.log("Current directory:", await client.pwd());

        // Upload the entire application
        console.log("Starting upload...");
        await client.uploadFromDir(".", "/"); // Upload from current directory to root

        console.log("Upload completed successfully!");
    }
    catch(err) {
        console.error("Error during deployment:", err);
    }
    finally {
        client.close();
    }
}

// Run the deployment
deploy();
