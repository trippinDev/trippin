/**
 * Created by sung-yujin on 2016. 5. 14..
 */
var express = require('express');
var mysql = require('mysql');
var config = require('../config.json');
var fs = require('fs');
var multiparty =  require('multiparty');

var router = express.Router();
var pool = mysql.createPool(config.dbinfo);

/* GET board listing. */
router.get('/', function(req, res, next) {
    res.send('board');
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
            filename =   part.filename; //이름설정할 함수 기입
            //req.session.name
            console.log('name :' + part.filename);
            size = part.byteCount;
        }else{
            part.resume();
        }

        console.log("Write Streaming file :"+filename);

        //업로드되는 파일 업로드 스트림을 파일 writeStream에 pipe를 이용해서 연결한다
        //Request part 에서 들어오는 파일 데이타 스트림을 바로 파일 writeStream에 연결해서 파일이 써지도록 한다.
        var writeStream = fs.createWriteStream('/trippin/files/'+filename);

        writeStream.filename = filename;

        part.pipe(writeStream);

        //data가 읽어질때 발생. 읽어진 데이터는 chunk라는 변수로 넘어오게 된다.
        //chunk.length는 얼마나 읽었는지를 출력
        var concat;
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


module.exports = router;