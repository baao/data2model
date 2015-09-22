/**
 * data2model
 * Author: michael
 * Date: 09.09.15.
 * License: MIT
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _appRootPath = require('app-root-path');

var _appRootPath2 = _interopRequireDefault(_appRootPath);

var reqLib = _appRootPath2['default'].require;

var ModelCreator = function ModelCreator(data) {
    _classCallCheck(this, ModelCreator);

    var ws = _fsExtra2['default'].createOutputStream(_appRootPath2['default'] + '/models/' + data.get('_tableName_') + '.es6'),
        columnData = [],
        tableName = data.get('_tableName_'),
        comment = '/**\n * xml2model model for ' + tableName + '\n * createdBy: ModelCreator\n * created: ' + new Date().toISOString() + '\n * License: MIT\n **/',
        requireFiles = '"use strict";\nconst _BaseModel = require("./_BaseModel.js");',
        fileHeader = '\nclass ' + tableName + ' extends _BaseModel {\n    constructor(options) {\n        options = options || {};\n        super(options);\n        this.groupBy = [];\n        this.firstLine = [];\n        this.functionsBeforeParse = [];\n        this.functionsAfterParse = [];\n        this.checkFunctionAfterParse = \'\';\n        // this.savePoint = \'\';\n        // this.needTemporaryTable = false;\n        this.columns = {\n            :columnData:\n        }';
    data['delete']('_tableName_');
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = data.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _step$value = _slicedToArray(_step.value, 2);

            var key = _step$value[0];
            var value = _step$value[1];

            columnData.push('\n            ' + key + ' : {\n                ' + (value.has('find') ? 'find: "' + value.get('find') + '"' : '// find: null') + ',\n                ' + (value.has('exclude') ? 'exclude: true' : '//exclude: null') + ',\n                ' + (value.has('defaultValue') ? 'defaultValue: ' + value.get('defaultValue') : '// defaultValue: false') + ',\n                // valueOptions: {\n                //    replace: {},\n                //    regex: {}\n                // }\n            },\n            ');
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

    fileHeader = fileHeader.replace(':columnData:', columnData.join(' ').trim().replace(/,$/, ''));
    ws.write(comment + '\n\n' + requireFiles + '\n\n' + fileHeader + '\n\n\t}\n}\n\n' + 'export default ' + tableName + ';');
    return true;
};

exports['default'] = ModelCreator;
module.exports = exports['default'];

//# sourceMappingURL=ModelCreator.js.map