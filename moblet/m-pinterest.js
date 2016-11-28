/* eslint no-undef: [0]*/
module.exports = {
  title: "mPinterest",
  style: "m-pinterest.less",
  template: 'm-pinterest.html',
  i18n: {
    pt: "lang/pt-BR.json",
    en: "lang/en-US.json"
  },
  link: function() {},
  controller: function(
    $scope,
    $rootScope,
    $filter,
    $timeout,
    $state,
    $stateParams,
    $mDataLoader,
    $element,
    $ionicModal,
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
          $scope.items = (more) ? $scope.items.concat(data.items) : data.items;

          // Set "noContent" if the items lenght = 0
          $scope.noContent = $scope.items === undefined ||
            $scope.items.length === 0;

          // set empty itens if no content
          if ($scope.noContent) {
            $scope.items = [];
          }

          // Check if the page is loading the list or a detail
          $scope.isDetail = list.isDetail();

          // Disable the "more" function if the API don't have more items
          $scope.more = (data.hasMoreItems) ? list.more : undefined;
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
        $scope.isLoading = false;
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
          $scope.imageH = calculatedImageHeight();
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
        $scope.isLoading = showLoader || false;
        // Reset the pagination
        if (showLoader === true || showLoader === undefined) {
          dataLoadOptions.offset = 0;
        }
        // mDataLoader also saves the response in the local cache. It will be
        // used by the "showDetail" function
        $mDataLoader.load($scope.moblet, dataLoadOptions)
          .then(function(data) {
            list.setView(data);
            if (typeof callback === 'function') {
              callback();
            }
          }
        );
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
          offset: 0,
          items: 25,
          listKey: 'items',
          cache: ($stateParams.detail !== "")
        };
        $scope.load(true);
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
        return detail.index > 0;
      },
      showNext: function(detail) {
        return detail.index !== -1 && detail.index < $scope.items.length - 1;
      },
      getDetailImage: function(detail) {
        return {
          "background-image": "url('" + detail.image + "')"
        };
      },
      goTo: function(detail) {
        $stateParams.pageTitle = detail.title;
        $stateParams.detail = detail.id;
        $state.go('pages', $stateParams);
      }
    };

    var modal = {
      created: function() {
        $ionicModal.fromTemplateUrl('mpinterest-zoom-modal.html', {
          scope: $scope,
          hardwareBackButtonClose:true,
          animation: 'scale-in'
        }).then(function(modal) {
          $scope.modal = modal;
        });
        $scope.$on('$destroy', function() {
          $scope.modal.remove();
        });
        $scope.openModal = function() {
          $scope.modal.show();
        };
        $scope.closeModal = function() {
          $scope.modal.hide();
          $timeout(function(){
            $ionicScrollDelegate.$getByHandle("m-pinterest-zoom-scroll").zoomTo(1);
          }, 500);
        };
      }
    }

    $scope.stripHtml = function(str) {
      return str.replace(/<[^>]+>/ig, " ");
    };

    function calculatedImageHeight() {
      console.log($element);
      var frame = parseInt(window.getComputedStyle(document.querySelector("ion-nav-view .pane:last-child .scroll")).height);
      var descount = 5 * (100 / document.documentElement.clientWidth) + 90;
      return frame - descount + "px"
    }

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
    list.init();
  }
};
