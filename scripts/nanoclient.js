//Function for checking, without throw error, is str base64-encoded or not. return true/false.
function isBase64(str) {
    try {
        return btoa(atob(str)) == str;
    } catch (err) {
        return false;
    }
}

function numSuffix(numStr) {
  if (numStr.endsWith('11')) return 's';
  if (numStr.endsWith('1')) return '';
  return 's';
}

function addPost(post, appendFunc, hasShowButton, short) {
  if (_use_spam_filter=='true' && post.hash != _categories){
    for (i in _spam_filter){
        if (_spam_filter[i].test(escapeTags(Base64.decode(post.message)))) return false;
    }
  }
  var locationBackup = window.location.href.toString();
  if (_depth > 1) hasShowButton = false;
  if (short == undefined) short = true;
  var d = $(document.createElement('div'));
  d
    .addClass('post')
    .attr('id', post.hash);
  if (_depth != 0)
    d.append('<gr>#' + (short&&_depth!=1?shortenHash(post.hash):post.hash) + '&nbsp;</gr>');
  if (_depth != 0) {
    $('<a>')
      .attr('href', '#' + post.replyTo)
      .click(function() {
        $('#' + post.replyTo)
          .addTemporaryClass('high', 1000);
        setTimeout(function(){
          console.log('assigning location');
          _location = locationBackup;
          location.assign(locationBackup);
        }, 200);
      })
      .appendTo(d)
      .html('^' + shortenHash(post.replyTo));
  }
  d.append('&nbsp;');
  d
    .append($('<a>')
      .attr('href', 'javascript:void(0)')
      .html('<span class="glyphicon glyphicon-pencil" aria-hidden="true"></span><span class="btn-title">&thinsp;Reply</span>')
      .click(function() {
        addReplyForm(post.hash);
        d.next().find('textarea').focus();
      }));
  if (hasShowButton) {
    d.append('&nbsp;');
    var showLink = 
      $('<a>')
        .attr('href', (_depth==0?'#category':'#thread') + post.hash)
        .text('[Show]')
        .click(function() {
          //_depth += 1;
          //loadThread(post.hash);
        });
    d.append(showLink);
    $.get('../api/threadsize/' + post.hash)
      .done(function(size){
        if (size == '0')
          showLink.html('<span class="glyphicon glyphicon-comment not-avail" aria-hidden="true"></span><span class="btn-title not-avail">&thinsp;0</span>');
        else
          showLink.html('<span class="glyphicon glyphicon-comment" aria-hidden="true"></span><span class="btn-title">&thinsp;'+size+' – Show</span>');
      });
  }
  d.append('&nbsp;');
  d
    .append($('<a>')
      .attr('href', 'javascript:void(0)')
      .html('<span class="glyphicon glyphicon-trash" aria-hidden="true"></span><span class="btn-title">Delete</span>')
      .attr('title', 'Click to delete post forever.')
      .click(function() {
        if (post.hash == _categories) {
          pushNotification("Cannot delete root post.");
          return;
        }
        var undo = false;
        d.append(
          $('<button>')
            .text('Undo')
            .click(function(){
              undo = true;
              $(this).remove();
            })
            .append($('<span>').html('&nbsp;')
              .css({ background: 'red', height: '5px', marginLeft: '5px'})
              .animate({width: '100px'},50)
              .animate({width: '0px'},Math.random()*200+_post_delete_timeout)));
        setTimeout(function(){
          if (undo) return;
          deletePostFromDb(post.hash);
          d.remove();
          pushNotification('A post was deleted forever.');
        }, _post_delete_timeout);
      }));
  appendFunc(d);
  
  //This code need function isBase64(str), and this function in beginning of this script
  var post_content = escapeTags(Base64.decode(post.message));
  //console.log('At beginning, post_content was been: \n', post_content);				//Value of post_content at beginning, with description

  //detect files
  var not_a_files = 0;																	//increment this, when not a file and no need to replace this...
  if(post_content.indexOf('[file')!==-1){												//if bb-code "file" found
	var files_array = post_content.split('[file');										//split by file
	//console.log('files_array, after splitting by \'[file\' = ', files_array);			//show array in console, with description
	for(i=1;i<files_array.length;i++){													//for each element up to array length
		//console.log(
		//				'files_array[i]', files_array[i],								//show array element
		//		'\n'+	'array length: ', files_array.length							//and array length
		//);
		var maybe_base = 	(
									files_array[i].split('"]')[1]						//split by '"]' if name/type exists
								|| 	files_array[i].split(']')[1]						//or if prefious value is undefined, and [file] (without name/type) - then split by ']' to get base64
							)
							.split('[/file')[0];										//split by "[/file", not by "[/file]" to get base64, because by ']' this can be already splitted.

		//console.log('i = ', i, 'maybe_base', maybe_base);								//show i value too.

		if(isBase64(maybe_base.trim())){																//check is base64
			//console.log('base64!');																//if yes - show notification in console
			//console.log('base64! trimmed maybe_base: ', maybe_base.trim().substring(0,40));			//with part of base64, not full value.
																										//and try to replace file to download link...
			//var split_by_base = post_content.split(maybe_base);									//split post by this base64 (old code)
			var split_by_base = post_content.split(']'+maybe_base+'[');								//now split post by this base64, but in the middle of ']BASE64[' - if many links for the same file was been replaced. And don't split replaced HTML-links, by this base64.
			var before_base = split_by_base[0];														//here contains previous part of post and filename with filetype
			var split_by_file = before_base.split('[file');											//split by '[file'. In the second element must be filename and filetype.

			var check_filename_regexp = /^[-\wёЁА-я^&'@{}[\],$=!#().%+~]+$/;								//regexp to test is filename correct? Latin and Cyrillic characters in filename.extension
			//	console.log(/^[-\w^&'@{}[\],$=!#().%+~]+$/.test("test1_FiLEнёЁйМ.tИкСt") === true); 		//old regexp - FALSE, because ciryllic characters inside the string...
			//	console.log(/^[-\wёЁА-я^&'@{}[\],$=!#().%+~]+$/.test("test1_FiLEнёЁйМ.tИкСt") === true); 	//TRUE

			var part = not_a_files+1;																	//first part of array must contains filename and filetype
			var filename = split_by_file[part].split('name="')[1].split('"')[0];						//set filename by splitting this by 'name="' and '"'
			//console.log('filename', filename);														//show this
			var filetype = split_by_file[part].split('type="')[1].split('"')[0];						//set filetype by splitting this by 'type="' and '"'
			//console.log('filetype', filetype);														//show filetype

			
			while(true){																			//cycle without end
				if(typeof split_by_file[part]=='undefined'){break;}									//if no any element - break
				if(!check_filename_regexp.test(filename)){												//if no filename there
					part++;																					//check next part of splitted post
					filename = split_by_file[part].split('name="')[1].split('"')[0];						//get filename
					//console.log('filename', filename);														//show this
					filetype = split_by_file[part].split('type="')[1].split('"')[0];						//get filetype
					//console.log('filetype', filetype);														//show this.
					continue;																				//and continue cycle without running next code...
				}
				else{																				//else, if not code and filename exist and valid...
				//	console.log(																		//show checking results
				//		"(check_filename_regexp.test(filename))",
				//		(check_filename_regexp.test(filename)),
				//		'part', part
				//	);
					break;																				//and break from cycle...
				}
			}
			//when filename and filetype is valid...

			//build link to download this file.
			var html_link = '<a href="data:'+filetype+';base64,'+maybe_base+'" download="'+filename+'">['+filename+']</a>'
			//and add link to download this as binary,
			//with green button as base64 encoded PNG image to this link - without tab symbols.
			+'<a href="/pages/download_as_binary.html" target="_blank">\
<img src="\
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/\
9hAAAACXBIWXMAAA7EAAAOxAGVKw4bAAABCElEQVQ4jZ3TMUoDQRjF8V+SRURExQN4Ai+gFkkjegqxsQwSQcQiMGgrIugJvEB6beIRcgUPIBoExSJY7MRk\
18kG/WBZ9r3v/75hZqcmVcEBLrESlSG6gvtyay0BL+ANiyXnE6uCr2mxnpifJWBRy8piKiClzfSqmv8d8KcVTDYx2MBafJ5mBDTxilfBcznxEIMKWPQGOE\
ot6QLXFfC47tAdfzR+5D5aHuQ/z1YF3BYmQqNgT0KWsT0PzgOCfS0v+j6mQh6xhJ3Yd4PjAhysa2nW0cNmITZvPMMpztEpT45ML8NI6uxz4OqXXqxRJr9p\
u/GSjMbGDKA+9d7DMEMHtziZM61c72h/A3foMuoBqRh/AAAAAElFTkSuQmCC\">'
			+'</a>';

			//console.log('link - generated sucessfully...\n', 'html_link: ', html_link);																//show stage and this link...

			//console.log('replace bb-code to link...\n', post_content.split('[file name="'+filename+'" type="'+filetype+'"]'+maybe_base+'[/file]'));	//show stage and splitted array...
			
			post_content = post_content.split('[file name="'+filename+'" type="'+filetype+'"]'+maybe_base+'[/file]').join(html_link);	//and replace bb-code [file] - to this link.

			//console.log('post_content: ', post_content);																				//show results...
		}else{																								//not base64 in the middle of [file][/file]
			//console.log('not base64', maybe_base);														//show notification in console
			not_a_files++;																					//and do not extract info about this file, after next splitting by "[file"...
		}
		//and continue replace files to links in all post, splitted by file-tag, again and again...
	}
	//console.log('post_content: ', post_content);																//show post in the end and continue script
  }//or continue script without replacing...

  var inner = $('<div>')
    .addClass('post-inner')
//    .html(applyFormatting(escapeTags(Base64.decode(post.message))))											//old code
    .html(applyFormatting(post_content))																		//<--- HERE using replaced contend of post
    .appendTo(d);
  detectPlacesCommands(inner);
  d.find('img').click(function(){
    $(this).toggleClass('full');
  });
  // detect zip files:
  var imgs = d.find('img');
  var imgcnt = imgs.length;
  if (imgcnt > 0) {
    for (var i = 0; i < imgcnt; i++) {
      var img = imgs[i];
      if (img.src.startsWith('data:image/jpeg;base64,UEsDB')) {//if PK at first - then zip						//saving backward compatibility with old zipJPEGs
        $(img).replaceWith($('<a download=file'+(i+1)+'.zip href='+img.src.replace('image/jpeg','application/zip')+'>[file'+(i+1)+'.zip]</a>'));
      }
    }
  }
  if (_showTimestamps == 'false') {
	if (d.find('g').length != 0)
		d.find('br').first().remove();
    d.find('g').css('display','none');
  }
  return d;
}

function loadReplies(hash, offset, highlight) {
  $.get('../api/replies/' + hash)
    .done(function(arr){
      arr = JSON.parse(arr);
      if (arr.length == 0) return;
      for (var i = arr.length-1; i >= 0; i--) {
        var deleted = Base64.decode(arr[i].message) == _postWasDeletedMarker;
        if (_showDeleted == 'false' && deleted) continue;
        var p = addPost(arr[i], function(d) { d.insertAfter($('#'+hash)); }, false)
        if (p){
            p.css('margin-left', offset * _treeOffsetPx + 'px');
            if (deleted) p.css({ opacity: _deletedOpacity });
            loadReplies(arr[i].hash, offset + 1, highlight);
            if (highlight == arr[i].hash) {
              p.addTemporaryClass('high', 8000);
            }
        }
      }
      vid_show()
    });
}

function loadThread(hash, highlight) {
  thisPosts = [];
  $.get('../api/replies/' + hash)
    .done(function(arr){
      arr = JSON.parse(arr);
      if (arr.length > 0) {
        $('#thread').empty();
      } else { 
        _depth -= 1; 
        pushNotification('This thread/category is empty.');
        return; 
      }
      $.get('../api/get/' + hash)
        .done(function(post){
          post = JSON.parse(post);
          if (_depth > 0) {
            $('#thread').append(
              $('<a>')
                .attr('href', (post.replyTo != _categories) ? ('#category' + post.replyTo) : ('#'))
                .html('<b><span class="glyphicon glyphicon-arrow-up" aria-hidden="true"></span>Up</b>')
                .click(function(){
                  //_depth -= 1;
                  //loadThread(post.replyTo);
                }));
          }
          $('#thread').append('&nbsp;');
          $('#thread').append(
            $('<a>')
              .attr('href','javascript:void(0)')
              .html('<span class="glyphicon glyphicon-refresh" aria-hidden="true"></span>Refresh')
              .click(function(){
                reloadParams();
                setTimeout(function(){
                  loadThread(hash);                  
                }, 500);
              }));
          $('#thread').append(
            $('<a>')
              .attr('href','javascript:void(0)')
              .html('&nbsp;<span class="glyphicon glyphicon-chevron-down" aria-hidden="true"></span>Sort by date')
              .click(function(){
                $('.separat').remove();
                var thread = $('g').parent().parent().parent();
                var posts = $('g').parent().parent();
                var first = $('.post')[0];
                var sorted = posts.sort(function(a,b){
                a.style.marginLeft = 0;
                b.style.marginLeft = 0;
                var d1 = new Date(a.innerHTML.replace(/.*\<g\>/,'').replace(/\<\/g\>.*/,'').replace(/^[A-z ,]{4,5}/,'').replace(/,.*/,''));
                var d2 = new Date(b.innerHTML.replace(/.*\<g\>/,'').replace(/\<\/g\>.*/,'').replace(/^[A-z ,]{4,5}/,'').replace(/,.*/,''));
                return d1 > d2 ? 1 : -1;
                });
                $('<div class=separat>End of sorting. Posts without timestamps:</div>').insertAfter($('#thread_top'));
                sorted.detach().insertAfter($('#thread_top'));
                if (sorted[0] != first)
                  $(first).detach().insertBefore(sorted[0]);

                posts = $('.post');
                for (var i = 1; i < posts.length; i++) {
                  $(posts[i]).prepend("<span style=font-size:75% class=separat>#"+(i+1)+"</span>&nbsp;");
                  var href = $(posts[i]).find('a')[0].href;
                  href = href.split('#')[1];
                  var parent = $('#' + href);
                  var reflink = $('<span class=separat><a style=font-size:75% href=#'+posts[i].id+'>&gt;&gt;'+shortenHash(posts[i].id)+'</a> </span>');
                  var safI = i;
                  $(reflink.find('a')).click(function(){
                    console.log('click' + $(this).attr('href'));
                    $($(this).attr('href')).addTemporaryClass('high', 1000);
                  });
                  parent.append(reflink);
                }

              })
            );
          $('#thread').append(
            $('<a>')
              .attr('href','javascript:void(0)')
              .html('&nbsp;<span class="glyphicon glyphicon-chevron-up" aria-hidden="true"></span>Reversed sort')
              .click(function(){
                $('.separat').remove();
                var thread = $('g').parent().parent().parent();
                var posts = $('g').parent().parent();
                var first = $('.post')[0];
                var sorted = posts.sort(function(a,b){
                a.style.marginLeft = 0;
                b.style.marginLeft = 0;
                var d1 = new Date(a.innerHTML.replace(/.*\<g\>/,'').replace(/\<\/g\>.*/,'').replace(/^[A-z ,]{4,5}/,'').replace(/,.*/,''));
                var d2 = new Date(b.innerHTML.replace(/.*\<g\>/,'').replace(/\<\/g\>.*/,'').replace(/^[A-z ,]{4,5}/,'').replace(/,.*/,''));
                return d1 < d2 ? 1 : -1;
                });
                $('<div class=separat>End of sorting. Posts without timestamps:</div>').insertAfter($('#thread_top'));
                sorted.detach().insertAfter($('#thread_top'));
                if (sorted[0] != first)
                  $(first).detach().insertBefore(sorted[0]);
              })
            );
	   $('#thread').append(
            $('<a id="thread_top">')
              .attr('href','javascript:void(0)')
              .html('&nbsp;<span class="glyphicon glyphicon-remove" aria-hidden="true"></span>Delete All')
              .click(function(){
                if (confirm('Are you sure you want delete all posts that you currently see?')) {
                  $('.glyphicon-trash').click();
                }
              })
            );

          addPost(post, function(d){ d.appendTo($('#thread')); }, false, false);
          if (_depth == 1) arr.reverse();
          for (var i = 0; i < arr.length; i++) {
            var deleted = Base64.decode(arr[i].message) == _postWasDeletedMarker;
            if (_showDeleted == 'false' && deleted) continue;
            var p = addPost(arr[i], function(d) {d.appendTo($('#thread'));}, true)
            if (p){
                p.css('margin-left',  _treeOffsetPx + 'px');
                if (deleted) p.css({ opacity: _deletedOpacity});
                if (highlight == arr[i].hash) {
                  p.addTemporaryClass('high', 8000);
                }
                if (_depth > 1) {
                  loadReplies(arr[i].hash, 2, highlight);
                }
            }
          }
          vid_show()
        });
    });
}