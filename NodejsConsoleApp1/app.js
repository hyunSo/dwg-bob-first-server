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
                        
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                console.log(`Wrong Parameter at flag: ${flag}.`);
                                wsServer.broadcastUTF(`Wrong Parameter at flag: ${flag}.`);
                            } else {
                                obj = new Object();
                                obj['flag'] = Flag.REQUEST_USER_INFO;
                                obj['user_info'] = rows;
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }

                        });
                        break;
                    case Flag.REQUEST_USER_TREASURE_LIST: 
                        var usn = json['usn'];
                        var sql = `select * from user_treasure natural join treasure_list where usn = ${usn}`;

                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                console.log(`Wrong Parameter at flag: ${flag}.`);
                                wsServer.broadcastUTF(`Wrong Parameter at flag: ${flag}.`);
                            } else {
                                obj = new Object();
                                obj['flag'] = Flag.REQUEST_USER_TREASURE_LIST;
                                obj['user_treasure_list'] = rows;
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }

                        });
                        break;
                    case Flag.REQUEST_USER_MADE_GAME:
                        var usn = json['usn'];                        
                        var sql = `select * from user_made_game natural join game_list where usn = ${usn}`;
                        
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                console.log(`Wrong Parameter at flag: ${flag}.`);
                                wsServer.broadcastUTF(`Wrong Parameter at flag: ${flag}.`);
                            } else {
                                obj = new Object();
                                obj['flag'] = Flag.REQUEST_USER_MADE_GAME;
                                obj['user_made_game'] = rows;
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }

                        });
                        break;
                    case Flag.REQUEST_USER_PARTICIPATING_GAME_LIST:
                        var usn = json['usn'];
                        var sql = `select T.game_id, U.point, game_name, treasure_count, status, participant, 
                                   treasure_id, treasure_name, description, location, T.point as treasure_point, catchgame_cat 
                                   from user_joined_game U natural join game_list G, treasure_list T 
                                   where U.usn = 1 and G.status = 1 and G.game_id = T.game_id`;
                        
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                console.log(`Wrong Parameter at flag: ${flag}.`);
                                wsServer.broadcastUTF(`Wrong Parameter at flag: ${flag}.`);
                            } else {
                                obj = new Object();                                
                                games = [];
                                treasures = [];
                                game = new Object();

                                // Make json not to be redundant.(Because one game can have many treasures.)                                                      
                                for (var i = 0; i < rows.length-1; i++){
                                    treasure = new Object();

                                    treasure['treasure_id'] = rows[i].treasure_id;
                                    treasure['treasure_name'] = rows[i].treasure_name;
                                    treasure['description'] = rows[i].description;
                                    treasure['location'] = rows[i].location;
                                    treasure['treasure_point'] = rows[i].treasure_point;
                                    treasure['catchgame_cat'] = rows[i].catchgame_cat;

                                    treasures.push(treasure);
                                                                        
                                    if (rows[i].game_id != rows[i+1].game_id) {
                                        game['game_id'] = rows[i].game_id;
                                        game['game_name'] = rows[i].game_name;
                                        game['treasure_count'] = rows[i].treasure_count;
                                        game['status'] = rows[i].status;
                                        game['participant'] = rows[i].participant;
                                        game['point'] = rows[i].point;
                                        game['treasures'] = treasures;
                                        games.push(game);

                                        game = new Object();
                                        treasures = [];                                

                                    }                                   

                                }
                                // Push the last index.
                                treasure = new Object();

                                treasure['treasure_id'] = rows[rows.length - 1].treasure_id;
                                treasure['treasure_name'] = rows[rows.length - 1].treasure_name;
                                treasure['description'] = rows[rows.length - 1].description;
                                treasure['location'] = rows[rows.length - 1].location;
                                treasure['treasure_point'] = rows[rows.length - 1].treasure_point;
                                treasure['catchgame_cat'] = rows[rows.length - 1].catchgame_cat;

                                treasures.push(treasure);

                                game['game_id'] = rows[rows.length - 1].game_id;
                                game['game_name'] = rows[rows.length - 1].game_name;
                                game['treasure_count'] = rows[rows.length - 1].treasure_count;
                                game['status'] = rows[rows.length - 1].status;
                                game['participant'] = rows[rows.length - 1].participant;
                                game['point'] = rows[rows.length - 1].point;
                                game['treasures'] = treasures;
                                games.push(game);
                               
                                obj['flag'] = Flag.REQUEST_USER_PARTICIPATING_GAME_LIST;
                                obj['user_participating_game_list'] = games;
                                                                                           
                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }

                        });
                        break;
                    case Flag.REQUEST_USER_POSSIBLE_GAME_LIST:
                        var usn = json['usn'];
                        var sql = `select game_id, game_name, treasure_count, status, participant, treasure_id, 
                                   treasure_name, description, location, point, catchgame_cat 
                                   from game_list natural join treasure_list
                                   where game_id not in (select game_id from user_joined_game where usn = ${usn})						
                                   and status = 1`;
                        
                        sqlConnection.query(sql, function (err, rows, cols) {
                            if (err) {
                                console.log(`Wrong Parameter at flag: ${flag}.`);
                                wsServer.broadcastUTF(`Wrong Parameter at flag: ${flag}.`);
                            } else {
                                obj = new Object();
                                games = [];
                                treasures = [];
                                game = new Object();

                                // Make json not to be redundant.(Because one game can have many treasures.)                                                      
                                for (var i = 0; i < rows.length - 1; i++) {
                                    treasure = new Object();

                                    treasure['treasure_id'] = rows[i].treasure_id;
                                    treasure['treasure_name'] = rows[i].treasure_name;
                                    treasure['description'] = rows[i].description;
                                    treasure['location'] = rows[i].location;
                                    treasure['point'] = rows[i].point;
                                    treasure['catchgame_cat'] = rows[i].catchgame_cat;

                                    treasures.push(treasure);

                                    if (rows[i].game_id != rows[i + 1].game_id) {
                                        game['game_id'] = rows[i].game_id;
                                        game['game_name'] = rows[i].game_name;
                                        game['treasure_count'] = rows[i].treasure_count;
                                        game['status'] = rows[i].status;
                                        game['participant'] = rows[i].participant;                                        
                                        game['treasures'] = treasures;
                                        games.push(game);

                                        game = new Object();
                                        treasures = [];

                                    }

                                }
                                // Push the last index.
                                treasure = new Object();

                                treasure['treasure_id'] = rows[rows.length - 1].treasure_id;
                                treasure['treasure_name'] = rows[rows.length - 1].treasure_name;
                                treasure['description'] = rows[rows.length - 1].description;
                                treasure['location'] = rows[rows.length - 1].location;
                                treasure['point'] = rows[rows.length - 1].point;
                                treasure['catchgame_cat'] = rows[rows.length - 1].catchgame_cat;

                                treasures.push(treasure);

                                game['game_id'] = rows[rows.length - 1].game_id;
                                game['game_name'] = rows[rows.length - 1].game_name;
                                game['treasure_count'] = rows[rows.length - 1].treasure_count;
                                game['status'] = rows[rows.length - 1].status;
                                game['participant'] = rows[rows.length - 1].participant;                               
                                game['treasures'] = treasures;
                                games.push(game);

                                obj['flag'] = Flag.REQUEST_USER_POSSIBLE_GAME_LIST;
                                obj['user_possible_game_list'] = games;

                                console.log(JSON.stringify(obj));
                                wsServer.broadcastUTF(JSON.stringify(obj));
                            }

                        });
                        break;

                        // TODO: Code set flags.
                }
            } catch (exc) {
                console.log(`Wrong data type at flag: ${flag}.`);
                wsServer.broadcastUTF(`Wrong data type at flag: ${flag}.`);
            }                     
        }
    });
});

