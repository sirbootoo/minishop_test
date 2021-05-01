google.maps.event.addDomListener(window, 'load', initialize);
function initialize() {
  var input = document.getElementById('address');
  var autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener('place_changed', function () {
    var place = autocomplete.getPlace();
    const lat = place.geometry['location'].lat();
    const long = place.geometry['location'].lng();
    const latElement = document.getElementById('lat');
    latElement.value = lat;
    const longElement = document.getElementById('long');
    longElement.value = long;
    // place variable will have all the information you are looking for.
    // $('#lat').val(place.geometry['location'].lat());
    // $('#long').val(place.geometry['location'].lng());
  });
}