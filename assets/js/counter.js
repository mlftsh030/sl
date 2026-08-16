$(document).ready(function(){$(".counter").each(function(){$(this).prop("Counter",0).animate({Counter:$(this).text()},{duration:4e3,easing:"swing",step:function(t){$(this).text(Math.ceil(t))}})})});
