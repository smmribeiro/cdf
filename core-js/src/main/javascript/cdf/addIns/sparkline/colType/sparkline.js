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


define([
  '../../../AddIn',
  '../sparklineBase',
  '../../../Dashboard',
  '../../../Logger',
  '../../../lib/jquery',
  'amd!../../../lib/datatables',
  'amd!../../../lib/jquery.sparkline',
  'css!./theme/sparkline'
], function(AddIn, sparklineBase, Dashboard, Logger, $) {

  var sparkline = new AddIn($.extend(true, {}, sparklineBase, {

    defaults: {
      type: 'line'
    },

    init: function() {
      // Register this for datatables sort
      var myself = this;
      $.fn.dataTableExt.oSort[this.name + '-asc'] = function(a, b) {
        return myself.sort(a, b)
      };
      $.fn.dataTableExt.oSort[this.name + '-desc'] = function(a, b) {
        return myself.sort(b, a)
      };

    },

    sort: function(a, b) {
      return this.sumStrArray(a) - this.sumStrArray(b);
    },

    sumStrArray: function(arr) {
      return arr.split(',').reduce(function(prev, curr, index, array) {
        Logger.log("Current " + curr + "; prev " +  prev);
        return parseFloat(curr) + (typeof(prev) === 'number' ? prev : parseFloat(prev));
      });
    },

    getData: function(st, opt) {
      var data = st.value.split(/,/);

      // Trim values
      if(opt.trim) {
        if(opt.trim.type == "both" || opt.trim.type == "right") {
          for(var i = data.length - 1; i >= 0; i--) {
            if($.inArray(data[i].trim(), opt.trim.values) !=- 1) {
              data.splice(i, 1);
            }
          }

        }
        if(opt.trim.type == "both" || opt.trim.type == "left") {
          for(var i = 0; i < data.length; i++) {
            if($.inArray(data[i].trim(), opt.trim.values) !=- 1) {
              data.splice(i, 1);
            }
          }
        }
      }

      return data;
    }
  }));

  Dashboard.registerGlobalAddIn("Table", "colType", sparkline);

  return sparkline;

});
