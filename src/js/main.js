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
    fontSize: 14,
    readOnly: false,
    scale: 1.0,
    scaleStep: 0.25,
    selectedElement: false,
    // server: 'http://localhost:8000',
    server: 'https://mindmapper.knowprocess.com',
    svgContainer: document.getElementById('svg-content')
  };

  function click(evt) {
    console.log('click');
  }

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
    if (!me.readOnly) {
      makeDraggable(me.svgContainer);
      makeEditable();
    }

    document.querySelectorAll('.loaded-btn').forEach(function(el) {
      el.setAttribute('style','display:inline');
    });
  }

  function dragEndOrClick(evt) {
    console.log('dragEndOrClick');
    var coord = getMousePosition(evt);
    if (me.selectedElement && Math.abs(me.curPos.x - coord.x) > 10
        && Math.abs(me.curPos.y - coord.y) > 10) {
      dragEnd(evt);
    } else {
      click(evt);
      editText(evt);
    }
  }

  function dragEnd(evt) {
    console.log('dragEnd');
    renderSvg();
    me.selectedElement = null;
  }

  function drag(evt) {
    if (me.selectedElement) {
      console.log('drag: '+me.selectedElement.id);
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
          evt.target.nextElementSibling.setAttributeNS(null, "x", coord.x-dx-me.dragOffset.x);
          evt.target.nextElementSibling.setAttributeNS(null, "y", coord.y-dy-me.dragOffset.y);
        }
        me.selectedElement.setAttributeNS(null, "cx", coord.x - me.dragOffset.x);
        me.selectedElement.setAttributeNS(null, "cy", coord.y - me.dragOffset.y);
        var modelEl = me.modelDom.querySelector('[ID="'+evt.target.getAttribute('id')+'"] Bounds');
        if (modelEl != undefined) {
          modelEl.setAttribute('x', coord.x - me.dragOffset.x);
          modelEl.setAttribute('y', coord.y - me.dragOffset.y);
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
        // update view
        if (evt.target.nextElementSibling != undefined
            && evt.target.nextElementSibling.tagName == 'text') {
          var dx = me.selectedElement.getAttributeNS(null, "x")
              - evt.target.nextElementSibling.getAttributeNS(null, "x");
          var dy = me.selectedElement.getAttributeNS(null, "y")
              - evt.target.nextElementSibling.getAttributeNS(null, "y");
          evt.target.nextElementSibling.setAttributeNS(null, "x", coord.x -dx - me.dragOffset.x);
          evt.target.nextElementSibling.setAttributeNS(null, "y", coord.y -dy - me.dragOffset.y);
        }
        me.selectedElement.setAttributeNS(null, "x", coord.x - me.dragOffset.x);
        me.selectedElement.setAttributeNS(null, "y", coord.y - me.dragOffset.y);
        // update model
        var modelEl = me.modelDom.querySelector('[ID="'+evt.target.getAttribute('id')+'"] Bounds');
        if (modelEl != undefined) {
          console.log('  model '+evt.target.getAttribute('id')+' updating '
              +modelEl.getAttribute('x')+','+modelEl.getAttribute('y')
              +' to '+coord.x+','+coord.y);
          modelEl.setAttribute('x', coord.x - me.dragOffset.x);
          modelEl.setAttribute('y', coord.y - me.dragOffset.y);
          console.log('  model '+evt.target.getAttribute('id')+' updated to: '
              +modelEl.getAttribute('x')+','+modelEl.getAttribute('y')
              +' '+coord.x+','+coord.y);
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

  function editText(evt) {
    console.log('editText: '+evt.target.ID);
      document.querySelector('.text-editing-container')
          .setAttribute('style', 'display:inline;position:absolute;top:100px;left:100px;width:200px;height:100px;z-index:100');
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

  // translate screen co-ords to SVG co-ords
  function getMousePosition(evt) {
    if (evt.touches) { evt = evt.touches[0]; }
    var CTM = me.svgContainer.firstElementChild.getScreenCTM();
    return {
      x: (evt.clientX - CTM.e) / CTM.a,
      y: (evt.clientY - CTM.f) / CTM.d
    };
  }

  function makeDraggable(svg) {
    svg.addEventListener('mousedown', startDrag);
    svg.addEventListener('mousemove', drag);
    svg.addEventListener('mouseup',  dragEndOrClick);
    svg.addEventListener('mouseleave',  dragEnd);

    // At least under chrome causes drop to 'jump' (last drag wildly offset)
    // svg.addEventListener('dragstart', startDrag);
    // svg.addEventListener('drag', drag);
    // svg.addEventListener('dragend',  dragEnd);
    // svg.addEventListener('drop',  dragEnd);

    svg.addEventListener('touchstart', startDrag);
    svg.addEventListener('touchmove', drag);
    svg.addEventListener('touchend',  dragEndOrClick);
    svg.addEventListener('touchleave',  dragEnd);
    svg.addEventListener('touchcancel',  dragEnd);
  }

  function makeEditable() {
    document.querySelectorAll('.node-label').forEach(function(n) {
      n.addEventListener('click', editText, false/*capture*/);
    });
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
      document.querySelectorAll('.node').forEach(function(n) {
        n.classList.add('draggable');
      });
      document.querySelector('.root-node').classList.add('static');
    }
  }

  function showError(msg) {
    console.error(msg);
  }

  function startDrag(evt) {
    console.log('startDrag');
    me.curPos  = getMousePosition(evt);
    if (evt.target.classList.contains('draggable')) {
      me.selectedElement = evt.target;

      // hide text node while dragging
      me.selectedElement.nextElementSibling.style.display='none';

      me.dragOffset = me.curPos;
      me.dragOffset.x -= parseFloat(me.selectedElement.getAttributeNS(null, "x"));
      me.dragOffset.y -= parseFloat(me.selectedElement.getAttributeNS(null, "y"));
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


