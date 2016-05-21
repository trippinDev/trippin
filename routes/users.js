var express = require('express');
var mysql = require('mysql');
var config = require('../config.json');

var router = express.Router();
var pool = mysql.createPool(config.dbinfo);

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/signup', function(req, res, next) {

  var info = req.body;
  var err;

  pool.getConnection(function(err,connection){

    console.log(err)
    

    var query = connection.query("select * from member", function (_err, rows) {
      if(_err){
        res.status(err.status || 500);
        res.send(err.message);
      } else {
        try{
          outer : do {
            for(var key in rows) {

              if(rows[key].id == info.id || info.id.length < 10 || !info.id) {
                err = new Error('WRONG_ID');
                break outer;
              }
              if(rows[key].e_mail == info.e_mail || !info.e_mail) {
                err = new Error('WRONG_E_MAIL');
                break outer;
              }
            }
            if(!info.name) {
              err = new Error('WRONG_NAME');
              break outer;
            }
            if(!info.address) {
              err = new Error('WRONG_ADDRESS');
              break outer;
            }
            if(info.password.length < 12 || !info.password) {
              err = new Error('WRONG_PASSWORD');
              break outer;
            }
            query = connection.query('insert into member values("' + info.id + '","' + info.password + '","' + info.name + '","' + info.e_mail + '","' + info.address+'")', function(_err, _rows) {
              if(_err) {
                res.status(err.status || 500);
                res.send(err.message);
              } else res.sendStatus(200);
            });
          } while(false)

          if(err) {
            console.log(err)
            res.status(err.status || 500);
            res.send(err.message);
          }

        } catch(err) {
          res.status(err.status || 500);
          res.send(err.message);
        }
      }
      connection.release();

    });
  });
});

router.post('/login', function(req, res, next) {

  var info = req.body;
  var err;

  pool.getConnection(function(err,connection){

    var query = connection.query("select * from member", function (err, rows) {
      if(err){
        res.status(err.status || 500);
        res.send(err.message);
      } else {
        try{
          outer : do {
            var id;
            for(var key in rows) {
              console.log(rows[key].id);
              console.log(info.id)

              if(rows[key].id == info.id) {
                id = info.id;
                if(rows[key].password == info.password) makeSession(req, res, rows[key].name, rows[key].e_mail, rows[key].address);
                else {
                  err = new Error('WRONG_PASSWORD');
                  break outer;
                }
              }
            }
            if(!id) {
              err = new Error('WRONG_ID');
              break outer;
            }

            res.sendStatus(200);
          } while(false)

          if(err) {
            res.status(err.status || 500);
            res.send(err.message);

          }

        } catch(err) {
          res.status(err.status || 500);
          res.send(err.message);
        }
      }
      connection.release();

    });
  });
});

router.get('/logout', function (req, res) {
  destroySession(req, res);
  res.sendStatus(200);
})

router.get('/info', function (req, res) {
  if(req.session.user_id) {
    res.send(req.session);
  } else res.send('you are guest!');
})

function makeSession(req, res, name, e_mail, address) {
  req.session.user_id = req.body.id;
  req.session.password = req.body.password;
  req.session.name = name;
  req.session.e_mail = e_mail;
  req.session.address = address;

  console.log(req.session);
}

function destroySession(req, res) {
  req.session.destroy();
  res.clearCookie('sid');
}



module.exports = router;
