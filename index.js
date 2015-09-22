/**
 *  data2model
 * Author: michael
 * Date: 22.09.15.
 * License: MIT
 */
'use strict';
module.exports = {
    xml: require('./bin/XmlParser.js'),
    csv: require('./bin/Csv2Model.es6'),
    creator: require('./bin/CreateModel.js')
};