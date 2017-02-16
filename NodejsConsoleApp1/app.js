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
    SET_GAME_STATUS_END: 14,
    SET_USER_JOIN_GAME: 15,
    SET_USER_EXIT_GAME: 16,
    SET_USER_GET_TREASURE: 19,
    SET_USER_USE_TREASURE: 20,
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
                                   treasure_id, treasure_name, description, location, T.point as treasure_point, catchgame_cat, target_img_name 
                                   from user_joined_game U natural join game_list G, treasure_list T 
                                   where U.usn = 1 and G.status = 1 and G.game_id = T.game_id`;

                        requestGameInfo(flag, sql);
                        break;
                    case Flag.REQUEST_USER_POSSIBLE_GAME_LIST:
                        var usn = json['usn'];
                        var sql = `select game_id, game_name, treasure_count, status, participant, treasure_id, 
                                   treasure_name, description, location, point as treasure_point, catchgame_cat, target_img_name
                                   from game_list natural join treasure_list
                                   where game_id not in (select game_id from user_joined_game where usn = ${usn})						
                                   and status = 1`;

                        requestGameInfo(flag, sql);
                        break;

                    case Flag.SET_USER_INFO:
                        var nickname = json['nickname'];
                        var sql = `insert into user_list(nickname, tot_point) 
                                   select * from (select '${nickname}', 0) as tmp
                                   where not exists (select * from user_list
                                                     where nickname = '${nickname}')`;

                        updateDatabaseWithCondition(flag, sql, null, 'UserExists');
                        break;
                    
                    case Flag.SET_GAME_INFO:
                        initGame(flag, json);
                        break;

                    case Flag.SET_GAME_STATUS_END:
                        var game_id = json['game_id'];
                        var sql = `update game_list set status = 2 
                                   where participant = 0 and game_id = ${game_id}`;

                        updateDatabaseWithCondition(flag, sql, null, 'UserExists');
                        break;

                    case Flag.SET_USER_JOIN_GAME:
                        var usn = json['usn'];
                        var game_id = json['game_id'];
                        var sqlInsert = `insert into user_joined_game(usn, game_id, point)
                                         select * from (select ${usn}, ${game_id}, 0) as tmp
                                         where not exists (select * from user_joined_game
                                                           where usn = ${usn} and 
                                                                 game_id = ${game_id})`;
                        var sqlUpdate = `update game_list set participant = participant +1
                                         where game_id = ${game_id}`;

                        updateDatabaseWithCondition(flag, sqlInsert, sqlUpdate, 'UserExists');
                        break;

                    case Flag.SET_USER_EXIT_GAME:
                        var usn = json['usn'];
                        var game_id = json['game_id'];
                        var sqlInsert = `delete from user_joined_game 
                                         where usn = ${usn} and game_id = ${game_id}`;
                        var sqlUpdate = `update game_list set participant = participant -1 
                                         where game_id = ${game_id}`;

                        updateDatabaseWithCondition(flag, sqlInsert, sqlUpdate, 'UserDoesNotExist');
                        break;

                    case Flag.SET_USER_GET_TREASURE:
                        var usn = json['usn'];
                        var treasure_id = json['treasure_id'];
                        var point = json['point'];
                        var sqlInsert = `insert into user_treasure(usn, treasure_id, used)
                                         select * from (select ${usn}, ${treasure_id}, 0) as tmp
                                         where not exists (select * from user_treasure
                                                           where usn = ${usn} and 
                                                                 treasure_id = ${treasure_id})`;
                        var sqlUpdate = `update user_list set tot_point = tot_point +${point} 
                                         where usn = ${usn}`;

                        updateDatabaseWithCondition(flag, sqlInsert, sqlUpdate, 'TreasureExists');
                        break;

                    case Flag.SET_USER_USE_TREASURE:
                        var usn = json['usn'];
                        var treasure_id = json['treasure_id'];
                        var sql = `update user_treasure set used = 1 
                                   where usn = ${usn} and and treasure_id = ${treasure_id}`;

                        updateDatabase(flag, sql);
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

            switch (flag) {
                case Flag.REQUEST_USER_PARTICIPATING_GAME_LIST:
                    doCreateGames(games, rows, populateGameWithPoint);
                    break;
                case Flag.REQUEST_USER_POSSIBLE_GAME_LIST:
                    doCreateGames(games, rows, populateGame);
                    break;
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
// Do createGame with the correct function.
function doCreateGames(games, rows, populateGameFunc) {
    for (i = 0; i < rows.length; i++) {
        // Get the correct game object.
        var game = createGame(games, rows[i], populateGameFunc);
        var treasure = createTreasure(rows[i]);

        game['treasures'].push(treasure); // Add latest treasure to end of treasures list.
    }
};
function createGame(games, row, populateGameFunc) {
    if (games[row.game_id] == undefined) {// if row.game_id not in games
        game = new Object();
        populateGameFunc(game, row);
        games[row.game_id] = game;
    }
    return games[row.game_id];
};
// general case
function populateGame(game, row) {
    game['game_id'] = row.game_id;
    game['game_name'] = row.game_name;
    game['treasure_count'] = row.treasure_count;
    game['status'] = row.status;
    game['participant'] = row.participant;
    game['treasures'] = [];
};
// for Flag.REQUEST_USER_PARTICIPATING_GAME_LIST, populate the game with 'point' attribute.
function populateGameWithPoint(game, row) {
    populateGame(game, row);
    game['point'] = row.point;
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

/**
 * Insert game and treasures into the database.
 * @param {number} flag A flag to notify what request occurred if an error occurs.
 * @param {any} json JSON data.
 */
function initGame(flag, json) {
    var game_name = json['game_name'];
    var treasure_count = json['treasure_count'];
    var maker_id = json['maker_id'];
    var updateQuery = `insert into game_list(game_name, treasure_count, maker_id, status, participant)
                       values ('${game_name}', ${treasure_count}, ${maker_id}, 1, 0)`;
    var game_id = 0;
    sqlConnection.query(updateQuery, function (err, rows, cols) {
        if (err) {
            console.log(err);
            console.log(`Wrong Parameter at flag: ${flag}.`);
            wsServer.broadcastUTF(`Wrong Parameter at flag: ${flag}.`);
        } else {
            game_id = rows.insertId;
            var treasures = json['Treasures'];
            for (j = 0; j < treasure_count; j++) {
                var treasure_name = treasures[j]['treasure_name'];
                var description = treasures[j]['description'];
                var location = treasures[j]['location'];
                var point = treasures[j]['point'];
                var catchgame_cat = treasures[j]['catchgame_cat'];
                var target_img_name = treasures[j]['target_img_name'];
                var sql = `insert into treasure_list(treasure_name, description, game_id, 
                           location, point, catchgame_cat, target_img_name)
                           values ('${treasure_name}', '${description}', ${game_id}, 
                           '${location}', ${point}, ${catchgame_cat}, ${target_img_name})`;

                updateDatabase(flag, sql);
            }
        }
    });
}

/**
 * Execute sql query requiring simple result(success or fail).
 * @param {number} flag A flag to notify what request occurred if an error occurs.
 * @param {string} sql  An sql query to execute.
 */
function updateDatabase(flag, sql) {
    sqlConnection.query(sql, function (err, rows, cols) {
        if (err) {
            console.log(err);
            console.log(`Wrong Parameter at flag: ${flag}.`);
            wsServer.broadcastUTF(`Wrong Parameter at flag: ${flag}.`);
        } else {
            obj = new Object();
            obj['flag'] = flag;
            obj['message'] = 'Success';
            console.log(JSON.stringify(obj));
//            wsServer.broadcastUTF(JSON.stringify(obj));
        }
    });
};

/**
 * Execute sql queries that requre different execution depending on the first query's result.
 * If the first query does not affect a single row or more than a single row, then send failMessage.
 * Instead, if affected any single row, then execute the second sql query or returns success message.
 * @param {number} flag            A flag to notify what request occurred if an error occurs.
 * @param {string} updateQuery     An sql query to execute at the first time.
 * @param {string} postUpdateQuery An sql query to execute after the first query
                                   when the first query affects a row.
                                   If null, send simple result(success or failMessage).
 * @param {string} failMessage     A message if the first sql query did not affect any rows.
 */
function updateDatabaseWithCondition(flag, updateQuery, postUpdateQuery, failMessage) {
    sqlConnection.query(updateQuery, function (err, rows, cols) {
        if (err) {
            console.log(err);
            console.log(`Wrong Parameter at flag: ${flag}.`);
            wsServer.broadcastUTF(`Wrong Parameter at flag: ${flag}.`);
        } else if (rows.affectedRows == 1) {
            if (postUpdateQuery == null) { // if there is no need to execute extra query.
                obj = new Object();
                obj['flag'] = flag;
                obj['message'] = 'Success';
                console.log(JSON.stringify(obj));
//                wsServer.broadcastUTF(JSON.stringify(obj));
            }
            else { // if there is extra query to execute regard to the result of the first query.
                updateDatabase(flag, postUpdateQuery);
            }
        } else { // if the first query does not affect any row or more than a row, send failMessage.
            obj = new Object();
            obj['flag'] = flag;
            obj['message'] = failMessage;
            console.log(JSON.stringify(obj));
            wsServer.broadcastUTF(JSON.stringify(obj));
        }
    });
};