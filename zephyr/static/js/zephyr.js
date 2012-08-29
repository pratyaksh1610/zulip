$.ajaxSetup({
     beforeSend: function(xhr, settings) {
         function getCookie(name) {
             var cookieValue = null;
             if (document.cookie && document.cookie != '') {
                 var cookies = document.cookie.split(';');
                 for (var i = 0; i < cookies.length; i++) {
                     var cookie = jQuery.trim(cookies[i]);
                     // Does this cookie string begin with the name we want?
                 if (cookie.substring(0, name.length + 1) == (name + '=')) {
                     cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                     break;
                 }
             }
         }
         return cookieValue;
         }
         if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
             // Only send the token to relative URLs i.e. locally.
             xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
         }
     }
});

$(document).keydown(function(event) {
    if (event.keyCode == 38 || event.keyCode == 40) { // down or up arrow
        p = $("#selected");
        tr = $(p).closest("tr");
        td = $(p).closest("td");

        if (event.keyCode == 40) { // down arrow
            // There are probably more verbose but more efficient ways to do this.
            next_zephyr = tr.nextAll(":not(:hidden):first");
        } else { // up arrow
            next_zephyr = tr.prevAll(":not(:hidden):first");
        }
        if (next_zephyr.length != 0) { // We are not at the bottom or top of the zephyrs.
            next_zephyr.children("td:first").html('<p id="selected">&gt;</p>');
            td.empty(); // Clear the previous arrow.
            $.post("update", {pointer: next_zephyr.attr("id")});

            if ($(next_zephyr).offset().top < $("#main_div").offset().top) {
                $("#main_div").scrollTop($("#main_div").scrollTop() - 75);
            }

            if ($(next_zephyr).offset().top + $(next_zephyr).height() > $("#main_div").offset().top + $("#main_div").height()) {
                $("#main_div").scrollTop($("#main_div").scrollTop() + 75);
            }
        }
    } else if (event.keyCode == 82) { // 'r' keypress, for responding to a zephyr
        var parent = $("#selected").parents("tr");
        var zephyr_class = parent.find("span.zephyr_class").text();
	var instance = parent.find("span.zephyr_instance").text();
        $("#class").val(zephyr_class);
        $("#instance").val(instance);
        $("#new_zephyr").focus();
    }
});

function scroll_to_zephyr(target_zephyr, old_offset) {
    // target_zephyr is an id.
    // old_offset is how far from the top of the scroll area the
    // zephyr was before any narrowing or unnarrowing happened.
    var height_above_zephyr = 0;
    $("#table tr:lt(" + $("#" + target_zephyr).index() + ")").each(function() {
        if (!$(this).is(":hidden")) {
            height_above_zephyr += $(this).height();
        }
    });
    $("#main_div").scrollTop(height_above_zephyr + old_offset);
}


function narrow(class_name, target_zephyr) {
    // We want the zephyr on which the narrow happened to stay in the same place if possible.
    var old_top = $("#main_div").offset().top - $("#" + target_zephyr).offset().top;
    $("span.zephyr_class").each(
        function() {
            if ($(this).text() != class_name) {
                $(this).parents("tr").hide();
            } else {
                // If you've narrowed on an instance and then click on the class, that should unhide the other instances on that class.
                $(this).parents("tr").show();
	    }
        }
    );
    $("#selected").closest("td").empty();
    $("#" + target_zephyr).children("td:first").html('<p id="selected">&gt;</p>');
    $.post("update", {pointer: target_zephyr});

    // Try to keep the zephyr in the same place on the screen after narrowing.
    scroll_to_zephyr(target_zephyr, old_top);

    $("#unhide").removeAttr("disabled");
    $("#narrow_indicator").html("Showing <span class='label zephyr_class'>" + class_name + "</span>");
}

function narrow_instance(class_name, instance, target_zephyr) {
    var old_top = $("#main_div").offset().top - $("#" + target_zephyr).offset().top;
    $("tr").each(
        function() {
            if (($(this).find("span.zephyr_class").text() != class_name) ||
		($(this).find("span.zephyr_instance").text() != instance)) {
                $(this).hide();
	    }
        }
    );
    $("#selected").closest("td").empty();
    $("#" + target_zephyr).children("td:first").html('<p id="selected">&gt;</p>');
    $.post("update", {pointer: target_zephyr});

    // Try to keep the zephyr in the same place on the screen after narrowing.
    scroll_to_zephyr(target_zephyr, old_top);

    $("#unhide").removeAttr("disabled");
    $("#narrow_indicator").html("Showing <span class='label zephyr_class'>" + class_name
      + "</span> <span class='label zephyr_instance'>" + instance + "</span>");
}

function prepare_personal(username) {
    $('#zephyr-type-tabs a[href="#personal-message"]').tab('show');
    $("#recipient").val(username);
    $("#new_personal_zephyr").focus();
}

function unhide() {
    $("tr").show();

    p = $("#selected");
    tr = $(p).closest("tr");
    scroll_to_zephyr(tr.attr("id"), 0);

    $("#unhide").attr("disabled", "disabled");
    $("#narrow_indicator").html("");
}

$(function() {
  setInterval(get_updates, 1000);
});

function add_message(index, zephyr) {
    var recipient_class;
    if (zephyr.type == "class") {
	recipient_class = "zephyr_class";
    } else {
	recipient_class = "zephyr_personal_recipient";
    }

    var new_str = "<tr id=" + zephyr.id + ">" +
	"<td class='pointer'><p></p></td>" +
	"<td class='zephyr'>" +
	"<p><span onclick=\"narrow('" + zephyr.display_recipient + "','" + zephyr.id + "')\" class='label " + recipient_class + "'>" + zephyr.display_recipient +
	"</span> <span onclick=\"narrow_instance('" + zephyr.display_recipient + "','" + zephyr.instance + "','" + zephyr.id + "')\" class='label zephyr_instance'>" +
	zephyr.instance + "</span> <span onclick=\"prepare_personal('" + zephyr.sender + "')\" class='label zephyr_sender'>" + zephyr.sender + "</span><br />"
	+ zephyr.content +
	"</p></td>" +
	"</tr>"
    alert(new_str);
    $("#table tr:last").after(new_str);
}

function get_updates() {
    var last_received = $("tr:last").attr("id");
    $.post("get_updates", {last_received: last_received},
           function(data) {
               $.each(data, add_message);
    }, "json");
}
