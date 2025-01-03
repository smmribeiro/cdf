/*! ******************************************************************************
 *
 * Pentaho
 *
 * Copyright (C) 2024 by Hitachi Vantara, LLC : http://www.pentaho.com
 *
 * Use of this software is governed by the Business Source License included
 * in the LICENSE.TXT file.
 *
 * Change Date: 2029-07-20
 ******************************************************************************/

/**
 * @summary MCustomScrollBarEngineImplementation implementation of ScrollBarHandler
 * @description MCustomScrollBarEngineImplementation implementation of ScrollBarHandler
 */
var MCustomScrollBarEngine;
(function(AbstractScrollBarHandler, $){

  MCustomScrollBarEngine = AbstractScrollBarHandler.extend({
    scrollbar: null,
    constructor: function (view) {
      var options = $.extend(true, {}, view.config.view.scrollbar.options, {
        callbacks: {
          onTotalScroll: function () {
            return view.trigger('scroll:reached:bottom', view.model);
          },
          onTotalScrollBack: function () {
            return view.trigger('scroll:reached:top', view.model);
          }
        }
      });
      this.scrollbar = view.$(view.config.view.slots.children).parent().mCustomScrollbar(options);
    },
    scrollToPosition: function(position) {
      this.scrollbar.mCustomScrollbar("scrollTo",position,{callbacks:false});
    }
  });
})(AbstractScrollBarHandler, $);

