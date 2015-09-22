/**
 * xml2model model for TEST
 * createdBy: ModelCreator
 * created: 2015-09-22T16:18:35.012Z
 * License: MIT
 **/

"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _BaseModel = require("./_BaseModel.js");

var exampleModel = (function (_BaseModel2) {
    _inherits(exampleModel, _BaseModel2);

    function exampleModel(options) {
        _classCallCheck(this, exampleModel);

        options = options || {};
        _get(Object.getPrototypeOf(exampleModel.prototype), "constructor", this).call(this, options);
        this.groupBy = ['col1'];
        this.firstLine = [];
        this.functionsBeforeParse = [];
        this.functionsAfterParse = ['saveData'];
        this.checkFunctionAfterParse = '';
        // this.savePoint = '';
        // this.needTemporaryTable = false;
        this.columns = {
            col1: {
                find: "xml.group"
                //exclude: null,
                // defaultValue: false,
                // valueOptions: {
                //    replace: {},
                //    regex: {}
                // }
            },

            col2: {
                find: "xml.tag"
                //exclude: null,
                // defaultValue: false,
                // valueOptions: {
                //    replace: {},
                //    regex: {}
                // }
            },

            created_at: {
                defaultValue: new Date().toISOString()
            },
            updated_at: {
                defaultValue: new Date().toISOString()
            }
        };
    }

    return exampleModel;
})(_BaseModel);

exports["default"] = exampleModel;
module.exports = exports["default"];

//# sourceMappingURL=exampleModel.js.map