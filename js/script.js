function toggleMobileMenu(menu) {
    menu.classList.toggle('open');
}

$(document).ready(function(){
    $("#hamburger-icon").click(function(){
        console.log("click");
        $("#mobile-menu").toggle('open');
    });

});