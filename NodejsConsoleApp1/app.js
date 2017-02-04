// set port number for WebSocket
var webSocketsServerPort = 8081;

// set WebSocket
var webSocketServer = require('websocket').server;
var http = require('http');
var mysql = require('mysql');//mysql module

var server = http.createServer(function (request, response) { });
server.listen(webSocketsServerPort, function () {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

var wsServer = new webSocketServer({
    httpServer: server
});
//connect to mysql db
var sqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'timetofly1',
    database: 'treasurehunt'
});

// connect WebSocket 
wsServer.on('request', function (request) {

    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
        
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');

    // Client >> Server
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log((new Date()) + ' Received Message from : ' + message.utf8Data);

            //parse json
            try {
                var json = JSON.parse(message.utf8Data);
                var flag = json["flag"];

                // Server >> Clients according to flag
                switch (flag) {

                    //TODO: write all case process like 'case 6'                    
                    case 6:
                        var nickname = json["nickname"];
                        
                        sqlConnection.query('select usn, tot_point from user_list where nickname = \'' + nickname + '\'', function (err, rows, cols) {
                            if (err) throw err;

                            obj = new Object()
                            obj["flag"] = 6;
                            obj["user_info"] = rows;
                            console.log(JSON.stringify(obj));
                            wsServer.broadcastUTF(JSON.stringify(obj));

                        });
                        break;
                }
            } catch (exc) {
                console.log("wrong data type");
                wsServer.broadcastUTF("wrong data type");
            }                     
        }
    });
});

