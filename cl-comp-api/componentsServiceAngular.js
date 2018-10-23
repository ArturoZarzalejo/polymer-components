(function() {
  'use strict';

  /**
  * @ngdoc service
  * @name clCore.service:$clComponents
  *
  * @description
  * The $clComponents service facilitates the communication between front and back
  * in order to get all the components necessaries for the application.
  *
  *
  * @property {(Array.<Object>)} list
  *   Array of component objects actually downloaded in cache.
  *   This is primarily meant to be used for linking scopes and automatic updates purposes.
  *
  */

  angular
    .module('clCore')
    .service('$clComponents', components);

  /* @ngInject */
  function components($http, $q, $filter) {
    var scope = this;
    var outdated = {};
    var liveUpdate = true;

    scope.list = {};
    scope.set = set;
    scope.get = get;
    scope.search = search;
    scope.outdated = outdatedFn;

    /**
    * @ngdoc method
    * @name clCore.service:$clComponents#set
    * @methodOf clCore.service:$clComponents
    *
    * @description
    * Update the provide component object in the database or, if comp_id property is
    * not provided, create a new component
    *
    * @param {(Object|Array<Object>)} component
    *   Component Object with the usual properties
    *
    * @return {HttpPromise} Returns a Promise that will be resolved to a response
    * array of components when the request succeeds or fails
    */
    function set() {
      var deferred = $q.defer();
      var setList = angular.isArray(arguments[0]) ? arguments[0] : [ arguments[0] ];

      $http.post('api/components.php', {
        setComponents: setList
      }).then(function() {
        angular.forEach(arguments[0].data, function(){
          _mergeData(arguments[0]);
        });

        deferred.resolve( arguments[0].data );
      }, function() {
        deferred.reject(arguments[0].data);
      });

      return deferred.promise;
    }


    /**
    * @ngdoc method
    * @name clCore.service:$clComponents#get
    * @methodOf clCore.service:$clComponents
    *
    * @description
    * Method to obtain the requested components.
    *
    *
    * @param {(String|Array<string>)} comp_id
    *   Components requested
    * @param {(Array<string>)=} fields
    *   Fields from the database requested
    * @param {(boolean)=} children
    *   It ensures that the children elements of the container are
    *   downloaded.
    *
    * @return {HttpPromise} Returns a Promise that will be resolved to a response
    * array of components when the request succeeds or fails
    */
    function get() {
      console.warn('arguments get() ----> ', arguments);
      
      if (arguments[2]){
        return getContainerData(arguments[0], arguments[1] || false);
      }

      arguments[1] = arguments[1] ? arguments[1] : [];

      var args = arguments;
      var deferred = $q.defer();
      var select = [];
      var returnList = [];
      var comp_ids = angular.isArray(arguments[0]) ? arguments[0] : [ arguments[0] ];
      var aux_comp_ids = angular.copy(comp_ids);

      angular.forEach(aux_comp_ids, function() {
        var comp_id = arguments[0];

        if (scope.list[comp_id] !== undefined) {
          var needRequest = false;

          angular.forEach(args[1].filter(function(obj){
              return !(obj in select);
          }), function() {
            if (scope.list[comp_id][ arguments[0] ] === undefined || (outdated[comp_id] !== undefined && !~outdated[comp_id].indexOf(arguments[0])) ){
              scope.list[comp_id][ arguments[0] ] = false;
              select.push(arguments[0]);
              needRequest = true;

              if (outdated[comp_id] !== undefined  && !~outdated[dsn_id].indexOf(arguments[0])){
                delete outdated[dsn_id];
              }
            }
          });

          if (!needRequest) {
            comp_ids.splice(comp_ids.indexOf(arguments[0]), 1);
            returnList.push( _selectComponentFields(comp_id, args[1]) );
          }

        } else {
          select = args[1];
          scope.list[comp_id] = {};

          angular.forEach(select, function(){
            scope.list[comp_id][arguments[0]] = false;
          });
        }
      });

      if (!comp_ids.length){
        deferred.resolve(returnList);
      } else {
        $http.post('api/components.php', {
          getComponents: comp_ids,
          select: select

        }).then(function() {
          angular.forEach(arguments[0].data, function(){
            _mergeData(arguments[0]);
            returnList.push( _selectComponentFields(arguments[0].comp_id, args[1]) );
          });
          deferred.resolve( returnList );
        }, function() {
          deferred.reject(arguments[0].data);
        });
      }

      return deferred.promise;
    }


    function getContainerData() {
      var deferred = $q.defer();

      var comp_ids = angular.isArray(arguments[0]) ? arguments[0] : [ arguments[0] ];
      var select = arguments[1] ? arguments[1] : [];

      scope.get(comp_ids, select.indexOf('container') === -1 ? select.concat(['container']) : select ).then(function() {
        var getArgs = arguments;
        var containerComponents = [];

        angular.forEach(arguments[0], function() {
          angular.merge(containerComponents, _containerToArray(arguments[0].container) );
        });

        scope.get(containerComponents, select).then(function() {
          deferred.resolve(getArgs[0]);
        });
      });

      return deferred.promise;
    }


    /**
    * @ngdoc method
    * @name clCore.service:$clComponents#search
    * @methodOf clCore.service:$clComponents
    *
    * @description
    *
    *
    *
    * @param {(Object)} search
    *   Object to search againts the calumma components DB
    *
    * @param {(Int)=} limit param
    *
    * @param {(Int)=} offset param
    *
    * @param {(Array)=} select 
    *
    *
    * @return {HttpPromise} Returns a Promise that will be resolved to a response
    * array of components when the request succeeds or fails
    */
    function search() {
      var deferred = $q.defer();

      $http.post('api/components.php', {
        search: arguments[0],
        limit: arguments[1] === undefined ? 20 : arguments[1],
        offset: arguments[2] === undefined ? 0 : arguments[2],
        select: arguments[3] || []

      }).then(function() {
        deferred.resolve( arguments[0].data );
      }, function() {
        deferred.reject(arguments[0].data);
      });

      return deferred.promise;
    }



    /**
    * @ngdoc method
    * @name clCore.service:$clComponents#outdated
    * @methodOf clCore.service:$clComponents
    *
    * @description
    * Mark the requested components as OUT TO DATE, this way the following
    * requests will force a server request to update the content in cache.
    *
    * @param {(String|Array<string>)} comp_id
    *   Components outdated
    *
    * @return {HttpPromise} Returns a Promise that will be resolved to a response
    * array of components when the request succeeds or fails
    */
    function outdatedFn() {
      var deferred = $q.defer();
      var comp_ids = angular.isArray(arguments[0]) ? arguments[0] : [ arguments[0] ];
      var select = [];

      angular.forEach(comp_ids, function() {
        var comp_id = arguments[0];

        if (scope.list[comp_id] !== undefined) {
          angular.forEach(scope.list[ comp_id ], function() {
            if (liveUpdate && arguments[1] !== 'comp_id' && select.indexOf(arguments[1]) === -1) {
              select.push(arguments[1]);
            } else if (outdated[comp_id] === undefined) {
              outdated[comp_id] = [arguments[1]];
            } else if (outdated[comp_id].indexOf(arguments[1]) === -1) {
              outdated[comp_id].push(arguments[1]);
            }
          });

          if (liveUpdate) {
            get(comp_ids, select).then(function() {
              deferred.resolve( arguments[0].data );
            }, function(){
              deferred.reject( arguments[0].data );
            });
          }
        }
      });

      return deferred.promise;
    }


    function _containerToArray() {
      var result = [];

      for (var key in arguments[0]) {
        if ('comp_id' in arguments[0][key]) {
          result.push(arguments[0][key].comp_id);
        }

        if ('container' in arguments[0][key]) {
          result = result.concat(_containerToArray(arguments[0][key].container));
        }
      }
      return result;
    };


    function _mergeData() {
      if (arguments[0]['comp_id']) {
        if (scope.list[arguments[0]['comp_id']] === undefined) {
          scope.list[arguments[0]['comp_id']] = arguments[0];
        } else {
          angular.merge(scope.list[arguments[0]['comp_id']],arguments[0]);
        }
      }
    }

    /*
     * @param String => comp_id
     * @param Array => list of fields requested
     * @return Object => the Components fields requested only
     */
    function _selectComponentFields() {
      if (arguments[1].length === 0) {
        return scope.list[arguments[0]];
      }

      var args = arguments;
      var tmp = {comp_id: args[0]};

      angular.forEach(args[1], function() {
        tmp[ arguments[0] ] = scope.list[ args[0] ][ arguments[0] ];
      });

      return tmp;
    }
  }
}());
