const fs = require('fs');
const net = require('net');
const ini = require('ini');
const Logger = require('./Logger');
const WebSocket = require('ws');
const http = require('http');

//.
const SYS_PROXY_PORT = 18888;
const MOBILE_PROXY_PORT = 18889;
const SYS_WAIT_LISTEN_START = 19000;
const SYS_WAIT_LISTEN_CNT = 500;

const config = ini.parse(fs.readFileSync("config_agent.ini", "utf-8"));
const gw_ip = config.settings.gw_ip; // Get policy_url from config
const gw_port = config.settings.gw_port;


const log_level = 0;//
const logFile = "kagent.log";//

const token_string = "_kenan_header_";
const logger = new Logger(log_level, logFile);


let lv_global_ip = "1.1.1.1";


let https_port_list = [];
function upsetHttpsCon(listenport, targethost, targetport, isDirect) {
    const index = https_port_list.findIndex(entry => entry.listen_port === listenport);
    
    if (index !== -1) {
        https_port_list[index].target_url = targethost;
        https_port_list[index].target_port = targetport;
        https_port_list[index].is_direct = isDirect;
    } else {
        https_port_list.push({ listen_port: listenport, target_url: targethost , target_port: targetport, is_direct: isDirect});
    }
}

function getTargetURL(listenport) {
    const entry = https_port_list.find(entry => entry.listen_port === listenport);
    if (entry) {
        return entry.target_url;
    } else {
        return "-1";
    }
}

function getTargetPort(listenport) {
    const entry = https_port_list.find(entry => entry.listen_port === listenport);
    if (entry) {
        return entry.target_port;
    } else {
        return -1;
    }
}

function getIsDirect(listenport) {
    const entry = https_port_list.find(entry => entry.listen_port === listenport);
    if (entry) {
        return entry.is_direct;
    } else {
        return -1;
    }
}
function DeletId(listenport) {
    // Remove all entries from https_port_list where user_id matches the provided userId
    https_port_list = https_port_list.filter(entry => entry.listen_port !== listenport);
}

//.
let https_url_list = [];
function upsetURLInfo(hostname, isDirect) {
    const index = https_url_list.findIndex(entry => entry.url_hostname === hostname);
    
    if (index !== -1) {
        https_url_list[index].is_direct = isDirect;
    } else {
        https_url_list.push({ url_hostname: hostname, is_direct: isDirect});
    }
}

function getIsDirectFromURLInfo(full_url) {
    for (let entry of https_url_list) {
        if (full_url.includes(entry.url_hostname)) {
            return entry.is_direct;  // Return the isDirect value as soon as a match is found
        }
    }
    return -1;  // Return null if no hostname contains ".com"
}





//. HTTPS Protocol
function WSS_ConServer_IS_HTTPS(listen_port, gw_taget_port, policy_url, policy_port){

    let     w_gw_target_port = gw_taget_port;

    const server = net.createServer((from) => {
        const clientIP = from.remoteAddress;
        const localIP = from.localAddress;
        const clientPort = from.remotePort;

        policy_url =  getTargetURL(listen_port);
        policy_port =  getTargetPort(listen_port);
        if(policy_port == -1){
            from.end();
            return;
        }

        // Replace net connection with WebSocket connection
        const ws = new WebSocket(`wss://${gw_ip}:${gw_port}`, {
            rejectUnauthorized: false,
        });
        let bufferQueue = [];
  
        logger.status(`WSS_ConServer_IS_HTTPS ${gw_port} : ${policy_url}:${policy_port} , listen_port:${listen_port}`);


        ws.on('open', () => {
            //.
            const header = token_string + `{\"ip\":\"${lv_global_ip}\", \"listen_port\":\"${listen_port}\", \"policy_url\":\"${policy_url}\", \"policy_port\":\"${policy_port}\"}`;

            ws.send(header);
            //Flush any buffered data
            bufferQueue.forEach((message) => {
                ws.send(message);
            });
            bufferQueue = [];  
        });


        // Forward data from client to WebSocket server with header
        from.on('data', (chunk) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(chunk);
            } else {
                bufferQueue.push(chunk);
            }
        });

        // Forward data from WebSocket server back to client
        ws.on('message', function message(chunk) {
            from.write(chunk); // Write data from WebSocket to client
        });

        // Handle client and WebSocket connection errors
        ws.on('error', (err) => {
            from.end(); // Close client connection on error
        });

        from.on('error', (err) => {
            ws.close(); // Close WebSocket connection on error
        });

        // Handle client disconnection
        from.on('close', () => {
            ws.close();  // Close WebSocket connection
        });

        // Handle WebSocket server disconnection
        ws.on('close', () => {
            from.end();
        });

    }).listen(listen_port, '127.0.1.255', () => {
        //logger.status(`VM Agent started on port ${listen_port}`);
    });

    // Handle server errors
    server.on('error', (err) => {
        //logger.error(`VM Agent error on port ${listen_port}:`, err.message);
    });

}

//. router server 
function startServer() {

    //. For System Proxy
    for (let i = SYS_WAIT_LISTEN_START; i < SYS_WAIT_LISTEN_START + SYS_WAIT_LISTEN_CNT; i++) {
        WSS_ConServer_IS_HTTPS(i , gw_port, "my_test.com", 11111);
  	}

}

startServer();

///////////////////////////////////////////////////////////////////////////////////
// Create the HTTP proxy server
const sys_proxy_server = http.createServer((req, res) => {
    const clientAddress = req.socket.remoteAddress;
    const clientPort = req.socket.remotePort;
});

// Handle CONNECT requests for HTTPS tunneling
sys_proxy_server.on('connect', (req, clientSocket, head) => {
    const clientAddress = clientSocket.remoteAddress;
    const clientPort = clientSocket.remotePort;

    const [hostname, port] = req.url.split(':');

    logger.status(`sys_proxy_server :  ${hostname}, ${port}`);


    let  my_is_direct = 0; //. 0 : to router
    //////////////////////////////////////////////////////////////////
    let 	my_listen_port = -1;
    let 	target_port;
    
    for (let i = SYS_WAIT_LISTEN_START; i < SYS_WAIT_LISTEN_START + SYS_WAIT_LISTEN_CNT; i++) {
        //. new listen port
    	if(getTargetURL(i) == "-1"){
    		my_listen_port = i;
    		break;
    	}
  	}

    logger.status(`sys_proxy_server :  ${my_listen_port}`);

    //. 
    if(my_listen_port == -1){
        clientSocket.end(`HTTP/1.1 403 Forbidden\r\n\r\n`);
        return;        
    } 
  
    target_port = port || 443;
    upsetHttpsCon(my_listen_port, hostname, target_port, my_is_direct);

    logger.status(`upsetHttpsCon :  ${my_listen_port}, ${target_port}`);

    /////////////////////////////////////////////////////////////////////
    const serverSocket = net.connect(my_listen_port, "127.0.1.255", () => {
        // Respond to the client indicating the tunnel is established
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    });
    
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);

    // Error handling
    serverSocket.on('error', (err) => {
        clientSocket.end(`HTTP/1.1 500 Internal serverSocket Error\r\n\r\n`);
        DeletId(my_listen_port);
    });

    clientSocket.on('error', (err) => {
        clientSocket.end(`HTTP/1.1 500 Internal clientSocket Error\r\n\r\n`);
        DeletId(my_listen_port);
    });

    serverSocket.on('close', () => {
        clientSocket.end(`HTTP/1.1 500 Internal serverSocket close\r\n\r\n`);
        DeletId(my_listen_port);
    });

    clientSocket.on('close', () => {
        serverSocket.end();
        DeletId(my_listen_port);
    });
    
});

// Start the proxy server
sys_proxy_server.listen(SYS_PROXY_PORT, '127.0.0.1', () => {
});
