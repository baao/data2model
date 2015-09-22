# data2model
Saves XML and CSV data to a database - based on models

This packages aims on providing a high performance, fast and convenient way to save data obtained via XML or CSV files. 
It uses `LOAD DATA LOCAL INFILE` for CSV files and parses XML data according to your models. Everything is created for you.
 
Models are created by running `npm run-script createModel`. The model creator requires redis for convenience, 
but currently only saves your databases. Redis uses database 10 by default and for now only creates an entry called
`modelCreator_database`. 

## Installation

    npm i data2model --save

## What it does

For the sake of this example, it creates this `INSERT ... ON DUPLICATE KEY UPDATE` query:

    INSERT INTO exampleModel (`col1`,`col2`,`created_at`,`updated_at`) VALUES ('hello','test','2015-09-22T16:48:41.355Z','2015-09-22T16:48:41.355Z'),('hello','test2','2015-09-22T16:48:41.355Z','2015-09-22T16:48:41.355Z'),('hello','test3','2015-09-22T16:48:41.355Z','2015-09-22T16:48:41.355Z') ON DUPLICATE KEY UPDATE `col1`=VALUES(`col1`),`col2`=VALUES(`col2`),`updated_at`=VALUES(`updated_at`)

and executes the query, given the `exampleModel` found in the models directory.

## Important

#### Very new package, so there might be some bugs and issues. 
Feel free to contribute or to post any issues. 
Needs node.js version >= 4.0.0.

## Usage
  
#### For now, run node with the --harmony_destructuring flag as it isn't finally implemented. 
  
  1. Copy (or create a new one) the `.env.example` file to `.env` in your apps root dir and fill in your credentials. You don't need to specify a database here.
  1.1. Get the dot notation for your xml file. See [dotNotation](https://github.com/baao/data2model#dotnotation) for how to.
  2. Start redis, create a file with this contents:
  
  `var data2model = require('data2model');
   new data2model.creator();`
  
  run it and follow the instructions. This will launch the model creator and will ask you for some details. 
  3. Have a look at the generated file inside the `/models` directory, you can add valueOptions, defaultValues and whatsoever
  4. Once done, saving XML data is as simple as:

`2`

      'use strict';
      const _Parser = require('data2model');
      const XmlParser = _Parser.xml;
      const CsvParser = _Parser.csv;
      let parser = new XmlParser({database: 'databaseToUse'});
      parser.parseFile("./examples/example.xml", ['exampleModel']);

Saving CSV data is quite similar:       
      
      let model = new CsvParser({
          model: 'model',
          file: 'file.csv',
          database: 'database'
      });
      model.parse();

## dotNotation
The XML parser uses dotNotation to access the xml nodes. A convenient way to get the dot notation is this:
 
      parser.parseFile("./examples/example.xml", {toDotNotation:true})
          .then(val => console.log(val));


I'll add some examples and easier usage later, feel free to ask on stackoverflow.com or post your issues here. 

## Examples

Check out the example Model in `/models` and the example xml/js file in `/examples` folder.


