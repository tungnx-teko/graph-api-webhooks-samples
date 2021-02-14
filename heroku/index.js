/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var xhub = require('express-x-hub');

// Connect mysql
var mysql = require('mysql')

const mysqlUrl = 'mysql://b79c6fd0af81bd:0ae8d011@us-cdbr-east-03.cleardb.com/heroku_3ddac921953a9df?reconnect=true';

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));

app.use(xhub({ algorithm: 'sha1', secret: process.env.APP_SECRET }));
app.use(bodyParser.json());

var token = process.env.TOKEN || 'token';
var received_updates = [];

app.get('/', function(req, res) {
  console.log(req);
  res.send('<pre>' + JSON.stringify(received_updates, null, 2) + '</pre>');
});
 
app.post('/register-page', function(req, res) {
  var connection = mysql.createConnection(mysqlUrl);
  connection.connect()
  var pageId = req.body['page_id'];
  var pageName = req.body['page_name'];
  var pageToken = req.body['page_token'];

  if (!pageToken) {
    res.sendStatus(400);
    connection.destroy();
  }

  var query = 'SELECT * FROM heroku_3ddac921953a9df.pages WHERE page_id = \'' + pageId + '\'';
  connection.query(query, function (error, results, fields) {
    if (error) throw error;
    
    if (results.length == 0) {
      var sql = "INSERT INTO pages (page_id, page_name, page_token) VALUES ('" + pageId + "', '" + pageName + "', '" + pageToken + "')";
      connection.query(sql, function (err, result) {
        if (err) throw err;
        res.send(result)
        connection.destroy();
      });
    } else {
      res.send(results);
      connection.destroy();
    }
  });
});

app.get('/rule', function(req, res) {
  var connection = mysql.createConnection(mysqlUrl);
  connection.connect()

  var query = 'SELECT * FROM rules';
  
  connection.query(query, function (err, result, fields) {
    if (err) {
      console.log(err);
      connection.destroy();
      throw err;
    }
    res.send(result)
    connection.destroy();
  });

});

app.get('/rule/getByPost', function(req, res) {
  var connection = mysql.createConnection(mysqlUrl);
  connection.connect()

  var query = "SELECT rules.rule_id, rules.rule_name, rules.rule_contains, rules.rule_keywords, rules.rule_comment, rules.rule_message FROM rules INNER JOIN post_rule WHERE rules.rule_id=post_rule.rule_id AND post_rule.post_id = '" + req.query["post_id"] + "'";
  
  connection.query(query, function (err, result, fields) {
    if (err) {
      console.log(err);
      connection.destroy();
      throw err;
    }
    res.send(result)
    connection.destroy();
  });

});

app.post('/rule/removeFromPost', function(req, res) {
  var connection = mysql.createConnection(mysqlUrl);
  connection.connect()

  var ruleId = req.body['rule_id'];
  var postId = req.body['post_id'];

  var sql = "DELETE FROM post_rule WHERE rule_id='" + ruleId + "' AND post_id='" + postId + "';" ;
  
  connection.query(sql, function (err, result, fields) {
    if (err) {
      console.log(err);
      connection.destroy();
      throw err;
    }
    res.send(result)
    connection.destroy();
  });

});

app.post('/rule/addToPost', function(req, res) {
  var connection = mysql.createConnection(mysqlUrl);
  connection.connect()

  var ruleId = req.body['rule_id'];
  var postId = req.body['post_id'];
  var pageToken = req.body['page_token'];

  var sql = "INSERT INTO post_rule (rule_id, post_id, page_token) VALUES ('" + ruleId + "', '" + postId + "', '" + pageToken + "')";
  
  connection.query(sql, function (err, result, fields) {
    if (err) {
      console.log(err);
      connection.destroy();
      throw err;
    }
    res.send(result)
    connection.destroy();
  });

});

app.post('/rule', function(req, res) {
  var connection = mysql.createConnection(mysqlUrl);
  connection.connect()
  var ruleName = req.body['rule_name'];
  var ruleKeywords = req.body['rule_keywords'];
  var ruleContains = req.body['rule_contains'];
  var ruleComment = req.body['rule_comment'];
  var ruleMessage = req.body['rule_message'];

  var sql = "INSERT INTO rules (rule_name, rule_keywords, rule_contains, rule_comment, rule_message) VALUES ('" + ruleName + "', '" + ruleKeywords + "', '" + ruleContains  + "','" + ruleComment  + "', '" + ruleMessage + "')";
  
  connection.query(sql, function (err, result) {
    if (err) {
      console.log(err);
      connection.destroy();
      throw err;
    }
    res.send(result)
    connection.destroy();
  });

});

app.get(['/facebook'], function(req, res) {
  if (
    req.query['hub.mode'] == 'subscribe' &&
    req.query['hub.verify_token'] == token
  ) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

app.post('/facebook', function(req, res) {
  console.log('Facebook request body:', req.body);

  if (!req.isXHubValid()) {
    console.log('Warning - request header X-Hub-Signature not present or invalid');
    res.sendStatus(401);
    return;
  }

  console.log('request header X-Hub-Signature validated');
  // Process the Facebook updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});