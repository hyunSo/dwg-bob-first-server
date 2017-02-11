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
    host: 'aasub3hy4p0s9l.crwpu2cl615x.ap-northeast-2.rds.amazonaws.com',
    user: 'bobfirst',
    password: 'bobfirst1',    
    database: 'TreasureHunt'
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
    REQUEST_USER_POSSIBLE_GAME_LIST: 7,

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
                    
                    case Flag.REQUEST_USER_INFO:
                        var nickname = json['nickname'];
                        var sql = `select usn, tot_point from user_list where nickname = '${nickname}'`;

                        requestUserInfo(flag, sql);                        
                        break;
                    case Flag.REQUEST_USER_TREASURE_LIST:
                        var usn = json['usn'];
                        var sql = `select * from user_treasure natural join treasure_list where usn = ${usn}`;

                        requestUserInfo(flag, sql);                        
                        break;
                    case Flag.REQUEST_USER_MADE_GAME:
                        var usn = json['usn'];                        
                        var sql = `select * from user_made_game natural join game_list where usn = ${usn}`;
                        
                        requestUserInfo(flag, sql);
                        break;
                    case Flag.REQUEST_USER_PARTICIPATING_GAME_LIST:
                        var usn = json['usn'];
                        var sql = `select T.game_id, U.point, game_name, treasure_count, status, participant, 
                                   treasure_id, treasure_name, description, location, T.point as treasure_point, catchgame_cat 
                                   from user_joined_game U natural join game_list G, treasure_list T 
                                   where U.usn = 1 and G.status = 1 and G.game_id = T.game_id`;

                        requestGameInfo(flag, sql);
                        break;
                    case Flag.REQUEST_USER_POSSIBLE_GAME_LIST:
                        var usn = json['usn'];
                        var sql = `select game_id, game_name, treasure_count, status, participant, treasure_id, 
                                   treasure_name, description, location, point as treasure_point, catchgame_cat 
                                   from game_list natural join treasure_list
                                   where game_id not in (select game_id from user_joined_game where usn = ${usn})						
                                   and status = 1`;
                        
                        requestGameInfo(flag, sql);
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
                        var sql = `insert into user_joined_game(usn, game_id, point) 
                                   values (${usn}, ${game_id}, 0)`;
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
                console.log(`Wrong data type at flag: ${flag}.`);
                wsServer.broadcastUTF(`Wrong data type at flag: ${flag}.`);
            }                     
        }
    });
});
// for case -> REQUEST_USER_TREASURE_LIST: 1,REQUEST_USER_MADE_GAME: 2, REQUEST_USER_INFO: 6
function requestUserInfo(flag, sql) {
    sqlConnection.query(sql, function (err, rows, cols) {
        if (err) {
            console.log(err);
            console.log(`Wrong Parameter at flag: ${flag}.`);
            wsServer.broadcastUTF(`Wrong Parameter at flag: ${flag}.`);
        } else {
            var obj = new Object();
            obj['flag'] = flag;
            obj['user_info'] = rows;
            console.log(JSON.stringify(obj));
            wsServer.broadcastUTF(JSON.stringify(obj));
        }

    });
};
// for case -> REQUEST_USER_PARTICIPATING_GAME_LIST: 3, REQUEST_USER_POSSIBLE_GAME_LIST: 7
function requestGameInfo(flag, sql) {
    sqlConnection.query(sql, function (err, rows, cols) {
        if (err) {
            console.log(`Wrong Parameter at flag: ${flag}.`);
            wsServer.broadcastUTF(`Wrong Parameter at flag: ${flag}.`);
        } else {
            var obj = new Object();
            var games = {};

            for (i = 0; i < rows.length; i++) {
                // Get the correct game object.
                var game = createGame(games, rows[i], flag);
                var treasure = createTreasure(rows[i]);

                game['treasures'].push(treasure); // Add latest treasure to end of treasures list.

            }
            var games_array = Object.keys(games).map(function (key) {
                return games[key];
            });// Convert map to array.

            obj['flag'] = flag;
            obj['user_game_list'] = games_array;

            console.log(JSON.stringify(obj));
            wsServer.broadcastUTF(JSON.stringify(obj));
        }
    });        
};
function createGame(games, row, flag) {    
    if (games[row.game_id] == undefined) {// if row.game_id not in games

        game = new Object();
        game['game_id'] = row.game_id;
        game['game_name'] = row.game_name;
        game['treasure_count'] = row.treasure_count;
        game['status'] = row.status;
        game['participant'] = row.participant;
        
        if (flag == Flag.REQUEST_USER_PARTICIPATING_GAME_LIST) {// Because only this flag has 'point' attribute.
            game['point'] = row.point;
        }
        game['treasures'] = [];
        games[row.game_id] = game;
        
    }
    
    return games[row.game_id];
};
function createTreasure(row) {  
    var treasure = new Object();

    treasure['treasure_id'] = row.treasure_id;
    treasure['treasure_name'] = row.treasure_name;
    treasure['description'] = row.description;
    treasure['location'] = row.location;
    treasure['treasure_point'] = row.treasure_point;
    treasure['catchgame_cat'] = row.catchgame_cat;
   
    return treasure;
};

