// Set port number for WebSocket.
var webSocketsServerPort = 8081;

// Set WebSocket.
var webSocketServer = require('websocket').server;
var http = require('http');
var mysql = require('mysql');// MySQL module

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

/**
 * An enum for communication protocol flags.
 * @enum {number}
 */
const Flag = {
    REQUEST_USER_TREASURE_LIST: 1,
    REQUEST_USER_MADE_GAME: 2,
    REQUEST_USER_PARTICIPATING_GAME_LIST: 3,
    REQUEST_GAME_JOIN_USER_LIST: 4,
    REQUEST_GAME_TREASURE_INFO: 5,
    REQUEST_USER_INFO: 6,

    SET_USER_INFO: 11,
    SET_GAME_INFO: 12,
    SET_GAME_STATUS_END: 13,
    SET_USER_JOIN: 14,
    SET_USER_GET_TREASURE: 15,
};

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

                    case Flag.REQUEST_USER_INFO:
                        var nickname = json['nickname'];
                        var sql = `select usn, tot_point from user_list where nickname = '${nickname}'`;
                        
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                console.log('Wrong Parameter.');
                                wsServer.broadcastUTF('Wrong Parameter.');
                            } else {
                                obj = new Object();
                                obj['flag'] = Flag.REQUEST_USER_INFO;
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

