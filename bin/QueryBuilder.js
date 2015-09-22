/**
 * data2model
 * Author: michael
 * Date: 06.09.15.
 * License: MIT
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _dotenv = require('dotenv');

var _dotenv2 = _interopRequireDefault(_dotenv);

var _mysql = require('mysql');

var _mysql2 = _interopRequireDefault(_mysql);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _deepLogger = require('deep-logger');

var _deepLogger2 = _interopRequireDefault(_deepLogger);

var _repeatString = require('repeat-string');

var _repeatString2 = _interopRequireDefault(_repeatString);

_dotenv2['default'].load();

var pool = _mysql2['default'].createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 50,
    queueLimit: 100,
    multipleStatements: true,
    flags: ['LOCAL_FILES'],
    charset: 'utf8_unicode_ci'
});

var log = _deepLogger2['default'].deepLogger;

function QueryError(message) {
    this.message = message;
    this.name = "QueryError";
    Error.captureStackTrace(this, QueryError);
}
QueryError.prototype = Object.create(Error.prototype);
QueryError.prototype.constructor = QueryError;

function CheckFunctionFailedError(message) {
    this.message = message;
    this.name = "CheckFunctionFailedError";
    Error.captureStackTrace(this, CheckFunctionFailedError);
}
CheckFunctionFailedError.prototype = Object.create(Error.prototype);
CheckFunctionFailedError.prototype.constructor = CheckFunctionFailedError;

_bluebird2['default'].promisifyAll(_mysql2['default']);
_bluebird2['default'].promisifyAll(require("mysql/lib/Connection").prototype);
_bluebird2['default'].promisifyAll(require("mysql/lib/Pool").prototype);
String.prototype.ucFirst = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

var Connection = (function () {
    function Connection(database) {
        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        _classCallCheck(this, Connection);

        this.database = database;
        this.options = Object.assign({
            shouldQueryNow: false
        }, options);
        this.operators = {};
    }

    _createClass(Connection, [{
        key: 'getConnection',
        value: function getConnection() {
            var _this = this;

            return pool.getConnectionAsync().then(function (connection) {
                return connection;
            }).then(function (con) {
                con.changeUser({
                    database: _this.database
                });
                return con;
            });
        }
    }, {
        key: 'query',
        value: function query(_query) {
            log(_query);

            return this.getConnection().then(function (con) {
                return con.queryAsync(_query).spread(function (res, table) {
                    con.release();
                    return res;
                })['catch'](function (err) {
                    throw new QueryError(err.code);
                });
            });
        }
    }, {
        key: 'transactionQuery',
        value: function transactionQuery(query, runChecks) {
            var _this2 = this;

            var commiter = function commiter(con) {
                con.commit(function (err) {
                    if (err) {
                        con.rollback();
                    }
                });
                if (runChecks && runChecks.needTemporaryTable && runChecks.timing == 'functionsAfterParse') {
                    return con.query(_this2.drop('temp_' + runChecks.table), function (err, res) {});
                }
                con.release();
            };
            return this.getConnection().then(function (con) {
                return con.queryAsync('START TRANSACTION;' + query).spread(function (res, table) {
                    if (typeof runChecks == 'object' && runChecks.runChecks) {
                        _this2[runChecks.runChecks]('temp_' + runChecks.table, runChecks.table).then(function (val) {
                            if (!val) {
                                throw new CheckFunctionFailedError();
                            }
                            commiter(con);
                        })['catch'](CheckFunctionFailedError, function () {
                            con.query(_this2.rollback(runChecks.savePoint), function (err, res) {
                                con.query(_this2.drop('temp_' + runChecks.table), function (err, res) {});
                            });
                            con.release();
                        })['catch'](function (err) {
                            return log(err);
                        });
                    } else {
                        commiter(con);
                    }
                })['catch'](function (err) {
                    con.rollback(function () {
                        throw new QueryError(err);
                    });
                });
            })['catch'](function (err) {
                return log(err);
            });
        }
    }, {
        key: 'shouldQueryNow',
        value: function shouldQueryNow(query) {
            if (this.options.shouldQueryNow) {
                return this.query(query);
            }
            return query;
        }
    }, {
        key: 'showColumns',
        value: function showColumns(table) {
            return this.shouldQueryNow(_mysql2['default'].format('SHOW COLUMNS FROM ??;', [table]));
        }
    }, {
        key: 'showTables',
        value: function showTables() {
            return this.shouldQueryNow(_mysql2['default'].format('SHOW TABLES FROM ??;', [this.database]));
        }
    }, {
        key: 'truncate',
        value: function truncate(table) {
            return this.shouldQueryNow(_mysql2['default'].format('TRUNCATE ??', [table]));
        }
    }, {
        key: 'drop',
        value: function drop(table) {
            return this.shouldQueryNow(_mysql2['default'].format('DROP TABLE IF EXISTS ??', [table]));
        }
    }, {
        key: 'rollback',
        value: function rollback(to) {
            return 'ROLLBACK ' + (to ? 'TO ' + to : '');
        }
    }, {
        key: 'select',
        value: function select(table, options) {
            var _this3 = this;

            var statement = 'SELECT ';
            if (options instanceof Map && options.has('select')) {
                statement += (0, _repeatString2['default'])('??,', Array.from(options.get('select')).length).replace(/(,)$/, '') + ' FROM ?? ';
            } else {
                statement += '*  FROM ?? ';
            }
            return this.statementBase(table, options, statement).then(function (val) {
                return _this3.shouldQueryNow(val);
            });
        }
    }, {
        key: 'update',
        value: function update(table, options) {
            var _this4 = this;

            var statement = 'UPDATE ?? SET ';
            statement += (0, _repeatString2['default'])(' ?? = ?,', options.get('update').size).replace(/(,)$/, ' ');

            return this.statementBase(table, options, statement).then(function (val) {

                return _this4.shouldQueryNow(val);
            });
        }
    }, {
        key: 'createTable',
        value: function createTable(table, fieldsOrLike) {
            var _this5 = this;

            var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

            options = Object.assign({
                checkIfExists: true,
                addTimestamps: true,
                type: 'innodb'
            }, options);

            return _bluebird2['default'].resolve('CREATE TABLE ' + (options.checkIfExists ? 'IF NOT EXISTS' : '') + ' ?? ' + (typeof fieldsOrLike == 'string' ? 'LIKE ' + '??' : '(')).then(function (query) {
                var params = [];
                if (typeof fieldsOrLike == "string") {
                    params.push(table, fieldsOrLike);
                } else {
                    params.push(table);
                }
                if (typeof fieldsOrLike != 'string') {
                    query += '`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,';
                    if (options.addTimestamps) {
                        query += '`created_at` TIMESTAMP DEFAULT NOW(),';
                        query += '`updated_at` TIMESTAMP,';
                    }
                    var _iteratorNormalCompletion = true;
                    var _didIteratorError = false;
                    var _iteratorError = undefined;

                    try {
                        for (var _iterator = fieldsOrLike.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                            var _step$value = _slicedToArray(_step.value, 2);

                            var key = _step$value[0];
                            var val = _step$value[1];

                            query += '?? ' + val + ',';
                            params.push(key);
                        }
                    } catch (err) {
                        _didIteratorError = true;
                        _iteratorError = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion && _iterator['return']) {
                                _iterator['return']();
                            }
                        } finally {
                            if (_didIteratorError) {
                                throw _iteratorError;
                            }
                        }
                    }
                }
                return [query.replace(/(,)$/, '') + (typeof fieldsOrLike == 'string' ? '' : ') ENGINE = ' + options.type.toUpperCase()), params];
            }).spread(function (query, params) {

                return _this5.shouldQueryNow(_mysql2['default'].format(query, params));
            });
        }
    }, {
        key: 'createTableIfNotExists',
        value: function createTableIfNotExists(table, fieldsOrLike) {
            var options = arguments.length <= 2 || arguments[2] === undefined ? { checkIfExists: true } : arguments[2];

            return this.createTable(table, fieldsOrLike, options);
        }
    }, {
        key: 'copyTableData',
        value: function copyTableData(from, to, fields) {
            var _this6 = this;

            var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

            options = Object.assign({
                onDuplicateKeyUpdate: []
            }, options);

            return _bluebird2['default'].resolve('INSERT INTO ?? (`created_at`, `updated_at`, ' + (0, _repeatString2['default'])('??,', Array.from(fields.keys()).length).replace(/(,)$/, '') + ') SELECT NOW(), NOW(), ' + (0, _repeatString2['default'])('??,', Array.from(fields.keys()).length).replace(/(,)$/, '') + ' FROM ?? ' + (options.onDuplicateKeyUpdate ? 'ON DUPLICATE KEY UPDATE \`updated_at\` = NOW()' : '')).then(function (query) {
                var params = [to];
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = fields.keys()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var key = _step2.value;

                        params.push(key);
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                            _iterator2['return']();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }

                var _iteratorNormalCompletion3 = true;
                var _didIteratorError3 = false;
                var _iteratorError3 = undefined;

                try {
                    for (var _iterator3 = fields.values()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                        var value = _step3.value;

                        params.push(value);
                    }
                } catch (err) {
                    _didIteratorError3 = true;
                    _iteratorError3 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion3 && _iterator3['return']) {
                            _iterator3['return']();
                        }
                    } finally {
                        if (_didIteratorError3) {
                            throw _iteratorError3;
                        }
                    }
                }

                params.push(from);
                return [query, params];
            }).spread(function (query, params) {
                if (options.onDuplicateKeyUpdate && options.onDuplicateKeyUpdate.length == 0) {
                    var _iteratorNormalCompletion4 = true;
                    var _didIteratorError4 = false;
                    var _iteratorError4 = undefined;

                    try {
                        for (var _iterator4 = fields.keys()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                            var key = _step4.value;

                            query += ',??=VALUES(??)';
                            params.push(key, key);
                        }
                    } catch (err) {
                        _didIteratorError4 = true;
                        _iteratorError4 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion4 && _iterator4['return']) {
                                _iterator4['return']();
                            }
                        } finally {
                            if (_didIteratorError4) {
                                throw _iteratorError4;
                            }
                        }
                    }
                }
                if (options.onDuplicateKeyUpdate && options.onDuplicateKeyUpdate.length > 0) {
                    options.onDuplicateKeyUpdate.forEach(function (val) {
                        query += ',??=VALUES(??)';
                        params.push(val, val);
                    });
                }
                return _this6.shouldQueryNow(_mysql2['default'].format(query, params));
            });
        }
    }, {
        key: 'createStatements',
        value: function createStatements(table, options, val) {
            var values = new Map();
            var baseArr = [table];
            if (options instanceof Map && options.has('select')) {
                Array.from(options.get('select')).forEach(function (data) {
                    return baseArr.unshift(data);
                });
                options['delete']('select');
            }
            if (options instanceof Map && options.has('update')) {
                var _iteratorNormalCompletion5 = true;
                var _didIteratorError5 = false;
                var _iteratorError5 = undefined;

                try {
                    for (var _iterator5 = options.get('update')[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                        var _step5$value = _slicedToArray(_step5.value, 2);

                        var k = _step5$value[0];
                        var v = _step5$value[1];

                        baseArr.push(k, v);
                    }
                } catch (err) {
                    _didIteratorError5 = true;
                    _iteratorError5 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion5 && _iterator5['return']) {
                            _iterator5['return']();
                        }
                    } finally {
                        if (_didIteratorError5) {
                            throw _iteratorError5;
                        }
                    }
                }

                options['delete']('update');
            }
            if (options instanceof Map && options.size > 0) {
                var _iteratorNormalCompletion6 = true;
                var _didIteratorError6 = false;
                var _iteratorError6 = undefined;

                try {
                    for (var _iterator6 = options.entries()[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                        var _step6$value = _slicedToArray(_step6.value, 2);

                        var key = _step6$value[0];
                        var value = _step6$value[1];

                        values.set(key, this['build' + key.ucFirst()](value));
                    }
                } catch (err) {
                    _didIteratorError6 = true;
                    _iteratorError6 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion6 && _iterator6['return']) {
                            _iterator6['return']();
                        }
                    } finally {
                        if (_didIteratorError6) {
                            throw _iteratorError6;
                        }
                    }
                }
            }
            return [val, values, baseArr];
        }
    }, {
        key: 'statementBase',
        value: function statementBase(table, options, statement) {
            var _this7 = this;

            return _bluebird2['default'].resolve(statement).then(function (val) {
                return _this7.createStatements(table, options, val);
            }).spread(function (statement, values, baseArr) {
                return _this7.buildWhereStatement(statement, baseArr, values);
            }).spread(function (statement, values) {
                return _mysql2['default'].format(statement, values).replace(/\s+/, ' ');
            });
        }
    }, {
        key: 'compareTableCount',
        value: function compareTableCount(table1, table2) {
            return this.query(_mysql2['default'].format('SELECT COUNT(a.id) as counter FROM ?? as a UNION ALL SELECT COUNT(b.id) as counter FROM ?? as b', [table1, table2])).spread(function (table1, table2) {
                log(table1.counter * 2 >= table2.counter);
                log(table1.counter);
                return table1.counter * 2 >= table2.counter;
            });
        }
    }, {
        key: 'rm',
        value: function rm(table, options) {
            var _this8 = this;

            var statement = 'DELETE FROM ?? ';
            return this.statementBase(table, options, statement).then(function (val) {
                return _this8.shouldQueryNow(val);
            });
        }
    }, {
        key: 'rmCompareNotIn',
        value: function rmCompareNotIn(deletionTable, compareTable, fieldsToCompare) {
            var _this9 = this;

            var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

            options = Object.assign({
                inOrNot: 'NOT IN'
            }, options);
            return _bluebird2['default'].resolve('DELETE FROM ?? WHERE ?? ' + options.inOrNot + ' (SELECT ?? FROM ??)').then(function (stmt) {
                var arr = [deletionTable, Array.from(fieldsToCompare.keys())[0], Array.from(fieldsToCompare.values())[0], compareTable];
                return _this9.shouldQueryNow(_mysql2['default'].format(stmt, arr));
            });
        }
    }, {
        key: 'buildWhereStatement',
        value: function buildWhereStatement() {
            for (var _len = arguments.length, val = Array(_len), _key = 0; _key < _len; _key++) {
                val[_key] = arguments[_key];
            }

            if (val[2].size > 0) {
                val[0] += 'WHERE 1=1';
                var _iteratorNormalCompletion7 = true;
                var _didIteratorError7 = false;
                var _iteratorError7 = undefined;

                try {
                    for (var _iterator7 = val[2][Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                        var _step7$value = _slicedToArray(_step7.value, 2);

                        var key = _step7$value[0];
                        var value = _step7$value[1];

                        val[0] += ~key.indexOf('or') ? ' OR ' + value[0] : ' AND ' + value[0];
                        value[1].forEach(function (d) {
                            val[1].push(d);
                        });
                    }
                } catch (err) {
                    _didIteratorError7 = true;
                    _iteratorError7 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion7 && _iterator7['return']) {
                            _iterator7['return']();
                        }
                    } finally {
                        if (_didIteratorError7) {
                            throw _iteratorError7;
                        }
                    }
                }
            }
            return [val[0].replace(/1=1 \w+/, ''), val[1]];
        }
    }, {
        key: 'buildOrWhereIn',
        value: function buildOrWhereIn(data) {
            var options = arguments.length <= 1 || arguments[1] === undefined ? { compare: 'or' } : arguments[1];

            return this.buildWhereIn(data, options);
        }
    }, {
        key: 'buildWhereNotIn',
        value: function buildWhereNotIn(data) {
            var options = arguments.length <= 1 || arguments[1] === undefined ? {
                compare: 'AND',
                inOrNot: 'NOT IN'
            } : arguments[1];

            return this.buildWhereIn(data, options);
        }
    }, {
        key: 'buildWhereIn',
        value: function buildWhereIn(data) {
            var options = arguments.length <= 1 || arguments[1] === undefined ? {
                compare: 'AND',
                inOrNot: 'IN'
            } : arguments[1];

            var arr = [];
            var stmt = ' ?? ' + options.inOrNot + ' (';
            var _iteratorNormalCompletion8 = true;
            var _didIteratorError8 = false;
            var _iteratorError8 = undefined;

            try {
                for (var _iterator8 = data.entries()[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                    var _step8$value = _slicedToArray(_step8.value, 2);

                    var key = _step8$value[0];
                    var value = _step8$value[1];

                    arr.push(key);
                    value.forEach(function (val) {
                        stmt += '?,';
                        arr.push(val);
                    });
                    stmt = stmt.replace(/,$/, ') ' + options.compare + ' ?? ' + options.inOrNot + ' (');
                }
            } catch (err) {
                _didIteratorError8 = true;
                _iteratorError8 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion8 && _iterator8['return']) {
                        _iterator8['return']();
                    }
                } finally {
                    if (_didIteratorError8) {
                        throw _iteratorError8;
                    }
                }
            }

            log(stmt);
            stmt = stmt.replace(/ (AND|IN) \?\? (IN|NOT IN) \($/ig, '');
            log(stmt);
            return [stmt, arr];
        }
    }, {
        key: 'buildOrWhere',
        value: function buildOrWhere(data) {
            var options = arguments.length <= 1 || arguments[1] === undefined ? {
                compareDeep: 'or',
                equality: '=',
                compare: 'or'
            } : arguments[1];

            return this.buildWhere(data, options);
        }
    }, {
        key: 'buildWhereNot',
        value: function buildWhereNot(data) {
            var options = arguments.length <= 1 || arguments[1] === undefined ? {
                compareDeep: 'or',
                equality: '!=',
                compare: 'and'
            } : arguments[1];

            return this.buildWhere(data, options);
        }
    }, {
        key: 'buildWhere',
        value: function buildWhere(data) {
            var options = arguments.length <= 1 || arguments[1] === undefined ? {
                compareDeep: 'or',
                equality: '=',
                compare: 'and'
            } : arguments[1];

            var values = new Map();
            var entries = [];
            var tmp = [];
            var compare = options.compareDeep;
            var i = 0;
            var _iteratorNormalCompletion9 = true;
            var _didIteratorError9 = false;
            var _iteratorError9 = undefined;

            try {
                var _loop = function () {
                    var _step9$value = _slicedToArray(_step9.value, 2);

                    var key = _step9$value[0];
                    var value = _step9$value[1];

                    if (value instanceof Array) {
                        entries.push('(' + value.map(function (val, i) {
                            tmp.push(key, val);
                            return ['??', options.equality, '?'].join(' ');
                        }).join(' ' + compare + ' ') + ')');
                    } else {
                        tmp.push(key, value);
                        entries.push(' ?? ' + options.equality + ' ? ');
                    }
                    i++;
                    if (i == data.size) {
                        values.set(entries.join(' ' + options.compare + ' '), tmp);
                    }
                };

                for (var _iterator9 = data.entries()[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                    _loop();
                }
            } catch (err) {
                _didIteratorError9 = true;
                _iteratorError9 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion9 && _iterator9['return']) {
                        _iterator9['return']();
                    }
                } finally {
                    if (_didIteratorError9) {
                        throw _iteratorError9;
                    }
                }
            }

            return [Array.from(values.keys()).join(' ' + options.compare + ' '), tmp];
        }
    }, {
        key: 'loadDataInfileString',
        value: function loadDataInfileString(file, table, cs, ss) {
            var _this10 = this;

            var options = arguments.length <= 4 || arguments[4] === undefined ? {} : arguments[4];

            options = Object.assign({}, options);
            return _bluebird2['default'].resolve('LOAD DATA LOCAL INFILE "' + file + '" INTO TABLE ' + table + ' CHARACTER SET ' + options.encoding + ' FIELDS TERMINATED BY \'' + options.delimiter + '\' ENCLOSED BY \'' + options.enclosedBy + '\' IGNORE 1 LINES (' + cs + ')' + (ss != '' ? ' SET ' + ss : '')).then(function (val) {
                return _this10.shouldQueryNow(val);
            });
        }
    }, {
        key: 'insert',
        value: function insert(table, fields) {
            var options = arguments.length <= 2 || arguments[2] === undefined ? { onDuplicateKeyUpdate: false } : arguments[2];

            return this.upsert(table, fields, options);
        }
    }, {
        key: 'upsert',
        value: function upsert(table, fields) {
            var _this11 = this;

            var options = arguments.length <= 2 || arguments[2] === undefined ? { onDuplicateKeyUpdate: [] } : arguments[2];

            var columnLength = Array.from(fields.get(0).values()).length,
                statement = 'INSERT INTO ' + table + ' (' + (0, _repeatString2['default'])('??,', columnLength).slice(0, -1) + ')';

            return _bluebird2['default'].resolve(statement).then(function (statement) {
                statement += ' VALUES (';
                for (var i = 1; i <= fields.size; i++) {
                    statement += '' + (0, _repeatString2['default'])('?,', columnLength).slice(0, -1);
                    statement += '' + (i == fields.size ? ')' : '),(');
                }
                return statement;
            }).then(function (statement) {
                if (options.onDuplicateKeyUpdate instanceof Array) {
                    statement = statement + ' ON DUPLICATE KEY UPDATE ' + (0, _repeatString2['default'])('??=VALUES(??),', options.onDuplicateKeyUpdate.length == 0 ? columnLength - 1 : options.onDuplicateKeyUpdate.length - 1).slice(0, -1);
                }
                return statement;
            }).then(function (statement) {
                return [statement, _this11.createValueArray(fields, { onDuplicateKeyUpdate: options.onDuplicateKeyUpdate })];
            }).spread(function (statement, values) {
                return _this11.shouldQueryNow(_mysql2['default'].format(statement, values));
            });
        }
    }, {
        key: 'createValueArray',
        value: function createValueArray(fields, options) {
            var valueArray = Array.from(fields.get(0).keys());
            var _iteratorNormalCompletion10 = true;
            var _didIteratorError10 = false;
            var _iteratorError10 = undefined;

            try {
                for (var _iterator10 = fields.values()[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                    var res = _step10.value;
                    var _iteratorNormalCompletion12 = true;
                    var _didIteratorError12 = false;
                    var _iteratorError12 = undefined;

                    try {
                        for (var _iterator12 = res.values()[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
                            var rows = _step12.value;

                            valueArray.push(rows);
                        }
                    } catch (err) {
                        _didIteratorError12 = true;
                        _iteratorError12 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion12 && _iterator12['return']) {
                                _iterator12['return']();
                            }
                        } finally {
                            if (_didIteratorError12) {
                                throw _iteratorError12;
                            }
                        }
                    }
                }
            } catch (err) {
                _didIteratorError10 = true;
                _iteratorError10 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion10 && _iterator10['return']) {
                        _iterator10['return']();
                    }
                } finally {
                    if (_didIteratorError10) {
                        throw _iteratorError10;
                    }
                }
            }

            if (options.onDuplicateKeyUpdate instanceof Array) {
                var filler = options.onDuplicateKeyUpdate.length == 0 ? Array.from(fields.get(0).keys()) : options.onDuplicateKeyUpdate;

                var _iteratorNormalCompletion11 = true;
                var _didIteratorError11 = false;
                var _iteratorError11 = undefined;

                try {
                    for (var _iterator11 = filler[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
                        var row = _step11.value;

                        for (var i = 0; i < 2; i++) {
                            if (row != 'created_at') valueArray.push(row);
                        }
                    }
                } catch (err) {
                    _didIteratorError11 = true;
                    _iteratorError11 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion11 && _iterator11['return']) {
                            _iterator11['return']();
                        }
                    } finally {
                        if (_didIteratorError11) {
                            throw _iteratorError11;
                        }
                    }
                }
            }
            return valueArray;
        }
    }]);

    return Connection;
})();

exports['default'] = Connection;
module.exports = exports['default'];

//# sourceMappingURL=QueryBuilder.js.map