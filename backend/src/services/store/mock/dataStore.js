"use strict";
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parse');

var dataStore = function() {

    const DEFAULT_FILE = './data.csv';
    var data = null;

    var toBase64 = function(file) {
        // read binary data
        let bitmap = fs.readFileSync(file);
        // convert binary data to base64 encoded string
        return new Buffer(bitmap).toString('base64');
    }

    var toImageObj = function(_path){
        var o = {};
        o.name = path.posix.basename(_path);
        o.type = path.extname(o.name);
        o.data = toBase64(_path);
        return o;
    }

    var findImgObjs = function(_path){

        let o = {}
        let f = fs.readdirSync(_path);
        
        f.forEach(file => {
            
            if(file.match('^[0-9]+\_[0-9]+\.png')){
                let _file = path.posix.basename(file);
                let us = _file.indexOf('_');
                let p = _file.indexOf('.');
                let partNumber = _file.slice(0,us);
                let imgNumber = _file.slice(us+1, p);

                if(!o[partNumber])
                    o[partNumber] = []
                
                o[partNumber].push(toImageObj(file));

            }
            
        });

        return o;

    }

    var toPart  = function(fieldsArray, imgArray){
        let p = {};
        p.name = fieldsArray[1]
        p.price = fieldsArray[2]
        p.category = fieldsArray[3]
        p.subcategory = fieldsArray[4]
        p.notes = fieldsArray[5]
        p.images = imgArray[fieldsArray[0]]
        return p;
    };

    // data file format: 'number', 'name', 'price', 'category', 'subcategory', 'notes' 

    function loadAsyncFunction(_datafile){
        let _folder = path.dirname(_datafile);
        let imgs = findImgObjs(_folder);
        return new Promise(resolve => {
            let d = [];
            fs.createReadStream(_datafile)
            .pipe(csvParser({delimiter: ','}))
            .on('data', function(l) {
                console.log('@data',l);
                d.push(toPart(l, imgs));
            })
            .on('end',function() {
                console.log('@end', d);
                resolve(d);
            })
            .on('error', function() {
                console.log('@error',d);
                resolve(null);
            });
        });
    }

    async function init(){
        data = await loadAsyncFunction(DEFAULT_FILE);
        console.log('data:', data);
        let status = (data !== null);
        console.log('status:', status );
        return status;
    }

    var setObj = function(o){
        if(o.id){
            s = data.filter(e => o.id === e.id)
            if(1 === s.length){
                let idx = data.indexOf(s[0]);
                data[idx] = o;
            }
                s[0]
        }
        else {

        }
    }

    return {
        init: init
    };

}();

module.exports = dataStore;

