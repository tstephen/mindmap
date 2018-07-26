/*
 *  MindMapper - web based mind mapping tool.
 *  Copyright (C) 2018 Tim Stephenson
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */
var $mm = (function () {
  var parser = new DOMParser();
  var serializer = new XMLSerializer();
  var transformer = new XSLTProcessor();
  var me = {
    fileName: 'mind-map.mm',
    readOnly: false,
    scale: 1.0,
    scaleStep: 0.25,
    selectedElement: false,
    server: 'https://mindmapper.knowprocess.com',
    svgContainer: document.getElementById('svg-content')
  };

  function download() {
    var data = serializer.serializeToString(me.modelDom);
    if (data.indexOf('xml-stylesheet') == -1) {
      console.log('adding xsl stylesheet to render mind map');
      data = data.replace(/<map/, '<?xml-stylesheet type="text/xsl" href="'+me.server+'/xslt/mm2svg.xslt" alternate="no" ?><map')
      if (!me.fileName.endsWith('.svg')) me.fileName += '.svg';
    }
    var file = new Blob([data], {type: 'text/xml'});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, me.fileName);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = me.fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
  }

  function displayContents(contents) {
    document.getElementById('raw-content').textContent = contents;
    renderSvg();
    makeDraggable(me.svgContainer);

    document.querySelectorAll('.loaded-btn').forEach(function(el) {
      el.setAttribute('style','display:inline');
    });
  }

  function drag(evt) {
    console.log('drag');
    if (me.selectedElement) {
      evt.preventDefault();
      var coord = getMousePosition(evt);
      switch (me.selectedElement.tagName) {
      case 'ellipse':
        if (evt.target.nextElementSibling != undefined
            && evt.target.nextElementSibling.tagName == 'text') {
          var dx = me.selectedElement.getAttributeNS(null, "cx")
              - evt.target.nextElementSibling.getAttributeNS(null, "x");
          var dy = me.selectedElement.getAttributeNS(null, "cy")
              - evt.target.nextElementSibling.getAttributeNS(null, "y");
          evt.target.nextElementSibling.setAttributeNS(null, "x", coord.x-dx);
          evt.target.nextElementSibling.setAttributeNS(null, "y", coord.y-dy);
        }
        me.selectedElement.setAttributeNS(null, "cx", coord.x);
        me.selectedElement.setAttributeNS(null, "cy", coord.y);
        var modelEl = me.modelDom.querySelector('[ID="'+evt.target.getAttribute('id')+'"] Bounds');
        if (modelEl != undefined) {
          modelEl.setAttribute('x', coord.x);
          modelEl.setAttribute('y', coord.y);
        }
        break;
      case 'line':
        if (evt.target.nextElementSibling != undefined
            && evt.target.nextElementSibling.tagName == 'text') {
          evt.target.nextElementSibling.setAttributeNS(null, "x", coord.x);
          evt.target.nextElementSibling.setAttributeNS(null, "y", coord.y);
        }
        me.selectedElement.setAttributeNS(null, "x1", coord.x);
        me.selectedElement.setAttributeNS(null, "y1", coord.y);
        var modelEl = me.modelDom.querySelector('[ID="'+evt.target.getAttribute('id')+'"] Bounds');
        if (modelEl != undefined) {
          modelEl.setAttribute('x', coord.x);
          modelEl.setAttribute('y', coord.y);
        }
        break;
      case 'rect':
        if (evt.target.nextElementSibling != undefined
            && evt.target.nextElementSibling.tagName == 'text') {
          evt.target.nextElementSibling.setAttributeNS(null, "x", coord.x);
          evt.target.nextElementSibling.setAttributeNS(null, "y", coord.y);
        }
        me.selectedElement.setAttributeNS(null, "x", coord.x);
        me.selectedElement.setAttributeNS(null, "y", coord.y);
        var modelEl = me.modelDom.querySelector('[ID="'+evt.target.getAttribute('id')+'"] Bounds');
        if (modelEl != undefined) {
          modelEl.setAttribute('x', coord.x);
          modelEl.setAttribute('y', coord.y);
        }
        break;
      case 'text':
        var coord = getMousePosition(evt);
        me.selectedElement.setAttributeNS(null, "x", coord.x);
        me.selectedElement.setAttributeNS(null, "y", coord.y);
        break;
      default:
        console.warn('No drag support for '+me.selectedElement.tagName);
      }
    }
  }

  function endDrag(evt) {
    console.log('endDrag');
    renderSvg();
    me.selectedElement = null;
  }

  function fetchRenderer() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', me.server+'/xslt/mm2svg.xslt');
    xhr.onload = function() {
      if (xhr.status === 200) {
        transformer.importStylesheet(xhr.responseXML);
      } else {
        console.error('Request failed.  Returned status of ' + xhr.status);
      }
    };
    xhr.send();
  }

  function getMousePosition(evt) {
    var CTM = me.svgContainer.firstElementChild.getScreenCTM();
    return {
      x: (evt.clientX - CTM.e) / CTM.a,
      y: (evt.clientY - CTM.f) / CTM.d
    };
  }

  function makeDraggable(svg) {
    svg.addEventListener('mousedown', startDrag);
    svg.addEventListener('mousemove', drag);
    svg.addEventListener('mouseup', endDrag);
    svg.addEventListener('mouseleave', endDrag);
  }

  function openFile() {
    document.getElementById('file-input').click();
  }

  function readSingleFile(e) {
    var file = e.target.files[0];
    if (!file) {
      return;
    }
    me.fileName = file.name;
    var reader = new FileReader();
    reader.onload = function(e) {
      var contents = e.target.result;
      me.modelDom = parser.parseFromString(contents, "text/xml");
      displayContents(contents);
    };
    reader.readAsText(file);
  }

  function renderSvg() {
    transformer.clearParameters();
    var result = transformer.transformToDocument(me.modelDom);
    if (result == undefined) {
      showError("Unable to render mind map");
    } else {
      if (me.svgContainer.hasChildNodes()) me.svgContainer.removeChild(me.svgContainer.firstElementChild);
      me.svgContainer.appendChild(result.firstElementChild);
      me.svgContainer.firstElementChild.setAttribute('transform', 'scale('+me.scale+')');
    }

    // enable edit
    if (!me.readOnly) {
      document.querySelectorAll('.node,.node-label').forEach(function(n) {
        n.classList.add('draggable');
      });
    }
  }

  function showError(msg) {
    console.error(msg);
  }

  function startDrag(evt) {
    console.log('startDrag');
    if (evt.target.classList.contains('draggable')) {
      me.selectedElement = evt.target;
    }
  }

  function zoomIn() {
    console.info('zoomIn');
    me.scale += me.scaleStep;
    me.svgContainer.firstElementChild.setAttribute('transform', 'scale('+me.scale+')');
  }

  function zoomOut() {
    console.info('zoomOut');
    me.scale -= me.scaleStep;
    me.svgContainer.firstElementChild.setAttribute('transform', 'scale('+me.scale+')');
  }

  document.addEventListener('DOMContentLoaded', function(ev) {
    console.log('loading...');

    fetchRenderer();

    document.getElementById('file-input')
      .addEventListener('change', readSingleFile, false);
    document.getElementById('open-btn')
      .addEventListener('click', openFile, false);
    document.getElementById('save-btn')
      .addEventListener('click', download, false);
    document.getElementById('zoom-in-btn')
      .addEventListener('click', zoomIn, false);
    document.getElementById('zoom-out-btn')
      .addEventListener('click', zoomOut, false);
  }, false);

  return me;
}())


