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
    SET_GAME_INFO_GAMELIST: 12,
    SET_GAME_INFO_TREASURELIST: 13,
    SET_GAME_STATUS_END: 14,
    SET_USER_JOIN_GAMELIST: 15,
    SET_USER_JOIN_JOINEDLIST: 16,
    SET_USER_GET_TREASURE: 17,
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
                    case Flag.SET_USER_INFO:
                        var nickname = json['nickname'];
                        var sql = `insert into user_list(nickname, tot_point) values ('${nickname}', 0)`;
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                obj = new Object();
                                obj['flag'] = Flag.SET_USER_INFO;
                                obj['message'] = 'BadRequest';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            } else {
                                obj = new Object();
                                obj['flag'] = Flag.SET_USER_INFO;
                                obj['message'] = 'Success';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }
                        });
                        break;

                    case Flag.SET_GAME_INFO_GAMELIST:
                        var game_name = json['game_name'];
                        var treasure_count = json['treasure_count'];
                        var maker_id = json['maker_id'];
                        var sql = `insert into game_list(game_name, treasure_count, maker_id, status, participant)
                                    values ('${game_name}', ${treasure_count}, ${maker_id}, 1, 0)`;
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                obj = new Object();
                                obj['flag'] = Flag.SET_GAME_INFO_GAMELIST;
                                obj['message'] = 'BadRequest';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            } else {
                                obj = new Object();
                                obj['flag'] = Flag.SET_GAME_INFO_GAMELIST;
                                obj['message'] = 'Success';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }
                        });
                        break;

                    case Flag.SET_GAME_INFO_TREASURELIST:
                        var treasure_name = json['treasure_name'];
                        var description = json['description'];
                        var game_id = json['game_id'];
                        var location = json['location'];
                        var point = json['point'];
                        var catchgame_cat = json['catchgame_cat'];
                        var sql = `insert into treasure_list(treasure_name, description, game_id, location, point, catchgame_cat)
                                    values ('${treasure_name}', '${description}', ${game_id}, '${location}', ${point}, ${catchgame_cat})`;
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                obj = new Object();
                                obj['flag'] = Flag.SET_GAME_INFO_TREASURELIST;
                                obj['message'] = 'BadRequest';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            } else {
                                obj = new Object();
                                obj['flag'] = Flag.SET_GAME_INFO_TREASURELIST;
                                obj['message'] = 'Success';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }
                        });
                        break;

                    case Flag.SET_GAME_STATUS_END:
                        var game_id = json['game_id'];
                        var sql = `update game_list set status = 2 where participant = 0 and game_id = ${game_id}`;
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                obj = new Object();
                                obj['flag'] = Flag.SET_GAME_STATUS_END;
                                obj['message'] = 'BadRequest';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            } else if (rows.affectedRows == 1) {
                                obj = new Object();
                                obj['flag'] = Flag.SET_GAME_STATUS_END;
                                obj['message'] = 'Success';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            } else if (rows.affectedRows == 0) {
                                obj = new Object();
                                obj['flag'] = Flag.SET_GAME_STATUS_END;
                                obj['message'] = 'UserExists';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }
                        });
                        break;

                    case Flag.SET_USER_JOIN_GAMELIST:
                        var game_id = json['game_id'];
                        var sql = `update game_list set participant = participant +1 where game_id = ${game_id}`;
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                obj = new Object();
                                obj['flag'] = Flag.SET_USER_JOIN_GAMELIST;
                                obj['message'] = 'BadRequest';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            } else {
                                obj = new Object();
                                obj['flag'] = Flag.SET_USER_JOIN_GAMELIST;
                                obj['message'] = 'Success';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }
                        });
                        break;

                    case Flag.SET_USER_JOIN_JOINEDLIST:
                        var usn = json['usn'];
                        var game_id = json['game_id'];
                        var sql = `insert into user_joined_game(usn, game_id, point) values (${usn}, ${game_id}, 0)`;
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                obj = new Object();
                                obj['flag'] = Flag.SET_USER_JOIN_JOINEDLIST;
                                obj['message'] = 'BadRequest';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            } else {
                                obj = new Object();
                                obj['flag'] = Flag.SET_USER_JOIN_JOINEDLIST;
                                obj['message'] = 'Success';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }
                        });
                        break;

                    case Flag.SET_USER_GET_TREASURE:
                        var usn = json['usn'];
                        var treasure_id = json['treasure_id'];
                        var sql = `insert into user_treasure(usn, treasure_id, used) values (${usn}, ${treasure_id}, 0)`;
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                obj = new Object();
                                obj['flag'] = Flag.SET_USER_GET_TREASURE;
                                obj['message'] = 'BadRequest';
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            } else {
                                obj = new Object();
                                obj['flag'] = Flag.SET_USER_GET_TREASURE;
                                obj['message'] = 'Success';
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

