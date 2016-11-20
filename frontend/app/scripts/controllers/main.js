'use strict';

/**
 * @ngdoc function
 * @name frontendApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the frontendApp
 */
angular.module('frontendApp')
  .controller('MainCtrl', [ '$scope', 'dscache','$timeout', 'config', 'api','app','$rootScope',
    function ($scope, dscache, $timeout, config, api, app, $rootScope) {

      $scope.literals = config.LITERALS;
      $scope.spotlights = [];
      $scope.models = [];
      $scope.categories = {};
      $scope.filter = {
        category: null
        , model: null
      };

      api.getSpotlights(function(err, o){
        if(err){
          console.log('couldn\'t load spotlights: %j', err);
        }
        else{
          if(0 < o.length){
            Array.prototype.push.apply($scope.spotlights, o);
            console.log('models', $scope.spotlights);
          }
        console.log('loaded spotlights cache with %d items', o.length);
        }
      });

     $scope.datasource = function(){

        var minIndex = 0;
        var maxIndex = 0;

        var setFilter = function(cf){
          dscache.setFilter(cf);
        };

        var resetIndexes = function(){
          minIndex = 0;
          maxIndex = 0;
        };

        var partArrayIds2String= function(a){
          var r = null;
          for(var i = 0; i < a.length; i++){
            if(null == r)
              r = a[i]._id;
            else
              r = r + ', ' + a[i]._id;
          }
          return r;
        };

        var get = function(index, count, success){

          console.log('[datasource.get] asking for index: %d and count: %d', index, count);

          $timeout(
            dscache.getByIndex(index, count, function(err, r){
              if(err)
                console.log(err);
              else {
                console.log('[datasource.get] got %d parts', r.length);
                if(0 < r.length){
                  if(index < minIndex)
                    minIndex=index;
                  if(maxIndex < index + r.length -1)
                    maxIndex = index + r.length -1;

                  console.log('[datasource.get] minIndex: %d | maxIndex: %d | got %d parts !', minIndex, maxIndex, r.length);
                  console.log('[datasource.get] %s', partArrayIds2String(r));
                }
                success(r);
              }
            }), 1000);

        };

        return {
          get: get
          , minIndex: minIndex
          , maxIndex: maxIndex
          , setFilter: setFilter
          , resetIndexes: resetIndexes
        };
      }();

      var filterHasChanged = $rootScope.$on('filterUpdate', function(event, data){
        console.log('[MainCtrl.filterHasChanged]: %s', JSON.stringify(data));
        $scope.datasource.setFilter(data);
        $scope.datasource.resetIndexes();
        return $scope.scrollAdapter.reload(0);
      });

      $scope.$on('$destroy', filterHasChanged);

      $scope.$watchCollection('filter', function (newValue, oldValue ) {
          $rootScope.$emit('filterUpdate', newValue);
        }
      );


      api.getCategories(function(err, o){
        if(err){
          console.log('couldn\'t load categories: %j', err);
        }
        else{
          if(0 < o.length)
            Array.prototype.push.apply($scope.categories, o);

          console.log('loaded categories cache with %d items', o.length);
        }
      });

      api.getModels(function(err, o){
        if(err){
          console.log('couldn\'t load models: %j', err);
        }
        else{
          if(0 < o.length){
            Array.prototype.push.apply($scope.models, o);
            console.log('models', $scope.models);
          }

          console.log('loaded models cache with %d items', o.length);
        }
      });



    }]);
