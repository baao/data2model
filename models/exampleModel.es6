/**
 * xml2model model for TEST
 * createdBy: ModelCreator
 * created: 2015-09-22T16:18:35.012Z
 * License: MIT
 **/

"use strict";
const _BaseModel = require("./_BaseModel.js");
class exampleModel extends _BaseModel {
    constructor(options) {
        options = options || {};
        super(options);
        this.groupBy = ['col1'];
        this.functionsAfterParse = ['saveData'];
        this.columns = {
            col1 : {
                find: "xml.group",
                valueOptions: {
                    replace: { showReplace: 'hello' }
                }
            },
             
            col2 : {
                find: "xml.tag"
            },

            created_at: {
                defaultValue: new Date().toISOString()
            },
            updated_at: {
                defaultValue: new Date().toISOString()
            }
        }

	}
}

export default exampleModel;