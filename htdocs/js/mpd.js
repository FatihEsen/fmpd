/* ympd
   (c) 2013-2014 Andrew Karpow <andy@ndyk.de>
   This project's homepage is: https://www.ympd.org
   
   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; version 2 of the License.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License along
   with this program; if not, write to the Free Software Foundation, Inc.,
   Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

var socket;
var last_state;
var last_outputs;
var current_app;
var pagination = 0;
var browsepath;
var lastSongTitle = "";
var current_song = new Object();
var MAX_ELEMENTS_PER_PAGE = 512;
var dirble_selected_cat = "";
var dirble_catid = "";
var dirble_page = 1;
var isTouch = (typeof Modernizr !== 'undefined' && Modernizr.touch) ? 1 : (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ? 1 : 0);
var filter = undefined;
var dirble_api_token = "";
var dirble_stations = false;

var app = $.sammy(function() {

    function runBrowse() {
        current_app = 'queue';
        $('body').removeClass('view-browse');

        $('#breadcrump').addClass('hide');
        $('#filter').addClass('hide').hide();
        $('#add-all-songs').addClass('hide');
        $('#btn-toggle-library-view').addClass('hide');
        $('#library-3col-panel').addClass('hide').hide();
        $('#nav-queue').addClass('active');
        $('#panel-title').text("📻 Çalma Listesi Sırası");
        $('#salamisandwich').removeClass('ytm-browse-grid-mode').removeClass('hide').find("tr:gt(0)").remove();
        $('#dirble_panel').addClass('hide');
        socket.send('MPD_API_GET_QUEUE,'+pagination);
    }

    function prepare() {
        $('body').removeClass('view-browse view-search');
        $('.nav-tab-pill').removeClass('active');
        $('#nav_links > li').removeClass('active');
        $('.page-btn').addClass('hide');
        $('#add-all-songs').addClass('hide');
        $('#btn-toggle-library-view').addClass('hide');
        $('#library-3col-panel').addClass('hide').hide();
        $('#filter').addClass('hide').hide();
        pagination = 0;
        browsepath = '';
    }

    this.get(/\#\/(\d+)/, function() {
        prepare();
        pagination = parseInt(this.params['splat'][0]);
        runBrowse();
    });

    this.get(/\#\/browse$/, function() {
        app.setLocation('#/browse/0/');
    });

    this.get(/\#\/browse\/$/, function() {
        app.setLocation('#/browse/0/');
    });

    this.get(/\#\/browse\/(\d+)\/(.*)/, function() {
        prepare();
        $('body').addClass('view-browse');
        var rawSplat = this.params['splat'][1];
        // Decode only once — handles both encoded and raw paths
        try {
            browsepath = decodeURIComponent(rawSplat);
        } catch(e) {
            browsepath = rawSplat;
        }
        pagination = parseInt(this.params['splat'][0]);
        filter = undefined;
        current_app = 'browse';
        $('#nav-browse').addClass('active');
        $('#panel-title').text("📁 Müzik Kütüphanesi");

        $('#salamisandwich').removeClass('hide').show().find("tr:gt(0)").remove();
        if (!browsepath) {
            $('#breadcrump').removeClass('hide').empty().append("<li><a href=\"#/browse/0/\">root</a></li>");
        }
        socket.send('MPD_API_GET_BROWSE,'+pagination+','+(browsepath ? browsepath : ""));
        // Don't add all songs from root
        if (browsepath) {
            var add_all_songs = $('#add-all-songs');
            add_all_songs.off(); // remove previous binds
            add_all_songs.on('click', function() {
                socket.send('MPD_API_ADD_TRACK,'+browsepath);
            });
            add_all_songs.removeClass('hide').show();
        }

        $('#panel-heading').text("Browse database: "+browsepath);
        var path_array = browsepath.split('/');
        var full_path = "";
        $.each(path_array, function(index, chunk) {
            if(path_array.length - 1 == index) {
                $('#breadcrump').append("<li class=\"active\">"+ chunk + "</li>");
                return;
            }

            full_path = full_path + chunk;
            $('#breadcrump').append("<li><a href=\"#/browse/0/" + full_path + "\">"+chunk+"</a></li>");
            full_path += "/";
        });
        $('#browse').addClass('active');
    });

    this.get(/\#\/search\/(.*)/, function() {
        prepare();
        $('body').addClass('view-search');
        current_app = 'search';
        $('#panel-title').text("🔍 Arama Sonuçları");
        $('#salamisandwich').removeClass('hide').find("tr:gt(0)").remove();
        $('#dirble_panel').addClass('hide');
        var searchstr = this.params['splat'][0];

        $('#search > div > input').val(searchstr);
        socket.send('MPD_API_SEARCH,' + searchstr);
    });

    this.get(/\#\/dirble\/(\d+)\/(\d+)/, function() {
        prepare();
        current_app = 'dirble';
        $('#breadcrump').removeClass('hide').empty().append("<li><a href=\"#/dirble/\">Categories</a></li><li>"+dirble_selected_cat+"</li>");
        $('#salamisandwich').addClass('hide');
        $('#dirble_panel').removeClass('hide');
        $('#dirble_loading').removeClass('hide');
        $('#dirble_left').find("tr:gt(0)").remove();
        $('#dirble_right').find("tr:gt(0)").remove();

        $('#panel-heading').text("Dirble");
        $('#dirble').addClass('active');

        $('#next').addClass('hide');

        if (this.params['splat'][1] > 1) $('#prev').removeClass('hide');
        else $('#prev').addClass('hide');

        dirble_catid = this.params['splat'][0];
        dirble_page = this.params['splat'][1];

        dirble_stations = true;

        if (dirble_api_token) { dirble_load_stations(); }
    });

    this.get(/\#\/dirble\//, function() {
        prepare();
        current_app = 'dirble';
        $('#breadcrump').removeClass('hide').empty().append("<li>Categories</li>");
        $('#salamisandwich').addClass('hide');
        $('#dirble_panel').removeClass('hide');
        $('#dirble_loading').removeClass('hide');
        $('#dirble_left').find("tr:gt(0)").remove();
        $('#dirble_right').find("tr:gt(0)").remove();

        $('#panel-heading').text("Dirble");
        $('#dirble').addClass('active');

        dirble_stations = false;

        if (dirble_api_token) { dirble_load_categories(); }
    });

    this.get("/", function(context) {
        context.redirect("#/0");
    });
});

$(document).ready(function(){
    webSocketConnect();
    $("#volumeslider").slider(0);
    $("#volumeslider").on('slider.newValue', function(evt,data){
        socket.send("MPD_API_SET_VOLUME,"+data.val);
    });

    // Custom seekbar click handler
    $(document).on('click', '#seekbar, #seekbar-queue', function(e) {
        if (!current_song || current_song.currentSongId < 0 || !current_song.totalTime) return;
        var rect = this.getBoundingClientRect();
        var pct = (e.clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        var seekVal = Math.round(pct * current_song.totalTime);
        socket.send('MPD_API_SET_SEEK,' + current_song.currentSongId + ',' + seekVal);
    });

    add_filter();
});

function webSocketConnect() {
    if (typeof MozWebSocket != "undefined") {
        socket = new MozWebSocket(get_appropriate_ws_url());
    } else {
        socket = new WebSocket(get_appropriate_ws_url());
    }

    try {
        socket.onopen = function() {
            console.log("connected");
            $('.top-right').notify({
                message:{text:"Connected to ympd"},
                fadeOut: { enabled: true, delay: 500 }
            }).show();

            app.run();
            /* emit initial request for output names */
            socket.send('MPD_API_GET_OUTPUTS');
            /* emit initial request for dirble api token */
            socket.send('MPD_API_GET_DIRBLEAPITOKEN');
        }

        socket.onmessage = function got_packet(msg) {
            if(msg.data === last_state || msg.data.length == 0)
                return;

            var obj = JSON.parse(msg.data);

            switch (obj.type) {
                case 'queue':
                    if(current_app !== 'queue')
                        break;

                    $('#salamisandwich > tbody').empty();
                    var totalSongs = obj.data.length;
                    for (var song in obj.data) {
                        var minutes = Math.floor(obj.data[song].duration / 60);
                        var seconds = obj.data[song].duration - minutes * 60;
                        var pos1Based = obj.data[song].pos + 1;

                        var playBtn = "<button type=\"button\" class=\"btn-track-action btn-play-track\" style=\"margin-right: 8px; flex-shrink: 0;\" title=\"Şarkıyı Çal\" onclick=\"event.stopPropagation(); playSingleTrack(" + obj.data[song].id + ");\"><span class=\"glyphicon glyphicon-play\"></span></button>";

                        $('#salamisandwich > tbody').append(
                            "<tr trackid=\"" + obj.data[song].id + "\" data-pos=\"" + pos1Based + "\" class=\"song-row\">" +
                                "<td class=\"song-title\"><div class=\"song-title-wrapper\">" + playBtn + "<span class=\"song-title-text\">" + obj.data[song].title + "</span></div></td>" +
                                "<td class=\"song-artist\">" + (obj.data[song].artist || '') + "</td>" +
                                "<td class=\"song-album\">" + (obj.data[song].album  || '') + "</td>" +
                                "<td class=\"text-right font-mono song-duration-col\">" + minutes + ":" + (seconds < 10 ? '0' : '') + seconds + "</td>" +
                                "</tr>");

                    }

                    if(obj.data.length && obj.data[obj.data.length-1].pos + 1 >= pagination + MAX_ELEMENTS_PER_PAGE)
                        $('#next').removeClass('hide');
                    if(pagination > 0)
                        $('#prev').removeClass('hide');

                    $('#salamisandwich > tbody').off('click', 'tr').on('click', 'tr', function(e) {
                        if ($(e.target).closest('button, input, .track-action-buttons').length) {
                            return;
                        }
                        var $tr = $(this);
                        $tr.toggleClass('selected');
                        updateBatchToolbar();
                    });
                    //Helper function to keep table row from collapsing when being sorted
                    var fixHelperModified = function(e, tr) {
                      var $originals = tr.children();
                      var $helper = tr.clone();
                      $helper.children().each(function(index)
                      {
                        $(this).width($originals.eq(index).width())
                      });
                      return $helper;
                    };
                    
                    //Make queue table sortable
                    $('#salamisandwich > tbody').sortable({
                      helper: fixHelperModified,
                      stop: function(event,ui) {renumber_table('#salamisandwich',ui.item)}
                    }).disableSelection();
                    break;
                case 'search':
                    $('#wait').modal('hide');
                case 'browse':
                    if(current_app !== 'browse' && current_app !== 'search')
                        break;

                    /* The use of encodeURI() below might seem useless, but it's not. It prevents
                     * some browsers, such as Safari, from changing the normalization form of the
                     * URI from NFD to NFC, breaking our link with MPD.
                     */
                    if ($('#salamisandwich > tbody').is(':ui-sortable')) {
                        $('#salamisandwich > tbody').sortable('destroy');
                    }
                    $('#salamisandwich > tbody').empty();
                    for (var item in obj.data) {
                        switch(obj.data[item].type) {
                            case 'directory':
                                var clazz = 'dir';
                                var rawDir = obj.data[item].dir;
                                var dirPath = encodeURI(rawDir);
                                var dirActions = "<div class=\"track-action-buttons\">" +
                                    "<button type=\"button\" class=\"btn-track-action btn-add-track\" title=\"Listeye Ekle (+)\" onclick=\"event.stopPropagation(); socket.send('MPD_API_ADD_TRACK,' + decodeURI($(this).closest('tr').attr('uri')));\"><span class=\"glyphicon glyphicon-plus\"></span></button>" +
                                    "</div>";
                                $('#salamisandwich > tbody').append(
                                    "<tr uri=\"" + dirPath + "\" data-rawdir=\"" + rawDir.replace(/"/g, '&quot;') + "\" class=\"" + clazz + "\">" +
                                    "<td class=\"song-title\"><span class=\"glyphicon glyphicon-folder-open\" style=\"color: var(--ctp-peach); margin-right: 8px;\"></span><a>" + basename(rawDir) + "</a></td>" +
                                    "<td class=\"song-artist\"></td>" +
                                    "<td class=\"song-album\"></td>" +
                                    "<td class=\"song-duration-col\"></td>" +
                                    "<td class=\"text-right song-actions-cell\"><button type='button' class='btn-track-action btn-add-track' title='Listeye Ekle (+)' onclick='event.stopPropagation(); socket.send(\"MPD_API_ADD_TRACK,\" + decodeURI($(this).closest(\"tr\").attr(\"uri\")))'><span class='glyphicon glyphicon-plus'></span></button></td>" +
                                    "</tr>"
                                );
                                break;
                            case 'playlist':
                                var clazz = 'plist';
                                if (filter !== "||") {
                                    clazz += ' hide';
                                }
                                var plistPath = encodeURI(obj.data[item].plist);
                                var plistActions = "<div class=\"track-action-buttons\">" +
                                    "<button type=\"button\" class=\"btn-track-action btn-add-track\" title=\"Listeye Ekle (+)\" onclick=\"event.stopPropagation(); socket.send('MPD_API_ADD_PLAYLIST,' + '" + plistPath + "');\"><span class=\"glyphicon glyphicon-plus\"></span></button>" +
                                    "</div>";
                                $('#salamisandwich > tbody').append(
                                    "<tr uri=\"" + plistPath + "\" class=\"" + clazz + "\">" +
                                    "<td class=\"song-title\"><span class=\"glyphicon glyphicon-list\" style=\"color: var(--ctp-mauve); margin-right: 8px;\"></span><a>" + basename(obj.data[item].plist) + "</a></td>" +
                                    "<td class=\"song-artist\"></td>" +
                                    "<td class=\"song-album\"></td>" +
                                    "<td class=\"song-duration-col\"></td>" +
                                    "<td class=\"text-right song-actions-cell\">" + plistActions + "</td>" +
                                    "</tr>"
                                );
                                break;
                            case 'song':
                                var minutes = Math.floor(obj.data[item].duration / 60);
                                var seconds = obj.data[item].duration - minutes * 60;
                                var songUri = encodeURI(obj.data[item].uri);

                                var songActions = "<div class=\"track-action-buttons\">" +
                                    "<button type=\"button\" class=\"btn-track-action btn-add-track\" title=\"Listeye Ekle (+)\" onclick=\"event.stopPropagation(); socket.send('MPD_API_ADD_TRACK,' + '" + songUri + "');\"><span class=\"glyphicon glyphicon-plus\"></span></button>" +
                                    "</div>";

                                var songTitle = obj.data[item].title || basename(decodeURI(songUri)) || 'Şarkı';
                                var titleHtml = "<span class=\"glyphicon glyphicon-music\" style=\"color: var(--ctp-green); margin-right: 8px;\"></span>" + songTitle;

                                if (typeof obj.data[item].artist === 'undefined') {
                                    var details = "<td class=\"song-title song-title-full\" colspan=\"3\">" + titleHtml + "</td>";
                                } else {
                                    var details = "<td class=\"song-title\">" + titleHtml + "</td><td class=\"song-artist\">" + (obj.data[item].artist || '') + "</td><td class=\"song-album\">" + (obj.data[item].album || '') + "</td>";
                                }

                                $('#salamisandwich > tbody').append(
                                    "<tr uri=\"" + songUri + "\" class=\"song song-row\">" +
                                    details +
                                    "<td class=\"text-right font-mono song-duration-col\">" + minutes + ":" + (seconds < 10 ? '0' : '') + seconds + "</td>" +
                                    "<td class=\"text-right song-actions-cell\">" + songActions + "</td>" +
                                    "</tr>"
                                );

                                break;
                            case 'wrap':
                                if(current_app == 'browse') {
                                    $('#next').removeClass('hide');
                                } else {
                                    $('#salamisandwich > tbody').append(
                                        "<tr><td><span class=\"glyphicon glyphicon-remove\"></span></td>" +
                                        "<td colspan=\"2\">Too many results, please refine your search!</td>" +
                                        "<td></td><td></td></tr>"
                                    );
                                }
                                break;
                        }

                        if(pagination > 0)
                            $('#prev').removeClass('hide');
                    }

                    $('#salamisandwich > tbody > tr').off('click').on('click', function(e) {
                        if ($(e.target).closest('button, input, .track-action-buttons').length) {
                            return;
                        }
                        var $tr = $(this);
                        if ($tr.hasClass('dir')) {
                            pagination = 0;
                            var rawdir = $tr.attr('data-rawdir') || decodeURI($tr.attr('uri'));
                            if (window.app) {
                                app.setLocation('#/browse/0/' + encodeURIComponent(rawdir));
                            }
                        } else if ($tr.hasClass('song')) {
                            socket.send('MPD_API_ADD_TRACK,' + decodeURI($tr.attr('uri')));
                        } else if ($tr.hasClass('plist')) {
                            socket.send('MPD_API_ADD_PLAYLIST,' + decodeURI($tr.attr('uri')));
                        }
                    });

                    break;
                case 'state':
                    updatePlayIcon(obj.data.state);
                    updateVolumeIcon(obj.data.volume);

                    if(JSON.stringify(obj) === JSON.stringify(last_state))
                        break;

                    current_song.totalTime  = obj.data.totalTime;
                    current_song.currentSongId = obj.data.currentsongid;
                    current_song.songpos = obj.data.songpos;
                    var total_minutes = Math.floor(obj.data.totalTime / 60);
                    var total_seconds = obj.data.totalTime - total_minutes * 60;

                    var elapsed_minutes = Math.floor(obj.data.elapsedTime / 60);
                    var elapsed_seconds = obj.data.elapsedTime - elapsed_minutes * 60;

                    $('#volumeslider').slider(obj.data.volume);
                    $('#volume-text').text((obj.data.volume !== undefined ? obj.data.volume : 0) + '%');

                    var progress = (obj.data.totalTime > 0)
                        ? Math.min(100, Math.max(0, (obj.data.elapsedTime / obj.data.totalTime) * 100))
                        : 0;
                    updateSeekbar(progress);

                    // Start client-side ticker so bar moves smoothly between WebSocket updates
                    clearInterval(window._seekTicker);
                    if (obj.data.state === 'play' && obj.data.totalTime > 0) {
                        var _elapsed = obj.data.elapsedTime;
                        var _total   = obj.data.totalTime;
                        window._seekTicker = setInterval(function() {
                            _elapsed += 1;
                            if (_elapsed > _total) {
                                _elapsed = _total;
                                clearInterval(window._seekTicker);
                            }
                            var pct = (_elapsed / _total) * 100;
                            updateSeekbar(pct);
                            var em = Math.floor(_elapsed / 60);
                            var es = Math.floor(_elapsed % 60);
                            var tm = Math.floor(_total / 60);
                            var ts = Math.floor(_total % 60);
                            $('#counter').text(em + ':' + (es < 10 ? '0' : '') + es + ' / ' + tm + ':' + (ts < 10 ? '0' : '') + ts);
                        }, 1000);
                    }

                    $('#counter')
                    .text(elapsed_minutes + ":" + 
                        (elapsed_seconds < 10 ? '0' : '') + elapsed_seconds + " / " +
                        total_minutes + ":" + (total_seconds < 10 ? '0' : '') + total_seconds);

                    $('#salamisandwich > tbody > tr').removeClass('active').css("font-weight", "");
                    $('#salamisandwich > tbody > tr .eq-container').remove();
                    var activeTr = $('#salamisandwich > tbody > tr[trackid='+obj.data.currentsongid+']');
                    activeTr.addClass('active').css("font-weight", "bold");
                    if (activeTr.length && !activeTr.find('.eq-container').length) {
                        activeTr.find('td:first-child').prepend('<div class="eq-container"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>');
                    }

                    if(obj.data.random)
                        $('#btnrandom').addClass("active")
                    else
                        $('#btnrandom').removeClass("active");

                    if(obj.data.consume)
                        $('#btnconsume').addClass("active")
                    else
                        $('#btnconsume').removeClass("active");

                    if(obj.data.single)
                        $('#btnsingle').addClass("active")
                    else
                        $('#btnsingle').removeClass("active");

                    if(obj.data.crossfade)
                        $('#btncrossfade').addClass("active")
                    else
                        $('#btncrossfade').removeClass("active");

                    if(obj.data.repeat)
                        $('#btnrepeat').addClass("active")
                    else
                        $('#btnrepeat').removeClass("active");

                    last_state = obj;
                    break;
                case 'outputnames':
                    $('#btn-outputs-block button').remove();
                    if (obj.data.length > 1) {
		        $.each(obj.data, function(id, name){
                            var btn = $('<button id="btnoutput'+id+'" class="btn btn-default" onclick="toggleoutput(this, '+id+')"><span class="glyphicon glyphicon-volume-up"></span> '+name+'</button>');
                            btn.appendTo($('#btn-outputs-block'));
                        });
		    } else {
                        $('#btn-outputs-block').addClass('hide');
		    }
                    /* remove cache, since the buttons have been recreated */
                    last_outputs = '';
                    break;
                case 'outputs':
                    if(JSON.stringify(obj) === JSON.stringify(last_outputs))
                        break;
                    $.each(obj.data, function(id, enabled){
                        if (enabled)
                        $('#btnoutput'+id).addClass("active");
                        else
                        $('#btnoutput'+id).removeClass("active");
                    });
                    last_outputs = obj;
                    break;
                case 'disconnected':
                    if($('.top-right').has('div').length == 0)
                        $('.top-right').notify({
                            message:{text:"ympd lost connection to MPD "},
                            type: "danger",
                            fadeOut: { enabled: true, delay: 1000 },
                        }).show();
                    break;
                case 'update_queue':
                    if(current_app === 'queue')
                        socket.send('MPD_API_GET_QUEUE,'+pagination);
                    break;
                case 'song_change':

                    $('#album').text("");
                    $('#artist').text("");

					$('#btnlove').removeClass("active");

                    $('#currenttrack').text(" " + obj.data.title);
                    var notification = "<strong><h4>" + obj.data.title + "</h4></strong>";

                    if(obj.data.album) {
                        $('#album').text(obj.data.album);
                        notification += obj.data.album + "<br />";
                    }
                    if(obj.data.artist) {
                        $('#artist').text(obj.data.artist);
                        notification += obj.data.artist + "<br />";
                    }

                    if (typeof $.cookie === 'function' && $.cookie("notification") === "true")
                        songNotify(obj.data.title, obj.data.artist, obj.data.album );
                    else
                        $('.top-right').notify({
                            message:{html: notification},
                            type: "info",
                        }).show();
                        
                    break;
                case 'mpdhost':
                    $('#mpdhost').val(obj.data.host);
                    $('#mpdport').val(obj.data.port);
                    if(obj.data.passwort_set)
                        $('#mpd_password_set').removeClass('hide');
                    break;
                case 'dirbleapitoken':
                    dirble_api_token = obj.data;
                    
		    if (dirble_api_token) {
		        $('#dirble').removeClass('hide');

                        if (dirble_stations) { dirble_load_stations();   }
                        else {                 dirble_load_categories(); }

                    } else {
                        $('#dirble').addClass('hide');
		    }
                    break;
                case 'error':
                    $('.top-right').notify({
                        message:{text: obj.data},
                        type: "danger",
                    }).show();
                default:
                    break;
            }
        }

        socket.onclose = function(){
            console.log("disconnected");
            $('.top-right').notify({
                message:{text:"Connection to ympd lost, retrying in 3 seconds "},
                type: "danger", 
                onClose: function () {
                    webSocketConnect();
                }
            }).show();
        }

    } catch(exception) {
        alert('<p>Error' + exception);
    }

}

function get_appropriate_ws_url()
{
    var pcol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
    return pcol + location.host + '/ws';
}

var updateVolumeIcon = function(volume)
{
    $("#volume-icon").removeClass("glyphicon-volume-off");
    $("#volume-icon").removeClass("glyphicon-volume-up");
    $("#volume-icon").removeClass("glyphicon-volume-down");

    if(volume == 0) {
        $("#volume-icon").addClass("glyphicon-volume-off");
    } else if (volume < 50) {
        $("#volume-icon").addClass("glyphicon-volume-down");
    } else {
        $("#volume-icon").addClass("glyphicon-volume-up");
    }
}

var updatePlayIcon = function(state)
{
    if(state == 1) { // stop
        $("#play-icon").html('').addClass("glyphicon-play").removeClass("glyphicon-pause");
        $('#vinyl-disk').removeClass('spinning');
    } else if(state == 2) { // pause
        $("#play-icon").html('').addClass("glyphicon-play").removeClass("glyphicon-pause");
        $('#vinyl-disk').removeClass('spinning');
    } else { // play
        $("#play-icon").html('').addClass("glyphicon-pause").removeClass("glyphicon-play");
        $('#vinyl-disk').addClass('spinning');
    }
}

function updateDB() {
    socket.send('MPD_API_UPDATE_DB');
    $('.top-right').notify({
        message:{text:"Updating MPD Database... "}
    }).show();
}

function clickPlay() {
    if($('#track-icon').hasClass('glyphicon-stop'))
        socket.send('MPD_API_SET_PLAY');
    else
        socket.send('MPD_API_SET_PAUSE');
}

function trash(tr) {
    if ( $('#btntrashmodeup').hasClass('active') ) {
        socket.send('MPD_API_RM_RANGE,0,' + (tr.index() + 1));
        tr.remove();
    } else if ( $('#btntrashmodesingle').hasClass('active') ) {
        socket.send('MPD_API_RM_TRACK,' + tr.attr('trackid'));
        tr.remove();
    } else if ( $('#btntrashmodedown').hasClass('active') ) {
        socket.send('MPD_API_RM_RANGE,' + tr.index() + ',-1');
        tr.remove();
    };
}

function renumber_table(tableID,item) {
    var was = parseInt(item.attr("data-pos") || item.children("td").eq(1).text(), 10);
    var is = item.index() + 1;

    if (!isNaN(was) && was != is) {
        socket.send("MPD_API_MOVE_TRACK," + was + "," + is);
        socket.send('MPD_API_GET_QUEUE,'+pagination);
    }
}

function basename(path) {
    return path.split('/').reverse()[0];
}

function clickLove() {
    socket.send("MPD_API_SEND_MESSAGE,mpdas," + ($('#btnlove').hasClass('active') ? "unlove" : "love"));
	if ( $('#btnlove').hasClass('active') )
		$('#btnlove').removeClass("active");
	else
		$('#btnlove').addClass("active");
}

$('#btnrandom').on('click', function (e) {
    socket.send("MPD_API_TOGGLE_RANDOM," + ($(this).hasClass('active') ? 0 : 1));

});
$('#btnconsume').on('click', function (e) {
    socket.send("MPD_API_TOGGLE_CONSUME," + ($(this).hasClass('active') ? 0 : 1));

});
$('#btnsingle').on('click', function (e) {
    socket.send("MPD_API_TOGGLE_SINGLE," + ($(this).hasClass('active') ? 0 : 1));
});
$('#btncrossfade').on('click', function(e) {
    socket.send("MPD_API_TOGGLE_CROSSFADE," + ($(this).hasClass('active') ? 0 : 1));
});
$('#btnrepeat').on('click', function (e) {
    socket.send("MPD_API_TOGGLE_REPEAT," + ($(this).hasClass('active') ? 0 : 1));
});

function toggleoutput(button, id) {
    socket.send("MPD_API_TOGGLE_OUTPUT,"+id+"," + ($(button).hasClass('active') ? 0 : 1));
}

$('#trashmode').children("button").on('click', function(e) {
    $('#trashmode').children("button").removeClass("active");
    $(this).addClass("active");
});

$('#btnnotify').on('click', function (e) {
    if($.cookie("notification") === "true") {
        $.cookie("notification", false);
    } else {
        Notification.requestPermission(function (permission) {
            if(!('permission' in Notification)) {
                Notification.permission = permission;
            }

            if (permission === "granted") {
                $.cookie("notification", true, { expires: 424242 });
                $('btnnotify').addClass("active");
            }
        });
    }
});

function getHost() {
    socket.send('MPD_API_GET_MPDHOST');

    function onEnter(event) {
      if ( event.which == 13 ) {
        confirmSettings();
      }
    }

    $('#mpdhost').keypress(onEnter);
    $('#mpdport').keypress(onEnter);
    $('#mpd_pw').keypress(onEnter);
    $('#mpd_pw_con').keypress(onEnter);
}

$('#search').submit(function () {
    app.setLocation("#/search/"+$('#search > div > input').val());
    $('#wait').modal('show');
    setTimeout(function() {
        $('#wait').modal('hide');
    }, 10000);
    return false;
});

$('.page-btn').on('click', function (e) {

    switch ($(this).text()) {
        case "Next":
            if (current_app == "dirble") dirble_page++;
            else pagination += MAX_ELEMENTS_PER_PAGE;
            break;
        case "Previous":
            if (current_app == "dirble") dirble_page--
            else {
                pagination -= MAX_ELEMENTS_PER_PAGE;
                if(pagination <= 0)
                    pagination = 0;
            }
            break;
    }

    switch(current_app) {
        case "queue":
            app.setLocation('#/'+pagination);
            break;
        case "browse":
            app.setLocation('#/browse/'+pagination+'/'+browsepath);
            break;
        case "dirble":
            app.setLocation("#/dirble/"+dirble_catid+"/"+dirble_page);
            break;
    }
    e.preventDefault();
});

function addStream() {
    if($('#streamurl').val().length > 0) {
        socket.send('MPD_API_ADD_TRACK,'+$('#streamurl').val());
    }
    $('#streamurl').val("");
    $('#addstream').modal('hide');
}

function saveQueue() {
    if($('#playlistname').val().length > 0) {
        socket.send('MPD_API_SAVE_QUEUE,'+$('#playlistname').val());
    }
    $('#savequeue').modal('hide');
}

function confirmSettings() {
    if($('#mpd_pw').val().length + $('#mpd_pw_con').val().length > 0) {
        if ($('#mpd_pw').val() !== $('#mpd_pw_con').val())
        {
            $('#mpd_pw_con').popover('show');
            setTimeout(function() {
                $('#mpd_pw_con').popover('hide');
            }, 2000);
            return;
        } else
            socket.send('MPD_API_SET_MPDPASS,'+$('#mpd_pw').val());
    }
    socket.send('MPD_API_SET_MPDHOST,'+$('#mpdport').val()+','+$('#mpdhost').val());
    $('#settings').modal('hide');
}

$('#mpd_password_set > button').on('click', function (e) {
    socket.send('MPD_API_SET_MPDPASS,');
    $('#mpd_pw').val("");
    $('#mpd_pw_con').val("");
    $('#mpd_password_set').addClass('hide');
})

function notificationsSupported() {
    return "Notification" in window;
}

function songNotify(title, artist, album) {
    /*var opt = {
        type: "list",
        title: title,
        message: title,
        items: []
    }
    if(artist.length > 0)
        opt.items.push({title: "Artist", message: artist});
    if(album.length > 0)
        opt.items.push({title: "Album", message: album});
*/
    //chrome.notifications.create(id, options, creationCallback);

    var textNotification = "";
    if(typeof artist != 'undefined' && artist.length > 0)
        textNotification += " " + artist;
    if(typeof album != 'undefined' && album.length > 0)
        textNotification += "\n " + album;

    var notification = new Notification(title, {icon: 'assets/favicon.ico', body: textNotification});
    setTimeout(function(notification) {
        notification.close();
    }, 3000, notification);
}

$(document).keydown(function(e){
    if (e.target.tagName == 'INPUT') {
        return;
    }
    switch (e.which) {
        case 37: //left
            socket.send('MPD_API_SET_PREV');
            break;
        case 39: //right
            socket.send('MPD_API_SET_NEXT');
            break;
        case 32: //space
            clickPlay();
            break;
        default:
            return;
    }
    e.preventDefault();
});

function dirble_load_categories() {

    dirble_page = 1;

    $.getJSON( "https://api.dirble.com/v2/categories?token=" + dirble_api_token, function( data ) {

        $('#dirble_loading').addClass('hide');

        data = data.sort(function(a, b) {
            return (a.title > b.title) ? 1 : 0;
        });

        var max = data.length - data.length%2;

        for(i = 0; i < max; i+=2) {

            $('#dirble_left > tbody').append(
                "<tr><td catid=\""+data[i].id+"\">"+data[i].title+"</td></tr>"
            );

            $('#dirble_right > tbody').append(
                "<tr><td catid=\""+data[i+1].id+"\">"+data[i+1].title+"</td></tr>"
            );
        }

        if (max != data.length) {
            $('#dirble_left > tbody').append(
                "<tr><td catid=\""+data[max].id+"\">"+data[max].title+"</td></tr>"
            );
        }

        $('#dirble_left > tbody > tr > td').on({
            click: function() {
                dirble_selected_cat = $(this).text();
                dirble_catid = $(this).attr("catid");
                app.setLocation("#/dirble/"+dirble_catid+"/"+dirble_page);
            }
        });

        $('#dirble_right > tbody > tr > td').on({
            click: function() {
                dirble_selected_cat = $(this).text();
                dirble_catid = $(this).attr("catid");
                app.setLocation("#/dirble/"+dirble_catid+"/"+dirble_page);
            }
        });
    });
}


function dirble_load_stations() {

    $.getJSON( "https://api.dirble.com/v2/category/"+dirble_catid+"/stations?page="+dirble_page+"&per_page=20&token=" + dirble_api_token, function( data ) {

        $('#dirble_loading').addClass('hide');
        if (data.length == 20) $('#next').removeClass('hide');

        var max = data.length - data.length%2;

        for(i = 0; i < max; i+=2) {

            $('#dirble_left > tbody').append(
                "<tr><td radioid=\""+data[i].id+"\">"+data[i].name+"</td></tr>"
            );
            $('#dirble_right > tbody').append(
                "<tr><td radioid=\""+data[i+1].id+"\">"+data[i+1].name+"</td></tr>"
            );
        }

        if (max != data.length) {
            $('#dirble_left > tbody').append(
                "<tr><td radioid=\""+data[max].id+"\">"+data[max].name+"</td></tr>"
            );
        }

        $('#dirble_left > tbody > tr > td').on({
            click: function() {
                var _this = $(this);

                $.getJSON( "https://api.dirble.com/v2/station/"+$(this).attr("radioid")+"?token=" + dirble_api_token, function( data ) {

                    socket.send("MPD_API_ADD_TRACK," + data.streams[0].stream);
                    $('.top-right').notify({
                        message:{
                            text: _this.text() + " added"
                        }
                    }).show();
                });
            },
            mouseenter: function() {
                var _this = $(this);

                $(this).last().append(
                "<a role=\"button\" class=\"pull-right btn-group-hover\">" +
                "<span class=\"glyphicon glyphicon-play\"></span></a>").find('a').click(function(e) {
                    e.stopPropagation();

                    $.getJSON( "https://api.dirble.com/v2/station/"+_this.attr("radioid")+"?token=" + dirble_api_token, function( data ) {

                        socket.send("MPD_API_ADD_PLAY_TRACK," + data.streams[0].stream);
                        $('.top-right').notify({
                            message:{
                                text: _this.text() + " added"
                            }
                        }).show();
                    });
                }).fadeTo('fast',1);
            },

            mouseleave: function(){
                $(this).last().find("a").stop().remove();
            }
        });

        $('#dirble_right> tbody > tr > td').on({
            click: function() {
                var _this = $(this);

                $.getJSON( "https://api.dirble.com/v2/station/"+$(this).attr("radioid")+"?token=" + dirble_api_token, function( data ) {

                    socket.send("MPD_API_ADD_TRACK," + data.streams[0].stream);
                    $('.top-right').notify({
                        message:{
                            text: _this.text() + " added"
                        }
                    }).show();
                });
            },
            mouseenter: function() {
                var _this = $(this);

                $(this).last().append(
                "<a role=\"button\" class=\"pull-right btn-group-hover\">" +
                "<span class=\"glyphicon glyphicon-play\"></span></a>").find('a').click(function(e) {
                    e.stopPropagation();

                    $.getJSON( "https://api.dirble.com/v2/station/"+_this.attr("radioid")+"?token=" + dirble_api_token, function( data ) {

                        socket.send("MPD_API_ADD_PLAY_TRACK," + data.streams[0].stream);
                        $('.top-right').notify({
                            message:{
                                text: _this.text() + " added"
                            }
                        }).show();
                    });
                }).fadeTo('fast',1);
            },

            mouseleave: function(){
                $(this).last().find("a").stop().remove();
            }
        });
    });
}

function set_filter (c) {
    return;
}

function add_filter () {
    return;
}

function updateBatchToolbar() {
    var selectedCount = $('#salamisandwich > tbody > tr.selected').length;
    if (selectedCount > 0) {
        $('#batch-count-badge').text(selectedCount + ' seçildi');
        $('#batch-count-indicator').removeClass('hide');
        $('#btn-batch-queue-next, #btn-batch-delete, #btn-batch-move-up, #btn-batch-move-down').removeClass('disabled').prop('disabled', false);
    } else {
        $('#batch-count-indicator').addClass('hide');
        $('#btn-batch-queue-next, #btn-batch-delete, #btn-batch-move-up, #btn-batch-move-down').addClass('disabled').prop('disabled', true);
    }
}

function moveTrackUp(pos) {
    if (pos <= 1) return;
    if (typeof socket !== 'undefined' && socket && socket.readyState === 1) {
        socket.send("MPD_API_MOVE_TRACK," + pos + "," + (pos - 1));
        socket.send('MPD_API_GET_QUEUE,' + pagination);
    }
}

function moveTrackDown(pos) {
    if (typeof socket !== 'undefined' && socket && socket.readyState === 1) {
        socket.send("MPD_API_MOVE_TRACK," + pos + "," + (pos + 1));
        socket.send('MPD_API_GET_QUEUE,' + pagination);
    }
}

function queueNextTrackId(songId, pos1Based) {
    var currentPos = (current_song && current_song.songpos !== undefined && current_song.songpos >= 0) ? current_song.songpos + 1 : 1;
    var targetPos = currentPos + 1;
    if (targetPos === pos1Based) return;
    socket.send("MPD_API_MOVE_TRACK," + pos1Based + "," + targetPos);
    socket.send('MPD_API_GET_QUEUE,' + pagination);
}

function addSongQueueNext(uri) {
    socket.send("MPD_API_ADD_TRACK," + decodeURI(uri));
    setTimeout(function() {
        var currentPos = (current_song && current_song.songpos !== undefined && current_song.songpos >= 0) ? current_song.songpos + 1 : 1;
        var total = $('#salamisandwich > tbody > tr').length;
        if (total > 0) {
            socket.send("MPD_API_MOVE_TRACK," + total + "," + (currentPos + 1));
            socket.send('MPD_API_GET_QUEUE,' + pagination);
        }
    }, 150);
}

function moveSelectedUp() {
    var selectedRows = $('#salamisandwich > tbody > tr.selected');
    if (!selectedRows.length) return;

    var rows = selectedRows.map(function() {
        var pos = parseInt($(this).attr('data-pos'), 10);
        return { el: this, pos: pos };
    }).get();

    rows.sort(function(a, b) { return a.pos - b.pos; });

    rows.forEach(function(item) {
        if (item.pos > 1) {
            socket.send("MPD_API_MOVE_TRACK," + item.pos + "," + (item.pos - 1));
        }
    });
    socket.send('MPD_API_GET_QUEUE,' + pagination);
}

function moveSelectedDown() {
    var selectedRows = $('#salamisandwich > tbody > tr.selected');
    if (!selectedRows.length) return;

    var rows = selectedRows.map(function() {
        var pos = parseInt($(this).attr('data-pos'), 10);
        return { el: this, pos: pos };
    }).get();

    rows.sort(function(a, b) { return b.pos - a.pos; });

    rows.forEach(function(item) {
        socket.send("MPD_API_MOVE_TRACK," + item.pos + "," + (item.pos + 1));
    });
    socket.send('MPD_API_GET_QUEUE,' + pagination);
}

function queueNextBatch() {
    var selectedRows = $('#salamisandwich > tbody > tr.selected');
    if (!selectedRows.length) {
        queueNextSingle();
        return;
    }

    var currentPos = (current_song && current_song.songpos !== undefined && current_song.songpos >= 0) ? current_song.songpos : 0;

    selectedRows.each(function(index, el) {
        var songId = parseInt($(el).attr('trackid'), 10);
        if (!isNaN(songId)) {
            var targetPos = currentPos + index;
            var payload = JSON.stringify({
                "cmd": "move_next",
                "song_id": songId,
                "current_pos": targetPos
            });
            if (typeof socket !== 'undefined' && socket && socket.readyState === 1) {
                socket.send(payload);
            }
        }
    });

    $('#salamisandwich > tbody > tr.selected').removeClass('selected');
    updateBatchToolbar();
}

function deleteBatch() {
    var selectedRows = $('#salamisandwich > tbody > tr.selected');
    if (!selectedRows.length) return;

    selectedRows.each(function(index, el) {
        var songId = parseInt($(el).attr('trackid'), 10);
        if (!isNaN(songId) && typeof socket !== 'undefined') {
            socket.send('MPD_API_RM_TRACK,' + songId);
        }
    });

    $('#salamisandwich > tbody > tr.selected').removeClass('selected');
    updateBatchToolbar();
}

function queueNextSingle() {
    var selectedRow = $('#salamisandwich > tbody > tr.selected');
    if (!selectedRow.length) {
        selectedRow = $('#salamisandwich > tbody > tr.highlighted');
    }
    if (!selectedRow.length) {
        selectedRow = $('#salamisandwich > tbody > tr:hover');
    }
    if (!selectedRow.length) {
        selectedRow = $('#salamisandwich > tbody > tr.active');
    }
    if (!selectedRow.length) {
        return;
    }

    var songId = parseInt(selectedRow.attr('trackid'), 10);
    if (isNaN(songId)) {
        return;
    }

    var currentPos = 0;
    if (current_song && current_song.songpos !== undefined && current_song.songpos >= 0) {
        currentPos = current_song.songpos;
    } else {
        var activeRow = $('#salamisandwich > tbody > tr.active');
        if (activeRow.length) {
            currentPos = activeRow.index();
        }
    }

    var payload = JSON.stringify({
        "cmd": "move_next",
        "song_id": songId,
        "current_pos": currentPos
    });

    if (typeof socket !== 'undefined' && socket && socket.readyState === 1) {
        socket.send(payload);
    }
}

function queueNext() {
    if ($('.track-checkbox:checked').length > 0) {
        queueNextBatch();
    } else {
        queueNextSingle();
    }
}

function toggleSidebar() {
    $('.ytm-sidebar').toggleClass('open');
    $('.ytm-sidebar-overlay').toggleClass('open');
}

function closeSidebar() {
    $('.ytm-sidebar').removeClass('open');
    $('.ytm-sidebar-overlay').removeClass('open');
}

function playSingleTrack(id) {
    if (typeof socket !== 'undefined' && socket && socket.readyState === 1) {
        $('#salamisandwich > tbody > tr').removeClass('active');
        $('#salamisandwich > tbody > tr[trackid="' + id + '"]').addClass('active');
        socket.send('MPD_API_PLAY_TRACK,' + id);
    }
}

$(document).on('click', '.btn-play-track', function(e) {
    e.stopPropagation();
    var $tr = $(this).closest('tr');
    var trackId = $tr.attr('trackid');
    if (trackId) {
        playSingleTrack(trackId);
    }
});

window.playSingleTrack = playSingleTrack;
window.trash = trash;
window.addSongQueueNext = addSongQueueNext;
window.clickPlay = clickPlay;
window.clickLove = clickLove;
window.queueNext = queueNext;
window.queueNextBatch = queueNextBatch;
window.deleteBatch = deleteBatch;
window.moveTrackUp = moveTrackUp;
window.moveTrackDown = moveTrackDown;
window.moveSelectedUp = moveSelectedUp;
window.moveSelectedDown = moveSelectedDown;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

// Auto-close mobile sidebar when clicking any menu item inside sidebar
$(document).on('click', '.ytm-sidebar a, .ytm-sidebar button', function() {
    if ($(window).width() < 992) {
        closeSidebar();
    }
});

$(document).on('keydown', function(event) {
    var target = event.target;
    var isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    if (event.key === 'Escape') {
        closeSidebar();
        if (isInput) {
            $(target).blur();
        }
        return;
    }

    if (isInput) {
        return;
    }

    var key = event.key;

    // ncmpcpp / Custom Move Track Up (Shift+K / Alt+Up / Ctrl+Up)
    if ((event.shiftKey && (key === 'K' || key === 'k')) || ((event.ctrlKey || event.altKey) && key === 'ArrowUp')) {
        event.preventDefault();
        var selectedRow = $('#salamisandwich > tbody > tr.selected');
        if (selectedRow.length && selectedRow.attr('data-pos')) {
            var pos = parseInt(selectedRow.attr('data-pos'), 10);
            moveTrackUp(pos);
        } else {
            moveSelectedUp();
        }
        return;
    }

    // ncmpcpp / Custom Move Track Down (Shift+J / Alt+Down / Ctrl+Down)
    if ((event.shiftKey && (key === 'J' || key === 'j')) || ((event.ctrlKey || event.altKey) && key === 'ArrowDown')) {
        event.preventDefault();
        var selectedRow = $('#salamisandwich > tbody > tr.selected');
        if (selectedRow.length && selectedRow.attr('data-pos')) {
            var pos = parseInt(selectedRow.attr('data-pos'), 10);
            moveTrackDown(pos);
        } else {
            moveSelectedDown();
        }
        return;
    }

    if (key === '/') {
        event.preventDefault();
        $('#search input').focus();
        return;
    }

    if (key === '?') {
        $('#shortcutModal').modal('toggle');
        return;
    }

    // ncmpcpp Navigation Down (j / ArrowDown)
    if (key === 'j' || key === 'ArrowDown') {
        event.preventDefault();
        var rows = $('#salamisandwich > tbody > tr');
        if (!rows.length) return;
        var selected = rows.filter('.selected');
        var next;
        if (!selected.length) {
            next = rows.first();
        } else {
            next = selected.next('tr');
            if (!next.length) next = selected;
        }
        rows.removeClass('selected');
        next.addClass('selected');
        if (next[0] && next[0].scrollIntoView) {
            next[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        return;
    }

    // ncmpcpp Navigation Up (k / ArrowUp)
    if (key === 'k' || key === 'ArrowUp') {
        event.preventDefault();
        var rows = $('#salamisandwich > tbody > tr');
        if (!rows.length) return;
        var selected = rows.filter('.selected');
        var prev;
        if (!selected.length) {
            prev = rows.last();
        } else {
            prev = selected.prev('tr');
            if (!prev.length) prev = selected;
        }
        rows.removeClass('selected');
        prev.addClass('selected');
        if (prev[0] && prev[0].scrollIntoView) {
            prev[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        return;
    }

    if (key === 'Enter') {
        var selectedRow = $('#salamisandwich > tbody > tr.selected');
        if (selectedRow.length) {
            if (selectedRow.hasClass('dir')) {
                selectedRow.click();
            } else if (selectedRow.attr('trackid')) {
                var trackId = selectedRow.attr('trackid');
                if (trackId && typeof socket !== 'undefined') {
                    $('#salamisandwich > tbody > tr').removeClass('active');
                    selectedRow.addClass('active');
                    socket.send('MPD_API_PLAY_TRACK,' + trackId);
                }
            }
        }
        return;
    }

    // ncmpcpp / Custom Clear Queue (c / C)
    if (key === 'c' || key === 'C') {
        if (typeof socket !== 'undefined') {
            socket.send('MPD_API_RM_ALL');
        }
        return;
    }

    // ncmpcpp Add Item (a / A)
    if (key === 'a' || key === 'A') {
        var selectedRow = $('#salamisandwich > tbody > tr.selected');
        if (selectedRow.length) {
            var addBtn = selectedRow.find('.btn-add-track');
            if (addBtn.length) {
                addBtn.click();
            }
        }
        return;
    }

    // ncmpcpp / Custom Queue Next (ö / Ö)
    if (key === 'ö' || key === 'Ö') {
        queueNext();
        return;
    }

    // ncmpcpp Delete Track (d / D / Delete)
    if (key === 'd' || key === 'D' || key === 'Delete' || key === 'Backspace') {
        var selectedRow = $('#salamisandwich > tbody > tr.selected');
        if (selectedRow.length) {
            var trackId = selectedRow.attr('trackid');
            if (trackId && typeof socket !== 'undefined') {
                socket.send('MPD_API_RM_TRACK,' + trackId);
            }
        }
        return;
    }

    // ncmpcpp Space -> Play / Pause
    if (key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        if (typeof clickPlay === 'function') {
            clickPlay();
        }
        return;
    }

    // ncmpcpp Next / Prev Track (n / > and b / <)
    if (key === 'n' || key === 'N' || key === '>') {
        if (typeof socket !== 'undefined') {
            socket.send('MPD_API_SET_NEXT');
        }
        return;
    }

    if (key === 'b' || key === 'B' || key === '<') {
        if (typeof socket !== 'undefined') {
            socket.send('MPD_API_SET_PREV');
        }
        return;
    }

    // ncmpcpp Toggles: z (random), r (repeat), y (single), x (consume)
    if (key === 'z' || key === 'Z') {
        $('#btnrandom').click();
        return;
    }

    if (key === 'r' || key === 'R') {
        $('#btnrepeat').click();
        return;
    }

    if (key === 'y' || key === 'Y') {
        $('#btnsingle').click();
        return;
    }

    if (key === 'x' || key === 'X') {
        $('#btnconsume').click();
        return;
    }

    // ncmpcpp Update DB (u / U)
    if (key === 'u' || key === 'U') {
        updateDB();
        return;
    }

    // '+' or '=' -> Volume Up (+5)
    if (key === '+' || key === '=') {
        event.preventDefault();
        var curVol = $('#volumeslider').slider('getValue');
        var newVol = Math.min(100, (curVol || 0) + 5);
        if (typeof socket !== 'undefined') {
            socket.send('MPD_API_SET_VOLUME,' + newVol);
        }
        return;
    }

    // '-' -> Volume Down (-5)
    if (key === '-') {
        event.preventDefault();
        var curVol = $('#volumeslider').slider('getValue');
        var newVol = Math.max(0, (curVol || 0) - 5);
        if (typeof socket !== 'undefined') {
            socket.send('MPD_API_SET_VOLUME,' + newVol);
        }
        return;
    }

    // 'm' or 'M' -> Mute / Unmute
    if (key === 'm' || key === 'M') {
        event.preventDefault();
        var curVol = $('#volumeslider').slider('getValue');
        var newVol = (curVol > 0) ? 0 : 50;
        if (typeof socket !== 'undefined') {
            socket.send('MPD_API_SET_VOLUME,' + newVol);
        }
        return;
    }

    // Left Arrow -> Seek -5s
    if (key === 'ArrowLeft') {
        event.preventDefault();
        if (current_song && current_song.currentSongId >= 0 && current_song.totalTime) {
            var curElapsed = (last_state && last_state.data && last_state.data.elapsedTime) ? last_state.data.elapsedTime : 0;
            var newSeek = Math.max(0, curElapsed - 5);
            if (typeof socket !== 'undefined') {
                socket.send('MPD_API_SET_SEEK,' + current_song.currentSongId + ',' + newSeek);
            }
        }
        return;
    }

    // Right Arrow -> Seek +5s
    if (key === 'ArrowRight') {
        event.preventDefault();
        if (current_song && current_song.currentSongId >= 0 && current_song.totalTime) {
            var curElapsed = (last_state && last_state.data && last_state.data.elapsedTime) ? last_state.data.elapsedTime : 0;
            var newSeek = Math.min(current_song.totalTime, curElapsed + 5);
            if (typeof socket !== 'undefined') {
                socket.send('MPD_API_SET_SEEK,' + current_song.currentSongId + ',' + newSeek);
            }
        }
        return;
    }
});

// Ingenious Mouse Wheel Scrolling for Volume & Seeking
$(document).ready(function() {
    // Mouse wheel over Volume Slider or Volume Icon adjusts volume
    $('#volumeslider, #volume-icon').on('wheel', function(e) {
        e.preventDefault();
        var delta = e.originalEvent.deltaY;
        var curVol = $('#volumeslider').slider('getValue');
        var step = delta < 0 ? 5 : -5;
        var newVol = Math.min(100, Math.max(0, (curVol || 0) + step));
        if (typeof socket !== 'undefined') {
            socket.send('MPD_API_SET_VOLUME,' + newVol);
        }
    });

    // Mouse wheel over Seekbar seeks +/- 5 seconds
    $(document).on('wheel', '#seekbar, #seekbar-queue', function(e) {
        e.preventDefault();
        var delta = e.originalEvent.deltaY;
        if (current_song && current_song.currentSongId >= 0 && current_song.totalTime) {
            var curElapsed = (last_state && last_state.data && last_state.data.elapsedTime) ? last_state.data.elapsedTime : 0;
            var step = delta < 0 ? 5 : -5;
            var newSeek = Math.min(current_song.totalTime, Math.max(0, curElapsed + step));
            if (typeof socket !== 'undefined') {
                socket.send('MPD_API_SET_SEEK,' + current_song.currentSongId + ',' + newSeek);
            }
        }
    });
});

// Update both seekbars (player card + playlist queue)
function updateSeekbar(pct) {
    pct = isNaN(pct) ? 0 : Math.min(100, Math.max(0, pct));
    $('#seekbar-fill').css('width', pct + '%');
    $('#seekbar-queue-fill').css('width', pct + '%');
}
window.updateSeekbar = updateSeekbar;
