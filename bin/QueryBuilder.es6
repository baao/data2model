/**
 * data2model
 * Author: michael
 * Date: 06.09.15.
 * License: MIT
 */
import dotenv from 'dotenv';
dotenv.load();
import mysql from 'mysql';
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 50,
    queueLimit: 100,
    multipleStatements: true,
    flags: ['LOCAL_FILES'],
    charset: 'utf8_unicode_ci'
});

import Promise from 'bluebird';
import _log from 'deep-logger';
const log = _log.deepLogger;
import repeatStr from 'repeat-string';

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

Promise.promisifyAll(mysql);
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);
String.prototype.ucFirst = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
class Connection {
    constructor(database, options = {}) {
        this.database = database;
        this.options = Object.assign({
            shouldQueryNow: false
        }, options);
        this.operators = {}
    }

    getConnection() {
        return pool.getConnectionAsync().then(connection => connection
        ).then(con => {
                con.changeUser({
                    database: this.database
                });
                return con;
            });
    }

    query(query) {
        return this.getConnection().then(con => {
            return con.queryAsync(query).spread((res, table) => {
                con.release();
                return res;
            }).catch(err => {
                throw new QueryError(err.code)
            });
        })
    }

    transactionQuery(query, runChecks) {
        let commiter = con => {
            con.commit(err => {
                if (err) {
                    con.rollback();
                }
            });
            if (runChecks && runChecks.needTemporaryTable && runChecks.timing == 'functionsAfterParse') {
                return con.query(this.drop('temp_' + runChecks.table), (err, res) => {
                });
            }
            con.release();
        };
        return this.getConnection().then(con => {
            return con.queryAsync('START TRANSACTION;' + query).spread((res, table) => {
                if (typeof runChecks == 'object' && runChecks.runChecks) {
                    this[runChecks.runChecks]('temp_' + runChecks.table, runChecks.table).then(val => {
                        if (!val) {
                            throw new CheckFunctionFailedError();
                        }
                        commiter(con);
                    }).catch(CheckFunctionFailedError, () => {
                        con.query(this.rollback(runChecks.savePoint), (err, res)=> {
                            con.query(this.drop('temp_' + runChecks.table), (err, res) => {
                            });
                        });
                        con.release();
                    }).catch(err => (err));
                } else {
                    commiter(con);
                }
            }).catch(err => {
                con.rollback(() => {
                    throw new QueryError(err);
                });
            });
        }).catch(err => (err));
    }

    shouldQueryNow(query) {
        if (this.options.shouldQueryNow) {
            return this.query(query);
        }
        return query;
    }

    showColumns(table) {
        return this.shouldQueryNow(mysql.format(`SHOW COLUMNS FROM ??;`, [table]))
    }

    showTables() {
        return this.shouldQueryNow(mysql.format(`SHOW TABLES FROM ??;`, [this.database]));
    }

    truncate(table) {
        return this.shouldQueryNow(mysql.format(`TRUNCATE ??`, [table]));
    }

    drop(table) {
        return this.shouldQueryNow(mysql.format(`DROP TABLE IF EXISTS ??`, [table]));
    }

    rollback(to) {
        return 'ROLLBACK ' + (to ? 'TO ' + to : '');
    }

    select(table, options) {
        let statement = `SELECT `;
        if (options instanceof Map && options.has('select')) {
            statement += repeatStr('??,', Array.from(options.get('select')).length).replace(/(,)$/, '') + ' FROM ?? ';
        } else {
            statement += '*  FROM ?? ';
        }
        return this.statementBase(table, options, statement).then(val => {
            return this.shouldQueryNow(val)
        });
    }

    update(table, options) {
        let statement = `UPDATE ?? SET `;
        statement += repeatStr(' ?? = ?,', options.get('update').size).replace(/(,)$/, ' ');

        return this.statementBase(table, options, statement).then(val => {

            return this.shouldQueryNow(val)
        });
    }

    createTable(table, fieldsOrLike, options = {}) {
        options = Object.assign({
            checkIfExists: true,
            addTimestamps: true,
            type: 'innodb'
        }, options);

        return Promise.resolve(
            `CREATE TABLE ${options.checkIfExists ? 'IF NOT EXISTS' : ''} ?? ${typeof fieldsOrLike == 'string' ? 'LIKE ' + '??' : '('}`
        ).then(query => {
                let params = [];
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
                    for (let [key,val] of fieldsOrLike.entries()) {
                        query += '?? ' + val + ',';
                        params.push(key);
                    }
                }
                return [query.replace(/(,)$/, '') + (typeof fieldsOrLike == 'string' ? '' : ') ENGINE = ' + options.type.toUpperCase()), params];
            }).spread((query, params) => {

                return this.shouldQueryNow(mysql.format(query, params));
            });
    }

    createTableIfNotExists(table, fieldsOrLike, options = {checkIfExists: true}) {
        return this.createTable(table, fieldsOrLike, options);
    }

    copyTableData(from, to, fields, options = {}) {
        options = Object.assign({
            onDuplicateKeyUpdate: []
        }, options);

        return Promise.resolve(`INSERT INTO ?? (\`created_at\`, \`updated_at\`, ${repeatStr('??,', Array.from(fields.keys()).length).replace(/(,)$/, '')}) SELECT NOW(), NOW(), ${repeatStr('??,', Array.from(fields.keys()).length).replace(/(,)$/, '')} FROM ?? ${options.onDuplicateKeyUpdate ? 'ON DUPLICATE KEY UPDATE \`updated_at\` = NOW()' : ''}`
        ).then(query => {
                let params = [to];
                for (let key of fields.keys()) {
                    params.push(key);
                }
                for (let value of fields.values()) {
                    params.push(value)
                }
                params.push(from);
                return [query, params];
            }).spread((query, params) => {
                if (options.onDuplicateKeyUpdate && options.onDuplicateKeyUpdate.length == 0) {
                    for (let key of fields.keys()) {
                        query += `,??=VALUES(??)`;
                        params.push(key, key);
                    }
                }
                if (options.onDuplicateKeyUpdate && options.onDuplicateKeyUpdate.length > 0) {
                    options.onDuplicateKeyUpdate.forEach(val => {
                        query += `,??=VALUES(??)`;
                        params.push(val, val);
                    })
                }
                return this.shouldQueryNow(mysql.format(query, params));
            })
    }

    createStatements(table, options, val) {
        let values = new Map();
        let baseArr = [table];
        if (options instanceof Map && options.has('select')) {
            Array.from(options.get('select')).forEach(data => baseArr.unshift(data));
            options.delete('select');
        }
        if (options instanceof Map && options.has('update')) {
            for (let [k,v] of options.get('update')) {
                baseArr.push(k, v);
            }
            options.delete('update');
        }
        if (options instanceof Map && options.size > 0) {
            for (let [key,value] of options.entries()) {
                values.set(key, this[`build${key.ucFirst()}`](value));
            }
        }
        return [val, values, baseArr];
    }

    statementBase(table, options, statement) {
        return Promise.resolve(statement).then(val => {
            return this.createStatements(table, options, val);
        }).spread((statement, values, baseArr) => {
            return this.buildWhereStatement(statement, baseArr, values);
        }).spread((statement, values) => {
            return mysql.format(statement, values).replace(/\s+/, ' ');
        });
    }

    compareTableCount(table1, table2) {
        return this.query(mysql.format('SELECT COUNT(a.id) as counter FROM ?? as a UNION ALL SELECT COUNT(b.id) as counter FROM ?? as b', [table1, table2])).spread((table1, table2) => {
            return table1.counter * 2 >= table2.counter;
        });
    }

    rm(table, options) {
        let statement = `DELETE FROM ?? `;
        return this.statementBase(table, options, statement).then(val=>this.shouldQueryNow(val));
    }

    rmCompareNotIn(deletionTable, compareTable, fieldsToCompare, options = {}) {
        options = Object.assign({
            inOrNot: 'NOT IN'
        }, options);
        return Promise.resolve(`DELETE FROM ?? WHERE ?? ${options.inOrNot} (SELECT ?? FROM ??)`).then(stmt => {
            let arr = [deletionTable, Array.from(fieldsToCompare.keys())[0], Array.from(fieldsToCompare.values())[0], compareTable];
            return this.shouldQueryNow(mysql.format(stmt, arr));
        })
    }

    buildWhereStatement(...val) {
        if (val[2].size > 0) {
            val[0] += 'WHERE 1=1';
            for (let [key,value] of val[2]) {
                val[0] += ~key.indexOf('or') ? ' OR ' + value[0] : ' AND ' + value[0];
                value[1].forEach(d => {
                    val[1].push(d)
                });
            }
        }
        return [val[0].replace(/1=1 \w+/, ''), val[1]];
    }

    buildOrWhereIn(data, options = {compare: 'or'}) {
        return this.buildWhereIn(data, options);
    }

    buildWhereNotIn(data, options = {
        compare: 'AND',
        inOrNot: 'NOT IN'
    }) {
        return this.buildWhereIn(data, options)
    }

    buildWhereIn(data, options = {
        compare: 'AND',
        inOrNot: 'IN'
    }) {
        let arr = [];
        let stmt = ' ?? ' + options.inOrNot + ' (';
        for (let [key,value] of data.entries()) {
            arr.push(key);
            value.forEach(val => {
                stmt += '?,';
                arr.push(val)
            });
            stmt = stmt.replace(/,$/, ') ' + options.compare + ' ?? ' + options.inOrNot + ' (');
        }
        stmt = stmt.replace(/ (AND|IN) \?\? (IN|NOT IN) \($/ig, '');
        return [stmt, arr]
    }

    buildOrWhere(data, options = {
        compareDeep: 'or',
        equality: '=',
        compare: 'or'
    }) {
        return this.buildWhere(data, options);
    }

    buildWhereNot(data, options = {
        compareDeep: 'or',
        equality: '!=',
        compare: 'and'
    }) {
        return this.buildWhere(data, options);
    }

    buildWhere(data, options = {
        compareDeep: 'or',
        equality: '=',
        compare: 'and'
    }) {
        let values = new Map();
        let entries = [];
        let tmp = [];
        let compare = options.compareDeep;
        let i = 0;
        for (let [key,value] of data.entries()) {
            if (value instanceof Array) {
                entries.push('(' + value.map((val, i)=> {
                        tmp.push(key, val);
                        return ['??', options.equality, '?'].join(' ')
                    }).join(' ' + compare + ' ') + ')');
            } else {
                tmp.push(key, value);
                entries.push(' ?? ' + options.equality + ' ? ');
            }
            i++;
            if (i == data.size) {
                values.set(entries.join(' ' + options.compare + ' '), tmp);
            }
        }

        return [Array.from(values.keys()).join(' ' + options.compare + ' '), tmp];
    }

    loadDataInfileString(file, table, cs, ss, options = {}) {
        options = Object.assign({}, options);
        return Promise.resolve(`LOAD DATA LOCAL INFILE "${file}" INTO TABLE ${table} CHARACTER SET ${options.encoding} FIELDS TERMINATED BY '${options.delimiter}' ENCLOSED BY '${options.enclosedBy}' IGNORE 1 LINES (${cs})` + (ss != '' ? ` SET ${ss}` : '')).then(val=>this.shouldQueryNow(val));
    }

    insert(table, fields, options = {onDuplicateKeyUpdate: false}) {
        return this.upsert(table, fields, options);
    }

    upsert(table, fields, options = {onDuplicateKeyUpdate: []}) {
        let columnLength = Array.from(fields.get(0).values()).length,
            statement = `INSERT INTO ${table} (${repeatStr('??,', columnLength).slice(0, -1)})`;

        return Promise.resolve(statement)
            .then(statement => {
                statement += ` VALUES (`;
                for (let i = 1; i <= fields.size; i++) {
                    statement += `${repeatStr('?,', columnLength).slice(0, -1)}`;
                    statement += `${(i == fields.size ? ')' : '),(')}`
                }
                return statement;
            }).then(statement => {
                if (options.onDuplicateKeyUpdate instanceof Array) {
                    statement = `${statement} ON DUPLICATE KEY UPDATE ${repeatStr('??=VALUES(??),', (options.onDuplicateKeyUpdate.length == 0 ? columnLength - 1 : options.onDuplicateKeyUpdate.length - 1)).slice(0, -1)}`;
                }
                return statement;
            }).then(statement => {
                return [statement, this.createValueArray(fields, {onDuplicateKeyUpdate: options.onDuplicateKeyUpdate})];
            }).spread((statement, values) => {
                return this.shouldQueryNow(mysql.format(statement, values));
            });
    }

    createValueArray(fields, options) {
        let valueArray = Array.from(fields.get(0).keys());
        for (let res of fields.values()) {
            for (let rows of res.values()) {
                valueArray.push(rows)
            }
        }
        if (options.onDuplicateKeyUpdate instanceof Array) {
            let filler = options.onDuplicateKeyUpdate.length == 0 ? Array.from(fields.get(0).keys()) : options.onDuplicateKeyUpdate;

            for (let row of filler) {
                for (let i = 0; i < 2; i++) {
                    if (row != 'created_at') valueArray.push(row);
                }
            }
        }
        return valueArray;
    }
}

export default Connection;

