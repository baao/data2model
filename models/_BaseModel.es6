/**
 * data2model
 * Author: michael
 * Date: 16.09.15.
 * License: MIT
 */
'use strict';
const QueryBuilder = require('./../bin/QueryBuilder.js');
const Promise = require('bluebird');
class _BaseModel extends QueryBuilder {
    constructor(options) {
        super(options.database, {shouldQueryNow: options.shouldQueryNow});
        this._options = {};
        this._functions = new Map([
            ['saveData',
                (data) => Promise.all([
                    this.upsert(data.table, data.fields, {onDuplicateKeyUpdate: []})
                ])
            ]
        ]);
    }

    _getFunctions(name) {
        return this._functions.get(name);
    }
}

module.exports = _BaseModel;
