var express = require('express');
var mysql = require('mysql');
var config = require('../config.json');
var fs = require('fs');
var multiparty =  require('multiparty');
var path = require('path');
require('date-utils');

var router = express.Router();
var pool = mysql.createPool(config.dbinfo);

var imgFolder = path.resolve('/trippin/');
var postFolder = path.resolve('/trippin/files/');
var dt = new Date();

//var month = dt.toFormat('YYYY-DD');		// 현재 월 변수에 저장
var day = dt.toFormat('YYYY-MM-DD');		// 현재 일 변수에 저장
var folderArr = ['images', day];

/* 배열로 된 폴더명을 받아서 하위폴더를 구성해준다. -- main */
function arryCreateFolder(imgFolder, folderArr){
    var nFolder = imgFolder;
    for( folder in folderArr ){
        var status = searchFolder(nFolder, folderArr[folder]);
        //폴더가 이미 존재하는지 확인
        if(!status){
            var createStatus = createFolder(nFolder, folderArr[folder]);
            //폴더가 존재하지 않으면 생성한다
            nFolder = path.join(nFolder, folderArr[folder]);
        }
    }
}

// 폴더를 생성하는 역할을 맡는다.
function createFolder(folder, createFolder){
    var tgFolder = path.join(folder,createFolder);
    console.log("createFolder ==> " + tgFolder);
    fs.mkdir(tgFolder, 0666, function(err){
        if(err){
            return false;
        }else{
            console.log('create newDir');
            return true;
        }
    });
}

// 폴더가 존재하는지 찾는다. 있다면 폴더위치를 리턴하고, 없다면 false를 리턴한다.
function searchFolder(folder, srhFolder){
    var rtnFolder;
    fs.readdir(folder, function (err, files) {
        if(err) throw err;
        files.forEach(function(file){

            if(file == srhFolder){
                fs.stat(path.join(folder, file), function(err, stats){

                    if(stats.isDirectory()){
                        return path.join(folder, file);
                    }
                });
            }
        });
    });
    return false;
}


/* GET board listing. */
router.get('/', function(req, res, next) {
    makeSession(req, res, 'longin_name', 'login_email', 'login_address');

    if(req.session.user_id) {
        res.send(req.session);
    } else res.send('you are guest!');
});


router.post('/write', function(req, res, next) {

    var err;
    var memo = {
        "writer": req.session.user_id,
        "content": req.body.content,
        "mtime" : new Date()
    };
    try {
        pool.getConnection(function(_err, connection){

            outer : do {

                if(_err) {
                    err = _err;
                    break outer;
                }
                query = connection.query('insert into board set ?', memo, function(_err, _rows) {
                    if(_err) {
                        err = _err;
                    }
                });
                connection.release();

            } while(false);
        });
    } catch(_err) {
        err = _err;
    }

    if(err) {
        console.log(err);
        res.status(err.status || 500);
        res.send(err.message);
    } else res.sendStatus(200);

});

router.post('/upload', function(req, res, next) {
    var name = req.session.user_id;
    console.log('here name :' + name);
    arryCreateFolder(postFolder, folderArr);

    var form = new multiparty.Form();

    // get field name & value
    // 파일이 아닌 일반 필드가 들어왔을때 발생하는 이벤트
    form.on('field',function(name,value){
        console.log('normal field / name = '+name+' , value = '+value);
    });

    // file upload handling
    form.on('part',function(part){
        var filename;
        var size;
        if (part.filename) {    //part 이벤트 핸들러 내에서 파일일 경우 전송돼 온다
            filename = name + '.jpg';
            //part.filename; 이름설정할 함수 기입
            //req.session.name
            console.log('name :' + part.filename);
            size = part.byteCount;
        }else{
            part.resume();
        }

        console.log("Write Streaming file :"+filename);

        //업로드되는 파일 업로드 스트림을 파일 writeStream에 pipe를 이용해서 연결한다
        //Request part 에서 들어오는 파일 데이타 스트림을 바로 파일 writeStream에 연결해서 파일이 써지도록 한다.
        var writeStream = fs.createWriteStream('/trippin/files/images/' + day + '/' + filename);

        writeStream.filename = filename;

        part.pipe(writeStream);

        //data가 읽어질때 발생. 읽어진 데이터는 chunk라는 변수로 넘어오게 된다.
        //chunk.length는 얼마나 읽었는지를 출력
        part.on('data',function(chunk){
            console.log(filename+' read '+chunk.length + 'bytes');
        });

        //해당 part를 다 읽었을때 end이벤트 발생.
        //파일을 다읽었으면 writeStream.end()를 이용해서 파일 writeStream을 닫는다
        part.on('end',function(){
            console.log(filename+' Part read complete');
            writeStream.end();
        });

    });

    // all uploads are completed
    form.on('close',function(){
        res.status(200).send('Upload complete');
    });

    // track progress
    // 이 이벤트는 폼을 읽는 중에 처리 상황을 알려주는 이벤트. 전체 폼 데이타의 양 (byteExpected)대비,
    // 얼마나 데이타를 읽었는지 (byteRead)를 매번 리턴해줌으로써 파일 업로드 프로그래스 창과 같은것을 만들 수 있음.
    form.on('progress',function(byteRead,byteExpected){
        console.log(' Reading total  '+byteRead+'/'+byteExpected);
    });
    form.parse(req);
});


function makeSession(req, res, name, e_mail, address) {
    req.session.user_id = 'login_id';
    req.session.password = 'login_password';
    req.session.name = name;
    req.session.e_mail = e_mail;
    req.session.address = address;

    console.log(req.session);
}

module.exports = router;
