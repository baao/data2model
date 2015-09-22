/**
 * data2model
 * Author: michael
 * Date: 18.09.15.
 * License: MIT
 */
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var inquirer = require("inquirer");
var Promise = require('bluebird');
var log = require('deep-logger').deepLogger;
var QueryBuilder = require('./QueryBuilder.js');
var _redis = require('redis');
var redis = _redis.createClient({ db: 10 });
var fs = Promise.promisifyAll(require('fs-extra'));
var ModelCreator = require('./ModelCreator.js');
Promise.promisifyAll(require('redis'));

var CreateModel = (function () {
    function CreateModel(options) {
        _classCallCheck(this, CreateModel);

        if (!options) options = {};
        this.answers = new Map();
        this.options = Object.assign({
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }, options);
    }

    _createClass(CreateModel, [{
        key: "chooseDatabase",
        value: function chooseDatabase() {
            var _this = this;

            return redis.smembersAsync('modelCreator_database').then(function (val) {
                if (val.length == 0) {
                    return [{
                        type: "input",
                        name: "database",
                        message: "Which database to use?"
                    }];
                }

                return [{
                    type: "list",
                    name: "database",
                    message: "Which database to use?",
                    choices: val

                }, {
                    type: "input",
                    name: "databaseOther",
                    message: "create new database",
                    when: function when(answers) {
                        return answers.database == '- other -';
                    }
                }];
            }).then(function (data) {
                inquirer.prompt(data, function (answers) {
                    _this.con = new QueryBuilder(answers.databaseOther || answers.database, { shouldQueryNow: true });
                    redis.saddAsync('modelCreator_database', answers.databaseOther || answers.database);
                    _this.con.showTables().then(function (val) {
                        return val.map(function (v) {
                            return v['Tables_in_' + (answers.databaseOther || answers.database)];
                        });
                    }).then(function (data) {
                        var questions = [{
                            type: "list",
                            choices: data,
                            message: "Which table to use?",
                            name: "table"
                        }];
                        inquirer.prompt(questions, function (answers) {
                            _this.con.showColumns(answers.table).then(function (columns) {
                                _this.answers.set('_tableName_', answers.table);
                                var choices = [];
                                columns.forEach(function (col) {
                                    _this.answers.set(col.Field, new Map());

                                    if (col.Key != 'PRI' && ! ~[_this.options.createdAt, _this.options.updatedAt].indexOf(col.Field)) {
                                        choices.push(col.Field);
                                    } else {
                                        if (col.Key == 'PRI') {
                                            _this.answers.get(col.Field).set('exclude', true);
                                        }
                                        if (col.Default) {
                                            _this.answers.get(col.Field).set('defaultValue', 'new Date().toISOString()');
                                        }
                                    }
                                });
                                return choices;
                            }).then(function (data) {
                                var questions = [{
                                    type: "checkbox",
                                    choices: data,
                                    message: "Which columns to find in csv/xml?",
                                    name: "find",
                                    required: true
                                }];
                                inquirer.prompt(questions, function (answers) {
                                    var question = [];
                                    answers.find.forEach(function (val) {
                                        question.push({
                                            name: val,
                                            type: 'input',
                                            message: "Which heading/tag in csv/xml for " + val + "?",
                                            "default": val
                                        });
                                    });
                                    inquirer.prompt(question, function (answers) {
                                        Object.keys(answers).forEach(function (val) {
                                            _this.answers.get(val).set('find', answers[val]);
                                        });
                                        return _this.createFileFromAnswers();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }
    }, {
        key: "createFileFromAnswers",
        value: function createFileFromAnswers() {
            var answers = this.answers;
            var creator = new ModelCreator(answers);
        }
    }]);

    return CreateModel;
})();

new CreateModel().chooseDatabase();
exports["default"] = CreateModel;
module.exports = exports["default"];

//# sourceMappingURL=CreateModel.js.map