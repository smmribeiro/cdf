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
 * An intuitive Filter Component with many out-of-the-box features:
 * - pluggable selection logic: single-, multi-, and limited-select
 * - automatic handling of groups of options
 * - searchable
 * - extensible via addIns
 * @class FilterComponent
 * @constructor
 */
var FilterComponent;

FilterComponent = (function($, _, Backbone, Dashboards, UnmanagedComponent, TreeFilter) {
  'use strict';

  /*
   * Über-filter: one filter to rule them all
   */

  /**
   * Interface Mixin for a filter
   */
  var IConfiguration, IFilter, Filter;
  IFilter = {

    /**
     * Gets the current selection state
     * @method getValue
     * @public
     * @for FilterComponent
     * @return {Array} List of strings containing the IDs of the selected items,
     * in the same format as they would be written to the parameter
     */
    getValue: function() {
      return this._value;
    },

    /**
     * Updates the selection state of the filter
     * @method setValue
     * @public
     * @for FilterComponent
     * @param {Array} value List of strings containing the IDs of the selected items,
     * which will be written to the parameter
     * @chainable
     */
    setValue: function(value) {
      this.inputDataHandler.setValue(value);
      return this;
    },

    /**
     * Implement's CDF logic for updating the state of the parameter, by
     * invoking Dashboards.processChange()
     * @method processChange
     * @public
     * @for FilterComponent
     * @param {Array} value List of strings containing the IDs of the selected items,
     * in the same format as they would be written to the parameter
     */
    processChange: function(value) {
      this._value = value;
      this.dashboard.processChange(this.name);
      return this;
    }
  };

  /**
   * Interface mixin for the configuration
   */
  IConfiguration = {

    /**
     * Default settings of the component
     * <pre>
     * <code>
     * {
     *   component: {}, // Uses TreeFilter defaults
     *   input: {
     *     defaultModel: {
     *      isDisabled: true
     *     },
     *     indexes: { // layout of the data: column indexes
     *       id: 0,
     *       label: 1,
     *       parentId: 2,
     *       parentLabel: 3,
     *       value: undefined
     *     }
     *   },
     *   output: {}
     * }
     * </code>
     * </pre>
     * @property defaults
     * @for FilterComponent
     * @type {Object}
     */
    defaults: {
      component: {},
      input: {
        defaultModel: {
          isDisabled: true,
          searchPattern: ''
        },
        indexes: {
          id: 0,
          label: 1,
          parentId: 2,
          parentLabel: 3,
          value: 4
        }
      },
      output: {}
    },

    /**
     * Collate and conciliate settings from the following origins:
     * - component's {{#crossLink "FilterComponent/defaults:property"}}{{/crossLink}}
     * - properties set by the user at design time, via the CDE interface
     * - options programmatically defined at run time
     * @method getConfiguration
     * @for FilterComponent
     * @public
     * @return {Object} Returns a configuration object
     */
    getConfiguration: function() {
      var cd = this.componentDefinition;
      var selectionStrategy = cd.multiselect ? 'LimitedSelect' : 'SingleSelect';
      var configuration = {
        input: {},
        output: {},
        component: $.extend(true, {}, TreeFilter.defaults(), TreeFilter.Enum.selectionStrategy[selectionStrategy], {
          target: this.placeholder()
        })
      };
      $.extend(true, configuration, _.result(this, 'defaults'));
      var _getPage = function(page, searchPattern) {
        var deferred = $.Deferred();
        var isPaginated = !!this.query && this.query.getOption('pageSize') > 0;
        var searchServerSide = configuration.component.search.serverSide;

        /*
         * Handle empty datasets
         */
        if (!searchServerSide && !isPaginated) {
          deferred.resolve({});
          return deferred;
        }
        var successCallback = _.bind(function(data) {
          this.inputDataHandler.updateModel(data);
          this.model.setBusy(false);
          deferred.resolve(data);
          return data;
        }, this);
        var errorCallback = _.bind(function () {
          this.model.setBusy(false);
          deferred.reject();
        }, this);
        this.model.setBusy(true);
        try {
          var pattern = _.isEmpty(searchPattern) ? '' : searchPattern;
          this.query.setSearchPattern(pattern);
          switch (page) {
            case 'previous':
              if (this.query.getOption('page') !== 0) {
                this.query.previousPage(successCallback);
              }
              break;
            case 'next':
              this.query.nextPage(successCallback);
              break;
            default:
              this.query.setOption('page', page);
              this.query.doQuery(successCallback, errorCallback);
          }
        } catch (_error) {
          deferred.reject({});
          this.model.setBusy(false);
        }
        return deferred;
      };
      var styles = [];
      if (!cd.showIcons) {
        styles.push('no-icons');
      }

      /**
       * validate pagination
       */
      var pageSize = Infinity;
      if (this.queryDefinition.pageSize != null) {
        if (_.isFinite(this.queryDefinition.pageSize) && this.queryDefinition.pageSize > 0) {
          pageSize = this.queryDefinition.pageSize;
        }
      }
      $.extend(true, configuration.component, {
        pagination: {
          pageSize: pageSize,
          getPage: _.bind(_getPage, this)
        },
        selectionStrategy: {
          limit: _.isNumber(cd.selectionLimit) ? cd.selectionLimit : Infinity
        },
        Root: {
          options: {
            styles: styles,
            alwaysExpanded: cd.alwaysExpanded,
            showFilter: cd.showFilter,
            useOverlay: cd.useOverlay
          },
          strings: {
            title: cd.title
          }
        }
      });

      /**
       * Localize strings, if they are defined
       */
      var i18nMap = this.dashboard.i18nSupport.map;
      var that = this;
      _.each(['Root', 'Group', 'Item'], function(level) {
        return _.each(configuration.component[level].strings, function(value, token, list) {
          var fullToken;
          fullToken = "filter_" + level + "_" + token;
          if (_.has(i18nMap, fullToken)) {
            return list[token] = that.dashboard.i18nSupport.prop(fullToken);
          }
        });
      });
      var selectionStrategyConfig = configuration.component.selectionStrategy;
      var strategy = new TreeFilter.SelectionStrategies[selectionStrategyConfig.type](selectionStrategyConfig);
      configuration.component.selectionStrategy.strategy = strategy;

      /**
       * Patches
       */
      if (selectionStrategyConfig.type !== 'SingleSelect') {
        if (cd.showButtonOnlyThis === true || cd.showButtonOnlyThis === false) {
          configuration.component.Root.options.showButtonOnlyThis = cd.showButtonOnlyThis;
          configuration.component.Group.options.showButtonOnlyThis = cd.showButtonOnlyThis;
          configuration.component.Item.options.showButtonOnlyThis = cd.showButtonOnlyThis;
        }
      }

      /**
       *  Add input/output options to configuration object
       */
      $.extend(true, configuration.input, this.componentInput, {
        query: this.query
      });
      $.extend(true, configuration.output, this.componentOutput);
      configuration = $.extend(true, configuration, this._mapAddInsToConfiguration(), _.result(this, 'options'));
      return configuration;
    },

    /**
     * List of add-ins to be processed by the component
     * <pre>
     * <code>
     * {
     *   postUpdate:  [], // e.g. 'accordion'
     *   renderRootHeader: [],
     *   renderRootSelection: [], // e.g. ['sumSelected', 'notificationSelectionLimit']
     *   renderRootFooter: [],
     *   renderGroupHeader: [],
     *   renderGroupSelection:[],
     *   renderGroupFooter: [],
     *   renderItemSelection: [],
     *   sortGroup: [],
     *   sortItem: []
     * }
     * </pre>
     * </code>
     * @property addIns
     * @type Object
     * @public
     */
    _mapAddInsToConfiguration: function() {

      /**
       * Traverse the list of declared addIns,
       * Get the addIns, the user-defined options, wrap this into a function
       * Create a hash map { slot: [ function($tgt, model, options) ]}
       */
      var addInHash, addInList, configuration, getOrCreateEntry, that;
      that = this;
      addInList = _.chain(this.addIns).map(function(list, slot) {
        var addIns;
        addIns = _.chain(list).map(function(name) {
          var addIn, addInName, addInOptions;
          addInName = name.trim();
          addIn = that.getAddIn(slot, addInName);
          if (addIn != null) {
            addInOptions = that.getAddInOptions(slot, addInName);
            return function($tgt, model, options) {
              var st;
              st = {
                model: model,
                configuration: options
              };
              return addIn.call($tgt, st, addInOptions);
            };
          } else {
            return null;
          }
        }).compact().value();
        return [slot, addIns];
      }).object().value();

      /**
       * Place the functions in the correct location in the configuration object
       */
      addInHash = {
        postUpdate: 'input.hooks.postUpdate',
        renderRootHeader: 'component.Root.renderers.header',
        renderRootSelection: 'component.Root.renderers.selection',
        renderRootFooter: 'component.Root.renderers.footer',
        renderGroupSelection: 'component.Group.renderers.selection',
        renderItemSelection: 'component.Item.renderers.selection',
        sortItem: 'component.Item.sorter',
        sortGroup: 'component.Group.sorter',
        outputFormat: 'output.outputFormat'
      };
      configuration = {};
      getOrCreateEntry = function(memo, key) {
        if (memo[key] != null) {
          return memo[key];
        } else {
          return memo[key] = {};
        }
      };
      _.each(addInList, function(functionList, addInSlot) {

        /**
         * I just wish we could do something like
         *   configuration['compoent.Root.renderers.selection'] = foo
         */
        var childKey, configAddress, parent, parentAddress;
        if (!_.isEmpty(functionList)) {
          configAddress = addInHash[addInSlot].split('.');
          parentAddress = _.initial(configAddress);
          childKey = _.last(configAddress);
          parent = _.reduce(parentAddress, getOrCreateEntry, configuration);
          return parent[childKey] = addInList[addInSlot];
        }
      });
      return configuration;
    }
  };
  Filter = UnmanagedComponent.extend(IFilter).extend(IConfiguration).extend({

    /*
     * properties (data inputs)
    queryDefinition: undefined # move this to componentInput, if possible
    parameters: []
    componentInput:
      queryParameters: undefined
      valuesArray: undefined # does
      inputParameter: undefined
    
    componentOutput:
      outputParameter: undefined
      preOutput: undefined
     * configuration options (view inputs)
    componentDefinition:
      addIns:
        importFromQuery: []
        importFromParameter: []
        importFromValuesArray: []
     */

    /**
     * Object responsible for storing the MVC model, which contains both the data and the state of the component
     * @property model
     * @public
     * @type SelectionTree
     */
    model: void 0,

    /**
     * Object responsible for managing the MVC hierarchy of views and controllers associated with the model
     * @property manager
     * @public
     * @type Manager
     */
    manager: void 0,

    /**
     * Object that handles writing to the MVC model
     * @property inputDataHandler
     * @public
     * @type Input
     */
    inputDataHandler: void 0,

    /**
     * Object that handles reading from the MVC model.
     * @property outputDataHandler
     * @public
     * @type Output
     */
    outputDataHandler: void 0,
    update: function () {
      if (!_.isEmpty(this.dashboard.detectQueryType(this.queryDefinition))) {

        this.triggerQuery(this.queryDefinition, _.bind(this._render, this));

      } else if (this.componentInput.inputParameter && !_.isEmpty(this.componentInput.inputParameter)) {

        var paramDataCallback = _.bind(function () {
          var data = this.dashboard.getParameterValue(this.componentInput.inputParameter);
          this._render(data);
        }, this);

        this.synchronous(paramDataCallback, null);

      } else {

        var staticDataCallback = _.bind(function () {
          this._render(this.componentInput.valuesArray);
        }, this);

        this.synchronous(staticDataCallback, null);
      }
    },

    _render: function(data) {
      this.initialize();
      this.onDataReady(data);
    },
    close: function() {
      if (this.manager != null) {
        this.manager.empty();
      }
      if (this.model != null) {
        this.model.stopListening().off();
      }
      return this.stopListening();
    },

    /**
     * Initialize the component by creating new instances of the main objects:
     * - model
     * - MVC manager
     * - input data handler
     * - output data handler
    #
     * @method initialize
     * @return {Promise} Returns a $.Deferred().promise() object
     */
    initialize: function() {

      /**
       * Transform user-defined CDF settings to our own configuration object
       */
      var configuration = this.getConfiguration();
      this.close();

      /**
       * Initialize our little MVC world
       */
      this.model = new TreeFilter.Models.SelectionTree(configuration.input.defaultModel);
      this.model.set('matcher', configuration.component.search.matcher);

      this.manager = new TreeFilter.Controllers.Manager({
        model: this.model,
        configuration: configuration.component
      });

      /**
       * Initialize the CDF interface
       */
      this.inputDataHandler = new TreeFilter.DataHandlers.Input({
        model: this.model,
        options: configuration.input
      });
      this.outputDataHandler = new TreeFilter.DataHandlers.Output({
        model: this.model,
        options: configuration.output
      });
      this.listenTo(this.outputDataHandler, 'changed', this.processChange);
      
      return configuration;
    },

    /**
     * Launch an event equivalent to postExecution
     */

    /**
     * @method onDataReady
     * @public
     * @chainable
     */
    onDataReady: function(data) {
      var currentSelection;
      this.inputDataHandler.updateModel(data);
      if (this.parameter) {
        currentSelection = this.dashboard.getParameterValue(this.parameter);
        this.setValue(currentSelection);
      }

      /**
       * @event getData:success
       */
      this.trigger('getData:success');
      return this;
    }
  }, {
    help: function() {
      return "Filter component";
    }
  });

  // Point the HTML sanitizer to that of CDF.
  TreeFilter.HtmlSanitizer = Dashboards.sanitizeHtml;

  return Filter;
})($, _, Backbone, Dashboards, UnmanagedComponent, TreeFilter);
