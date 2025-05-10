const fs = require("fs");
const net = require("net");
const ini = require("ini");
const Logger = require("./Logger");
const WebSocket = require("ws");
const https = require("https");

// Read config.ini file
const config = ini.parse(fs.readFileSync("config_client.ini", "utf-8"));
const gw_port = config.settings.gw_port;
const log_level = config.settings.logLevel;
const logFile = config.settings.logFile;
const token_string = "_kenan_header_";
const logger = new Logger(log_level, logFile);



//.
startServer_agent_direct();

function ProxyEngine(
  realClientIP,
  target,
  target_port,
  ws,
  left
) {
  // Create a TCP connection to the target server
  const targetSocket = net.createConnection(
    {
      host: target,
      port: target_port,
    },
    () => {
    }
  );

  if (left) {
    targetSocket.write(Buffer.from(left));
  }

  // Forward WebSocket data to target server
  ws.on("message", (chunk) => {
    targetSocket.write(chunk);
  });

  // Forward target server data to WebSocket client
  targetSocket.on("data", (chunk) => {
    ws.send(chunk);
  });
  //targetSocket.pipe(ws);

  // Handle errors and disconnections
  targetSocket.on("error", (err) => {
    ws.close(); // Close WebSocket connection on error
  });

  ws.on("error", (err) => {
    targetSocket.end(); // Close target connection on error
  });
  // Handle WebSocket client disconnection
  ws.on("close", () => {
    targetSocket.end();
  });
  // Handle target server disconnection
  targetSocket.on("close", () => {
    ws.close();
  });
}

function startServer_agent_direct() {
  const direct_listen_port = gw_port;
  const serverOptions = {
    key: fs.readFileSync("certs/launcher.key"), // Path to your private key file
    cert: fs.readFileSync("certs/launcher.crt"), // Path to your certificate file
  };

  // Create an HTTPS server with SSL options
  const server = https.createServer(serverOptions);

  // Create WebSocket server
  const wss = new WebSocket.Server({ server });

  // Handle WebSocket connection
  wss.on("connection", (ws, req) => {
    const clientIP = req.socket.remoteAddress;

    // Handle incoming data from the WebSocket client
    ws.once("message", (message) => {
      message = message.toString();

      const regex = /_kenan_header_(\{.*?\})/; // Regex to capture the JSON object part
      const matchJson = message.match(regex);
      let left = null;
      let realClientIP = "";
      let direct_url = "";
      let direct_port = "";

      if (matchJson && matchJson[1]) {
        const parsedData = JSON.parse(matchJson[1]);
        realClientIP = parsedData.ip;
        direct_url = parsedData.policy_url;
        direct_port = parsedData.policy_port;

        message = message.replace(regex, ""); // Clean the message
        if (message.length > 0) 
          left = message.substring(matchJson[1].length);
      } 
      else {
        ws.close(); // Close connection if parsing fails
        return;
      }


      ProxyEngine(
        realClientIP,
        direct_url,
        direct_port,
        ws,
        left,
      );
    });
  });

  // Start the server
  server.listen(direct_listen_port, "0.0.0.0", () => {
    logger.status(`startServer_agent_direct started on port ${direct_listen_port}`);
  });

  // Handle server errors
  server.on("error", (err) => {
    logger.status(`Error startServer_agent_direct started on port ${direct_listen_port}`);
  });
}

