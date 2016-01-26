'use strict';

var g_dir = null;
var g_target = null;
var g_div = null;
var g_modify = false;

$(document).ready(function () {
  $('#open').click(function () {
    const dialog = require('remote').require('dialog');
    dialog.showOpenDialog({properties: ['openDirectory']}, loadFiles);
  });

  $('#reload').click(function () {
    if (g_dir == null) return;
    loadFiles(g_dir);
  });

  $('#fileLists').click(function (e) {
    if (e.target.tagName === 'A' && !$(e.target).hasClass('active')) {
      if (g_target) {
        if (g_target.hasClass('active'))
          g_target.removeClass('active');
        if (g_modify && $('#img-section .img-selection').length != 0) {
          saveXML(g_target.html());
          if (g_target.hasClass('list-group-item-warning'))
            g_target.removeClass('list-group-item-warning');
          if (!g_target.hasClass('list-group-item-success'))
            g_target.addClass('list-group-item-success');
        } else if (g_modify && $('#img-section .img-selection').length == 0) {
          var xmlPath = g_dir.toString() + '/' + g_target.html().substring(0, g_target.html().lastIndexOf('.')) + '.xml';
          var fs = require('fs');
          fs.unlink(xmlPath, function (err) {
            //if (err) throw err;
            if (!err) console.log('successfully deleted ' + xmlPath);
          });
          if (g_target.hasClass('list-group-item-success'))
            g_target.removeClass('list-group-item-success');
          if (!g_target.hasClass('list-group-item-warning'))
            g_target.addClass('list-group-item-warning');
        }
      }
      $('#img-section .img-selection').remove();
      $('#text-dialog').hide();
      $('#img')[0].src = g_dir + '/' + $(e.target).html();
      if ($(e.target).hasClass('list-group-item-success')) {
        $('#img').load(function () {
          readXML($(e.target).html());
          $('#img').unbind('load');
        });
      }
      if (!$(e.target).hasClass('active'))
        $(e.target).addClass('active');
      g_target = $(e.target);
    }
  });

  $('#diff-check').change(function () {
    $(g_div).attr('data-check', $('#diff-check').get(0).checked);
    g_modify = true;
  });

  $('#selection-text').change(function () {
    $(g_div).attr('data-text', $('#selection-text').val());
    g_modify = true;
  });

  $('#class-sel').change(function () {
    $(g_div).attr('data-sel', $('#class-sel').val());
    g_modify = true;
  });

  var startX, startY;
  var cDiv, flag = false;

  $('#img').mousedown(function (e) {
    if (flag) return;
    $('#text-dialog').hide();
    startX = e.offsetX;
    startY = e.offsetY;
    cDiv = document.createElement('div');
    cDiv.className = 'img-selection';
    cDiv.style.left = startX + 'px';
    cDiv.style.top = startY + 'px';
    $('#img-section').append(cDiv);
    flag = true;
  });

  $('#img-section').mousemove(function (e) {
    if (flag) {
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

  $('#img-section').mouseup(function (e) {
    if (!flag || (e.target.id != 'img' && e.target.className != 'img-selection')) return;
    if ($(cDiv).width() == 0 && $(cDiv).height() == 0) {
      $(cDiv).remove();
      cDiv = null;
      flag = false;
      return;
    }
    g_div = cDiv;
    cDiv = null;
    flag = false;
    $('#selection-text').val('');
    $('#diff-check').get(0).checked = false;
    $('#class-sel').prop('selectedIndex', 0);
    ;
    $('#selection-text').trigger('change');
    $('#diff-check').trigger('change');
    $('#class-sel').trigger('change');
    showTextDialog();
  });

  $('#remove-selection').click(function () {
    if (g_div) {
      $(g_div).remove();
      g_div = null;
      $('#text-dialog').hide();
      g_modify = true;
    }
  });

  $('#undo-text').mousedown(function () {
    $('#selection-text').val($(g_div).attr('data-text'));
    $('#selection-text').focus();
  });

  $(document).on("click", '.img-selection', function () {
    if (flag) return;
    g_div = this;
    showTextDialog();
  });

  $('#backward').click(function () {
    $('#fileLists a:first-child').click();
  });

  $('#forward').click(function () {
    $('#fileLists a:last-child').click();
  });

  $('#leftward').click(function () {
    $('#fileLists a.active').prev().click();
  });

  $('#rightward').click(function () {
    $('#fileLists a.active').next().click();
  });

});

function loadFiles(dir) {
  if (dir == null) return;
  g_dir = dir;
  var fs = require('fs');
  fs.readdir(dir.toString(), function (err, files) {
    addNode(0);
    var flag = false;
    for (var i = 0, l = files.length; i < l; i++) {
      if (files[i].substring(files[i].lastIndexOf('.') + 1, files[i].length).toLowerCase() == 'png') {
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
    $('#fileLists').html('');
  } else if (fileName == -1) {
    $('#fileLists').html('<li class="list-group-item list-group-item-danger">No Image Found!</li>');
  } else {
    var node = '<a href="#" class="list-group-item list-group-item-' +
      (check ? 'success">' : 'warning">') + fileName + '</a>';
    $('#fileLists').append(node);
  }
}

function showTextDialog() {
  $('#text-dialog').hide();
  $('#text-dialog').outerWidth($(g_div).width() >= 200 ? $(g_div).width() : 200);
  if ($(g_div).position().left + $('#text-dialog').outerWidth() > $('#img-section').width()) {
    $('#text-dialog').css('right', '0px');
    $('#text-dialog').css('left', '');
  } else {
    $('#text-dialog').css('right', '');
    $('#text-dialog').css('left', $(g_div).css('left'));
  }
  if ($(g_div).position().top - $('#text-dialog').height() < 10) {
    $('#text-dialog').css('top', $(g_div).position().top + $(g_div).height() + 4 + 'px');
  } else {
    $('#text-dialog').css('top', $(g_div).position().top - $('#text-dialog').outerHeight() - 4 + 'px');
  }
  $('#selection-text').val($(g_div).attr('data-text'));
  $('#diff-check').get(0).checked = $(g_div).attr('data-check') == 'true' ? true : false;
  $('#class-sel').val($(g_div).attr('data-sel'));
  $('#text-dialog').fadeIn();
  $('#selection-text').focus();
}

function saveXML(file) {
  var xmlURL = g_dir.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
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

  $('#img-section .img-selection').each(function () {
    var node = {
      class: $(this).attr('data-sel'),
      text: $(this).attr('data-text'),
      difficult: $(this).attr('data-check'),
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
  var xmlURL = g_dir.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
  var fs = require('fs'), xml2js = require('xml2js');
  var parseString = require('xml2js').parseString;
  fs.readFile(xmlURL, function (err, data) {
    if (err) throw err;
    parseString(data, function (err, result) {
      if (result.annotation.filename != file) return;
      var ratio = $('#img')[0].width / $('#img')[0].naturalWidth;
      result.annotation.object.forEach(function (node) {
        var div = document.createElement('div');
        div.className = 'img-selection';
        div.style.left = Math.round(node.x * ratio) + 'px';
        div.style.top = Math.round(node.y * ratio) + 'px';
        div.style.width = Math.round(node.width * ratio) + 'px';
        div.style.height = Math.round(node.height * ratio) + 'px';
        div.setAttribute('data-text', node.text);
        div.setAttribute('data-sel', node.class);
        div.setAttribute('data-check', node.difficult);
        $('#img-section').append(div);
      });
      g_modify = false;
    });
  });

}