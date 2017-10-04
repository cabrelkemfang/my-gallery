'use strict';

angular.module('myApp.view1', ['ngRoute','toastr','pouchdb'])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/view1', {
            templateUrl: 'view1/view1.html',
            controller: 'View1Ctrl'
        });
    }]).controller('View1Ctrl', ['$rootScope','$scope','toastr', 'pouchDB', function($rootScope, $scope, toastr, pouchDB) {
    var ENTER_KEY = 13;
    var db = pouchDB('todos');
    //var remoteCouch = location.protocol+'//'+location.hostname+':5984/todos';
    //var remoteCouch = 'http://ad92e789.ngrok.io/todos';
    var remoteCouch = 'http://localhost:5984/todos';
    var opts = {live: true, retry: true, back_off_function: back_off};
    db.changes({
        since: 'now',
        live: true,
        include_docs: true,
        heartbeat:1000
    }).on('change', function(change){
        if(!change.deleted){
            $scope.todos[change.doc._id] = change.doc;
        } else {
            delete $scope.todos[change.doc._id];
        }
    }).on('denied', function (err) {
        toastr.error('Not authorised to sync:' + err);
    }).on('error', function (err) {
        toastr.error('Error when syncing:' + err);
    });;
    db.replicate.to(remoteCouch, opts, syncError);
    db.replicate.from(remoteCouch, opts, syncError);
    db.allDocs({include_docs: true, descending: true}, function(err, doc) {
        $scope.todos = {};
        doc.rows.forEach(function(row){
            $scope.todos[row.doc._id] = row.doc;
        });
    });

    function back_off(delay) {
        if (delay === 0) {
            return 1000;
        }
        return delay * 1;
    }

    function addTodo(text) {
        if (text){
            var todo = {
                _id: new Date().toISOString() + Math.random(),
                title: text,
                completed: false
            };
            db.put(todo, function callback(err, result) {
                if (!err) {
                    toastr.success('Successfully posted todo');
                } else {
                    toastr.error('Failure when posting todo' + err);
                }
            });
        }
    }

    $scope.checkboxChanged = function (todo) {
        db.put(todo, function callback(err, result) {
            if (!err) {
                toastr.success('Successfully modified todo');
            } else {
                toastr.error('Failure when modifying todo' + err);
            }
        });
    }

    $scope.deleteButtonPressed = function (todo) {
        db.remove(todo, function callback(err, result) {
            if (!err) {
                toastr.success('Successfully deleted todo');
            } else {
                toastr.error('Failure when deleting todo' + err);
            }
        });
    }

    $scope.todoBlurred = function(todo, event) {
        var trimmedText = event.target.value.trim();
        if (!trimmedText) {
            db.remove(todo, function callback(err, result) {
                if (!err) {
                    toastr.success('Successfully deleted todo');
                } else {
                    toastr.error('Failure when deleting todo' + err);
                }
            });
        } else {
            todo.title = trimmedText;
            db.put(todo, function callback(err, result) {
                if (!err) {
                    toastr.success('Successfully modified todo');
                } else {
                    toastr.error('Failure when modifying todo' + err);
                }
            });
        }
        var div = document.getElementById('li_' + todo._id);
        div.className='';
    }

    function syncError() {
        toastr.error('Failure when syncing');
    }

    $scope.todoDblClicked = function(todo) {
        var div = document.getElementById('li_' + todo._id);
        var inputEditTodo = document.getElementById('input_' + todo._id);
        div.className = 'editing';
        inputEditTodo.value = todo.title;
        inputEditTodo.focus();
    }

    $scope.todoKeyPressed = function(todo, event) {
        if (event.keyCode === ENTER_KEY) {
            var inputEditTodo = document.getElementById('input_' + todo._id);
            inputEditTodo.blur();
        }
    }

    $scope.newTodoKeyPressHandler = function(event) {
        if (event.keyCode === ENTER_KEY) {
            addTodo(event.target.value);
            event.target.value = '';
        }
    }
}]);