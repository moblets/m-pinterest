/* eslint no-undef: [0]*/
module.exports = {
  title: "mPinterest",
  style: "m-pinterest.less",
  template: 'm-pinterest.html',
  i18n: {
    pt: "lang/pt-BR.json",
    en: "lang/en-US.json"
  },
  link: function() {

  },
   controller: function(
    $scope,
    $rootScope,
    $filter,
    $timeout,
    $mState,
    $stateParams,
    $mDataLoader,
    $cordovaNetwork,
    $element,
    $mPlatform,
    $ionicModal,
    $http,
    $ionicScrollDelegate
  ) {
    var dataLoadOptions;
    var list = {
      /**
       * Set the view and update the needed parameters
       * @param  {object} data Data received from Moblets backend
       * @param  {boolean} more If called by "more" function, it will add the
       * data to the items array
       */
      setView: function(data, more) {
        if (isDefined(data)) {
          $scope.error = false;
          $scope.emptyData = false;

          // If it was called from the "more" function, concatenate the items
          $scope.items = isDefined($scope.items) ? $scope.items.concat(data) : data;

          // Set "noContent" if the items lenght = 0
          $scope.moblet.noContent = $scope.items === undefined ||
            $scope.items.length === 0;

          // set empty itens if no content
          if ($scope.moblet.noContent) {
            $scope.items = [];
          }

          // Check if the page is loading the list or a detail
          $scope.isDetail = list.isDetail();

          // Disable the "more" function if the API don't have more items
          $scope.more = (data.hasMoreItems && !$scope.isDetail) ? list.more : undefined;
        } else {
          $scope.error = true;
          $scope.emptyData = true;
        }


        // Broadcast complete refresh and infinite scroll
        $rootScope.$broadcast('scroll.refreshComplete');
        $rootScope.$broadcast('scroll.infiniteScrollComplete');

        // If the view is showing the detail, call showDetail
        if ($scope.isDetail) {
          list.showDetail();
        }

        // Remove the loading animation
        $scope.moblet.isLoading = false;
      },
      /**
       * Check if the view is showing a detail or the list. The function checks
       * if $stateParams.detail is set.
       * @return {boolean} True if the view must show a detail.
       */
      isDetail: function() {
        return $stateParams.detail !== "";
      },
      /**
       * Show the detail getting the index from $stateParams.detail. Set "item"
       * to the selected detail
       */
      showDetail: function(detailIndex) {
        if (isDefined($stateParams.detail) && $stateParams.detail !== "") {
          // $scope.imageH = calculatedImageHeight();
          //  $scope.imageH = 400;
          var itemIndex = _.findIndex($scope.items, function(item) {
            return item.id.toString() === $stateParams.detail;
          });
          if (itemIndex === -1) {
            dataLoadOptions = {
              offset: $scope.items === undefined ? 0 : $scope.items.length,
              items: 25,
              cache: false
            };
            list.load(false, function() {
              list.showDetail();
            });
          } else {
            $scope.detail = $scope.items[itemIndex];
            $scope.detail.index = itemIndex;
          }
        } else if (isDefined(detailIndex)) {
          $scope.detail = $scope.items[detailIndex];
          $scope.detail.index = detailIndex;
        }
      },
      /**
       * Load data from the Moblets backend:
       * - show the page loader if it's called by init (sets showLoader to true)
       * - Use $mDataLoader.load to get the moblet data from Moblets backend.
       * 	 The parameters passed to $mDataLoader.load are:
       * 	 - $scope.moblet - the moblet created in the init function
       * 	 - false - A boolean that sets if you want to load data from the
       * 	   device storage or from the Moblets API
       * 	 - dataLoadOptions - An object with parameters for pagination
       * @param  {boolean} showLoader Boolean to determine if the page loader
       * is active
       * @param {function} callback Callback
       */
      load: function(showLoader, callback) {
        if ($stateParams.detail === '') {
          $stateParams.pageTitle = null;
        }
        $scope.moblet.isLoading = showLoader || false;
        // Reset the pagination
        if (showLoader === true || showLoader === undefined) {
          dataLoadOptions.offset = 0;
        }
        // mDataLoader also saves the response in the local cache. It will be
        // used by the "showDetail" function
        $mDataLoader.load($scope.moblet, dataLoadOptions)
          .then(function(data) {
            // if(isDefined(data.username) && isDefined(data.board) && isDefined(data.token) &&
            // data.username !== "" && data.board !== "" && data.token !== ""){
            //   var url = "https://api.pinterest.com/v1/boards/"+ data.username + "/" +  data.board + "/pins/?access_token=" + data.token;
            //   url += "&fields=id%2Clink%2Cnote%2Curl%2Cattribution%2Coriginal_link%2Ccolor%2Cboard%2Ccounts%2Ccreated_at%2Ccreator%2Cimage%2Cmedia%2Cmetadata";
            if(isDefined(data.username) && data.username !== ""){
              if(isDefined(data.board) && data.board !== "") {
                var url = "https://br.pinterest.com/" + data.username + "/" +  data.board + ".rss";
              } else {
                var url = "https://br.pinterest.com/" + data.username + "/feed.rss";
              }
              if ($mPlatform.isWebView() && $cordovaNetwork.isOffline()) {
                $scope.moblet.noContent = true;
                $scope.moblet.isLoading = false;
              } else {
                list.pins(url, callback);
              }
              
            } else {
              $scope.moblet.isLoading = false;
              $scope.moblet.noContent = true;
            }
          }
        );
      },

      pins: function(url, callback){
        $http.get(url, { withCredentials: false }).then(function(pins){
            if(pins.data.page.next !== null){
              list.setView(pins.data.data);
              list.pins(pins.data.page.next, callback);
            } else {
              list.setView(pins.data.data);
              if (typeof callback === 'function') {
                callback();
              }
            }
          })
      },  
      /**
       * Load more data from the backend if there are more items.
       * - Update the offset summing the number of items
       - Use $mDataLoader.load to get the moblet data from Moblets backend.
       * 	 The parameters passed to $mDataLoader.load are:
       * 	 - $scope.moblet - the moblet created in the init function
       * 	 - false - A boolean that sets if you want to load data from the
       * 	   device storage or from the Moblets API
       * 	 - dataLoadOptions - An object with parameters for pagination
       */
      more: function() {
        // Add the items to the offset
        dataLoadOptions.offset += dataLoadOptions.items;

        $mDataLoader.load($scope.moblet, dataLoadOptions)
          .then(function(data) {
            list.setView(data, true);
            $timeout(function() {}, 500);
          });
      },
      /**
       * Initiate the list moblet:
       * - put the list.load function in the $scope
       * - run list.load function
       */
      /*
       * TODO go to detail if url is called
       */
      init: function() {
        dataLoadOptions = {
          cache: false
        };
        $scope.load(true);
        $scope.reload = function(){

          if($stateParams.detail !== ""){
            $scope.load();
          } else {
            $rootScope.$broadcast('scroll.refreshComplete');
            $rootScope.$broadcast('scroll.infiniteScrollComplete');
          } 
          
        }
      }
    };

    var listItem = {



      next: function(detail) {
        if (detail.index !== -1 && detail.index < $scope.items.length - 1) {
          $scope.nextAnimation = true;
          $scope.nextDetail = $scope.items[detail.index + 1];
          $scope.nextDetail.index = detail.index + 1;
          $timeout(function() {
            $scope.detail = $scope.nextDetail;
            $scope.nextAnimation = false;
          }, 500);
        }
      },
      prev: function(detail) {
        if (detail.index > 0) {
          $scope.prevAnimation = true;
          $scope.prevDetail = $scope.items[detail.index - 1];
          $scope.prevDetail.index = detail.index - 1;
          $timeout(function() {
            $scope.detail = $scope.prevDetail;
            $scope.prevAnimation = false;
          }, 500);
        }
      },
      showPrev: function(detail) {
        return isDefined(detail) ? detail.index > 0 : false;
      },
      showNext: function(detail) {
        return isDefined(detail) ? detail.index !== -1 && detail.index < $scope.items.length - 1 : false;
      },
      getDetailImage: function(detail) {
        var style;
        if(isDefined(detail) && isDefined(detail.image)){
          style = "url('" + detail.image.original.url + "')";
        } else {
          style = "";
        }
        return {
          "background-image": style
        };
      },
      goTo: function(detail) {
        $stateParams.pageTitle = detail.note;
        $stateParams.detail = detail.id;
        $mState.go('u-moblets' ,'page', {
          detail: detail.id
        });
      }
    };

    var modal = {
      created: function() {
        $ionicModal.fromTemplateUrl('malbum-zoom-modal.html', {
          scope: $scope,
          hardwareBackButtonClose:true,
          animation: 'scale-in'
        }).then(function(modal) {
          $scope.modal = modal;
          $scope.modal.hide();
        });
        
        $scope.openModal = function() {
          $scope.modal.show();
        };
        
        $scope.closeModal = function() {
          $scope.modal.hide();
          $timeout(function(){
            $ionicScrollDelegate.$getByHandle("m-album-zoom-scroll").zoomTo(1);
          }, 500);
        };
        
        $scope.destroyModal = function() {
          $scope.modal.remove();
        };
        
      }
    }
    
    $scope.stripHtml = function(str) {
      return str.replace(/<[^>]+>/ig, " ");
    };

    window.malbumImageLoaded = function(element) {
      element.parentElement.classList.add("loaded");
    }

    $scope.load = list.load;
    $scope.init = list.init;
    $scope.nextDetail = {};
    $scope.prevDetail = {};
    $scope.goTo = listItem.goTo;
    $scope.getDetailImage = listItem.getDetailImage;
    $scope.next = listItem.next;
    $scope.prev = listItem.prev;
    $scope.showNext = listItem.showNext;
    $scope.showPrev = listItem.showPrev;
    modal.created();
    
    $scope.$on('$stateChangeStart', $scope.destroyModal);
    $scope.$on('$destroy', $scope.destroyModal);
    list.init();

  }
};
