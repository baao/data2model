/**
 * data2model
 * Author: michael
 * Date: 18.09.15.
 * License: MIT
 */
"use strict";
const inquirer = require("inquirer");
const Promise = require('bluebird');
const log = require('deep-logger').deepLogger;
const QueryBuilder = require('./QueryBuilder.js');
const _redis = require('redis');
const redis = _redis.createClient({db:10});
const fs = Promise.promisifyAll(require('fs-extra'));
const ModelCreator = require('./ModelCreator.js');
Promise.promisifyAll(require('redis'));

class CreateModel {
    constructor(options) {
        if (!options) options = {};
        this.answers = new Map();
        this.options = Object.assign({
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }, options);
    }


    chooseDatabase() {
        return redis.smembersAsync('modelCreator_database').then(val => {
            if (val.length == 0) {
                return [
                    {
                        type: "input",
                        name: "database",
                        message: "Which database to use?"
                    }
                ]
            }

                return [
                    {
                        type: "list",
                        name: "database",
                        message: "Which database to use?",
                        choices: val

                    },
                    {
                        type: "input",
                        name: "databaseOther",
                        message: "create new database",
                        when: function (answers) {
                            return answers.database == '- other -';
                        }
                    }
                ];
        }).then(data => {
            inquirer.prompt(data, answers => {
                this.con = new QueryBuilder((answers.databaseOther || answers.database), {shouldQueryNow: true});
                redis.saddAsync('modelCreator_database', (answers.databaseOther || answers.database));
                this.con.showTables().then(val => {
                    return val.map(v => v['Tables_in_' + (answers.databaseOther || answers.database)])
                }).then(data => {
                    let questions = [
                        {
                            type: "list",
                            choices: data,
                            message: "Which table to use?",
                            name: "table"
                        }
                    ];
                    inquirer.prompt(questions, answers => {
                        this.con.showColumns(answers.table).then(columns => {
                            this.answers.set('_tableName_', answers.table);
                            let choices = [];
                            columns.forEach(col => {
                                this.answers.set(col.Field, new Map());

                                if (col.Key != 'PRI' && !~[this.options.createdAt, this.options.updatedAt].indexOf(col.Field)) {
                                    choices.push(col.Field);
                                } else {
                                    if (col.Key == 'PRI') {
                                        this.answers.get(col.Field).set('exclude', true);
                                    }
                                    if (col.Default) {
                                        this.answers.get(col.Field).set('defaultValue', `${'new Date().toISOString()'}`);
                                    }
                                }
                            });
                            return choices;
                        }).then(data => {
                            let questions = [
                                {
                                    type: "checkbox",
                                    choices: data,
                                    message: "Which columns to find in csv/xml?",
                                    name: "find",
                                    required: true
                                }
                            ];
                            inquirer.prompt(questions, answers => {
                                let question = [];
                                answers.find.forEach(val => {
                                    question.push({
                                        name: val,
                                        type: 'input',
                                        message: `Which heading/tag in csv/xml for ${val}?`,
                                        default: val
                                    });
                                });
                                inquirer.prompt(question, answers => {
                                    Object.keys(answers).forEach(val => {
                                        this.answers.get(val).set('find', answers[val]);
                                    });
                                    return this.createFileFromAnswers();
                                })
                            });
                        })
                    })
                })
            })
        });

    }

    createFileFromAnswers() {
        let answers = this.answers;
        let creator = new ModelCreator(answers);
    }
}
new CreateModel().chooseDatabase();
export default CreateModel;