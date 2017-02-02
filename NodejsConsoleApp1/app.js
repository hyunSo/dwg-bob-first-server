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

sqlConnection.connect();

// coonect to WebSocket 
wsServer.on('request', function (request) {

    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

    
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');

    // Client >> Server
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log((new Date()) + ' Received Message from : ' + message.utf8Data);

            //mysql query test
            var query = sqlConnection.query("insert into user_list(usn, nickname, tot_point) values(?, ?, ?)", ['0002', 'LovelyHyun', '100'], function () {
                console.log(query.sql);
            });

            sqlConnection.query('select * from user_list', function (err, rows, cols) {
                if (err) throw err;

                console.log(rows);

            });

            // Server >> Clients
            wsServer.broadcastUTF("{\"flag\":3, \"Games\":[{\"game_id\":\"1234\"},{\"game_id\":\"1235\"}]}");
        }
    });


    
});

sqlConnection.end();