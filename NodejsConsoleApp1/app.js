// Set port number for WebSocket.
var webSocketsServerPort = 8081;

// Set WebSocket.
var webSocketServer = require('websocket').server;
var http = require('http');
var mysql = require('MYSQL');// mysql module

var server = http.createServer(function (request, response) { });
server.listen(webSocketsServerPort, function () {
    console.log(`Server is listening on port ${webSocketsServerPort}`);
});

var wsServer = new webSocketServer({
    httpServer: server
});
// Connect to mysql db.
var sqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'timetofly1',
    database: 'treasurehunt'
});

// Connect to WebSocket.
wsServer.on('request', function (request) {

    console.log('Connection from origin request.origin.');
        
    var connection = request.accept('echo-protocol', request.origin);
    console.log('Connection accepted.');

    // Client >> Server
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log(`Received Message from : ${message.utf8Data}`);

            // Parse json.
            try {
                var json = JSON.parse(message.utf8Data);
                var flag = json['flag'];

                // Server >> Clients according to flag
                switch (flag) {

                    // TODO: Write all case process like 'case 6' below.

                    case 6:// Get the user's information and send to Client.
                        var nickname = json['nickname'];
                        var sql = `select usn, tot_point from user_list where nickname = '${nickname}'`;

                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                console.log('Wrong Parameter.');
                                wsServer.broadcastUTF('Wrong Parameter.');
                            } else {
                                obj = new Object();
                                obj['flag'] = 6;
                                obj['user_info'] = rows;
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }

                        });
                        break;
                }
            } catch (exc) {
                console.log('Wrong data type.');
                wsServer.broadcastUTF('Wrong data type.');
            }                     
        }
    });
});

