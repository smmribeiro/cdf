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
  '../dashboard/Dashboard.ext',
  '../dashboard/Utils',
  './NavigatorBaseComponent',
  'pentaho/environment',
  '../lib/jquery',
  'amd!../lib/jquery.fancybox'
], function(DashboardExt, Utils, NavigatorBaseComponent, environment, $) {

  return NavigatorBaseComponent.extend({
    update: function() {
      var myself = this;
      var path = this.mode != 4
        ? (NavigatorBaseComponent.path || Utils.getPathParameter(NavigatorBaseComponent.path))
        : NavigatorBaseComponent.getParentPath();
      myself.draw(path);
    },

    draw: function(path) {
      var myself = this;
      $.getJSON(DashboardExt.getJSONSolution() + "?mode=contentList" + (path != "" ? "&path=" + path : ""), function(json) {
        myself.processContentListResponse(json, path);
      });
    },

    processContentListResponse : function(json, path) {

      // 1 - Get my solution and path from the object;
      // 2 - get the content

      $("#" + this.htmlObject).empty();

      var files = json.content || [];
      files.sort(function(a,b) {
        var _a = (a.type === "FOLDER" ? "000" : "") + a.name;
        var _b = (b.type === "FOLDER" ? "000" : "") + b.name;
        return _a > _b;
      });

      // Create the outmost ul
      var container = $("<ul></ul>").attr("id", "contentList-" + this.name).appendTo("#" + this.htmlObject);

      // We need to append the parent dir
      if(this.mode !== 1 && this.mode !== 4
        && (NavigatorBaseComponent.path || Utils.getPathParameter(NavigatorBaseComponent.path))) {

        var parentDir =  {
          name: "Up",
          title: "Up",
          type: "FOLDER",
          description: "Go to parent directory",
          visible: true,
          solution: NavigatorBaseComponent.getParentSolution(),
          path: path.substring(0, path.lastIndexOf("/"))
        };

        files.reverse().push(parentDir);
        files.reverse();
      }

      var myself = this;
      
      $.each(files, function(i, val) {
        // We want to iterate only depending on the options:
        // 1 - Files only
        // 2 - Folders only
        // 3 - Files and folders

        if(myself.mode == 1 && this.type == "FOLDER") {
          return true; // skip
        }

        if(myself.mode == 2 && this.type != "FOLDER") {
          return true; // skip
        }

        if(this.visible == true) {
          var cls = "";
          var target = "";
          var href = "";

          var anchor;
      
          if(this.type == "FOLDER") {
            cls = "folder";

            anchor = $("<a></a>")
              .attr("target", target)
              .attr("title", this.description)
              .attr("parentPath", val.path)
              .text(this.title).click(function() {
                myself.draw($(this).attr("parentPath"));
              });
          } else {
            var path = environment.server.root.toString();
            if(this.url != undefined) {
              //cls = "folder";
              cls = "action greybox";
              href = (path.substring(path.length - 1) == '/')
                ? path.substring(0, path.length - 1) + this.url 
                : path + this.url;
            } else {
              cls = "action greybox";
              href = (path.substring(path.length - 1) == '/')
                ? path.substring(0, path.length - 1) + this.link 
                : path + this.link;
            }

            anchor = $("<a></a>")
              .attr("target", target)
              .attr("title", this.description)
              .text(this.title)
              .attr("href", href);
          }   
          $("<li></li>")
            .attr("class", cls)
            .appendTo(container)
            .append(anchor);   
        }

      });

      $('#contentList-' + this.name + ' a').tooltip({showURL: false});
      $("li.greybox a").click(function() {

        var _href = this.href.replace(/'/g, "&#39;");
        $.fancybox.open({
          src: _href,
          type: "iframe",
          baseClass: "cdf-fancybox cdf-fancybox-iframe",
          btnTpl: {
            smallBtn:
                '<button type="button" data-fancybox-close class="fancybox-button fancybox-close-small" title="close"></button>'
          }
        },
        {
          toolbar  : false,
          smallBtn : true,
          iframe:{
            preload: false,
            css: {
              width: $(window).width(),
              height: $(window).height(),
              "max-width": "100%",
              "max-height": "100%"
            }
          }
        });

        return false;
      });
    }
  });

});
