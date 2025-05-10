<div align="center">
   <h1>nodejs_https_proxy</h1>
</div>

### **Description**

Here is a Node.js project that implements a fully functional HTTPS proxy server.

The `client` directory contains a `client.js` file that uses the configuration information in `config_agent.ini` to establish a WebSocket connection to the gateway server.

The `proxy` directory contains a `proxy.js` file that sets up an HTTPS server and a WebSocket server, handles incoming WebSocket connections, and forwards data to the target server.

This project is a Node.js-based HTTPS proxy server that supports WebSockets. It consists of two main components:

1. Client component:

- The `client.js` file in the `client` directory establishes a WebSocket connection to the gateway server using the configuration information in `config_agent.ini`.

It manages the connection between the client and the WebSocket server and forwards data.

This file manages the connection between the client and the WebSocket server and forwards data.

- The `Logger.js` file is used for logging purposes.

2. Proxy component:

- The `proxy.js` file in the `proxy` directory sets up an HTTPS server and a WebSocket server. It handles incoming WebSocket connections and passes data to the target server.

- It reads SSL certificates from the `certs` directory for secure connections.
The project uses a logging mechanism and reads configuration files to manage server settings and connections.

The `ProxyEngine` function in `proxy.js` is responsible for passing data between the WebSocket client and the target server.


### **Contact Us**

For any inquiries or questions, please contact us.

telegram : @topdev1012

email :  skymorning523@gmail.com

Teams :  https://teams.live.com/l/invite/FEA2FDDFSy11sfuegI