'use strict';

var g_path = null;
var g_item = null;
var g_div = null;
var g_modify = false;

$(document).ready(function () {

  $('#btn-open').click(function () {
    const dialog = require('remote').require('dialog');
    dialog.showOpenDialog({properties: ['openDirectory']}, loadFiles);
  });

  $('#btn-reload').click(function () {
    if (g_path == null) return;
    loadFiles(g_path);
  });

  $('#btn-delete').click(function () {
    if (g_div) {
      $(g_div).remove();
      g_div = null;
      $('#dlg-marker').hide();
      g_modify = true;
    }
  });

  $('#btn-backward').click(function () {
    $('#list-files a:first-child').click();
  });

  $('#btn-forward').click(function () {
    $('#list-files a:last-child').click();
  });

  $('#btn-leftward').click(function () {
    $('#list-files a.active').prev().click();
  });

  $('#btn-rightward').click(function () {
    $('#list-files a.active').next().click();
  });

  $('#list-files').click(function (e) {
    if (e.target.tagName === 'A' && !$(e.target).hasClass('active')) {
      if (g_item) {
        if (g_item.hasClass('active'))
          g_item.removeClass('active');
        if (g_modify && $('#div-img .img-bndbox').length != 0) {
          saveXML(g_item.html());
          if (g_item.hasClass('list-group-item-warning'))
            g_item.removeClass('list-group-item-warning');
          if (!g_item.hasClass('list-group-item-success'))
            g_item.addClass('list-group-item-success');
        } else if (g_modify && $('#div-img .img-bndbox').length == 0) {
          var xmlPath = g_path.toString() + '/' + g_item.html().substring(0, g_item.html().lastIndexOf('.')) + '.xml';
          var fs = require('fs');
          fs.unlink(xmlPath, function (err) {
            //if (err) throw err;
            if (!err) console.log('successfully deleted ' + xmlPath);
          });
          if (g_item.hasClass('list-group-item-success'))
            g_item.removeClass('list-group-item-success');
          if (!g_item.hasClass('list-group-item-warning'))
            g_item.addClass('list-group-item-warning');
        }
      }
      $('#div-img .img-bndbox').remove();
      $('#dlg-marker').hide();
      $('#img')[0].src = g_path + '/' + $(e.target).html();
      if ($(e.target).hasClass('list-group-item-success')) {
        $('#img').load(function () {
          readXML($(e.target).html());
          $('#img').unbind('load');
        });
      }
      if (!$(e.target).hasClass('active'))
        $(e.target).addClass('active');
      g_item = $(e.target);
    }
  });

  $('#ckb-dif').change(function () {
    $(g_div).attr('data-dif', $('#ckb-dif').get(0).checked);
    g_modify = true;
  });

  $('#sel-class').change(function () {
    $(g_div).attr('data-sel', $('#sel-class').val());
    g_modify = true;
  });

  var startX, startY;
  var cDiv = null;

  $('#img').mousedown(function (e) {
    if (cDiv) return;
    $('#dlg-marker').hide();
    startX = e.offsetX;
    startY = e.offsetY;
    cDiv = document.createElement('div');
    cDiv.className = 'img-bndbox';
    cDiv.style.left = startX + 'px';
    cDiv.style.top = startY + 'px';
    $('#div-img').append(cDiv);
  });

  $('#div-img').mousemove(function (e) {
    if (cDiv) {
      var endX = e.offsetX + e.target.offsetLeft;
      var endY = e.offsetY + e.target.offsetTop;
      var rectHeight = Math.abs(endY - startY) + 'px';
      var rectWidth = Math.abs(endX - startX) + 'px';
      $(cDiv).css('left', endX < startX ? endX : startX);
      $(cDiv).css('top', endY < startY ? endY : startY);
      $(cDiv).width(rectWidth);
      $(cDiv).height(rectHeight);
    }
  });

  $(window).mouseup(function () {
    if (!cDiv) return;
    if ($(cDiv).width() <= 2 || $(cDiv).height() <= 2) {
      $(cDiv).remove();
      cDiv = null;
      return;
    }
    g_div = cDiv;
    cDiv = null;
    $('#ckb-dif').get(0).checked = false;
    $('#sel-class').prop('selectedIndex', 0);
    $('#ckb-dif').trigger('change');
    $('#sel-class').trigger('change');
    showTextDialog();
  });

  $(document).on("click", '.img-bndbox', function () {
    if (cDiv) return;
    g_div = this;
    showTextDialog();
  });
});

function loadFiles(dir) {
  if (dir == null) return;
  g_path = dir;
  var fs = require('fs');
  fs.readdir(dir.toString(), function (err, files) {
    addNode(0);
    var flag = false;
    for (var i = 0, l = files.length; i < l; i++) {
      if (files[i].substring(files[i].lastIndexOf('.') + 1, files[i].length).toLowerCase() == 'jpeg') {
        var xmlPath = dir.toString() + '/' + files[i].substring(0, files[i].lastIndexOf('.')) + '.xml';
        flag = true;
        (function (fileName) {
          fs.stat(xmlPath, function (err, stat) {
            if (err == null)
              addNode(fileName, true);
            else
              addNode(fileName, false);
          });
        })(files[i]);
      }
    }
    if (!flag) addNode(-1);
  });
}

function addNode(fileName, check) {
  if (fileName == 0) {
    $('#list-files').html('');
  } else if (fileName == -1) {
    $('#list-files').html('<li class="list-group-item list-group-item-danger">No Image Found!</li>');
  } else {
    var node = '<a href="#" class="list-group-item list-group-item-' +
      (check ? 'success">' : 'warning">') + fileName + '</a>';
    $('#list-files').append(node);
  }
}

function showTextDialog() {
  $('#dlg-marker').hide();
  if ($(g_div).position().left + $('#dlg-marker').outerWidth() > $('#div-img').width()) {
    $('#dlg-marker').css('right', '0px');
    $('#dlg-marker').css('left', '');
  } else {
    $('#dlg-marker').css('right', '');
    $('#dlg-marker').css('left', $(g_div).css('left'));
  }
  if ($(g_div).position().top - $('#dlg-marker').height() < 10) {
    $('#dlg-marker').css('top', $(g_div).position().top + $(g_div).height() + 4 + 'px');
  } else {
    $('#dlg-marker').css('top', $(g_div).position().top - $('#dlg-marker').outerHeight() - 4 + 'px');
  }
  $('#ckb-dif').get(0).checked = $(g_div).attr('data-dif') == 'true' ? true : false;
  $('#sel-class').val($(g_div).attr('data-sel'));
  $('#dlg-marker').fadeIn();
}

function saveXML(file) {
  var xmlURL = g_path.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
  var fs = require('fs'), xml2js = require('xml2js');
  var builder = new xml2js.Builder({rootName: 'annotation'});
  var ratio = $('#img')[0].naturalWidth / $('#img')[0].width;
  var obj = {
    filename: file,
    size: {
      width: $('#img')[0].naturalWidth,
      height: $('#img')[0].naturalHeight
    },
    object: []
  };

  $('#div-img .img-bndbox').each(function () {
    var node = {
      class: $(this).attr('data-sel'),
      difficult: $(this).attr('data-dif'),
      x: Math.round($(this).position().left * ratio),
      y: Math.round($(this).position().top * ratio),
      width: Math.round($(this).width() * ratio),
      height: Math.round($(this).height() * ratio)
    };
    obj.object.push(node);
  });
  var xml = builder.buildObject(obj);
  fs.writeFile(xmlURL, xml, function (err) {
    if (err) throw err;
    console.log(xmlURL + 'is saved!');
  });
}

function readXML(file) {
  var xmlURL = g_path.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
  var fs = require('fs'), xml2js = require('xml2js');
  var parseString = require('xml2js').parseString;
  fs.readFile(xmlURL, function (err, data) {
    if (err) throw err;
    parseString(data, function (err, result) {
      if (result.annotation.filename != file) return;
      var ratio = $('#img')[0].width / $('#img')[0].naturalWidth;
      result.annotation.object.forEach(function (node) {
        var div = document.createElement('div');
        div.className = 'img-bndbox';
        div.style.left = Math.round(node.x * ratio) + 'px';
        div.style.top = Math.round(node.y * ratio) + 'px';
        div.style.width = Math.round(node.width * ratio) + 'px';
        div.style.height = Math.round(node.height * ratio) + 'px';
        div.setAttribute('data-sel', node.class);
        div.setAttribute('data-dif', node.difficult);
        $('#div-img').append(div);
      });
      g_modify = false;
    });
  });

}