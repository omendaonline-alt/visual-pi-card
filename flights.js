(function () {
  'use strict';

  var form = document.getElementById('flightAgentForm');
  var tripType = document.getElementById('flightTripType');
  var passenger = document.getElementById('flightPassenger');
  var contact = document.getElementById('flightContact');
  var from = document.getElementById('flightFrom');
  var to = document.getElementById('flightTo');
  var departure = document.getElementById('flightDeparture');
  var returnDate = document.getElementById('flightReturn');
  var returnField = document.getElementById('flightReturnField');
  var passengers = document.getElementById('flightPassengers');
  var cabin = document.getElementById('flightCabin');
  var airline = document.getElementById('flightAirline');
  var submit = document.getElementById('flightAgentSubmit');
  var status = document.getElementById('flightAgentStatus');
  var result = document.getElementById('flightAgentResult');
  var aircraftType = 'All';
  var aircraftGalleryTimer = null;
  var aircraftGalleryState = {};
  var aircraftViewLabels = ['Exterior view', 'Left-side view', 'Right-side view', 'Flight view', 'Cockpit / inspection view'];
  var aircraftListings = [
    { id:'air-cessna-172', title:'Cessna 172 Skyhawk', type:'Single engine', seats:'4 seats', year:'2018', range:'1,185 km', engine:'Lycoming IO-360-L2A · 180 hp', manufacturer:'Textron Aviation · Cessna', price:'0.42 Pi', seller:'Savanna Air Sales', location:'Nairobi, Kenya', images:['assets/aircraft/cessna-172.webp','https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Cessna172-CatalinaTakeOff.JPG/960px-Cessna172-CatalinaTakeOff.JPG','https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Cessna_172S_Skyhawk_%E2%80%98G-JMKE%E2%80%99_%2845077563364%29.jpg/960px-Cessna_172S_Skyhawk_%E2%80%98G-JMKE%E2%80%99_%2845077563364%29.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/N448CP_20201006_KCON_corrected_2000px.png/960px-N448CP_20201006_KCON_corrected_2000px.png','https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/OK-EKR_zespodu.jpg/960px-OK-EKR_zespodu.jpg'] },
    { id:'air-piper-pa28', title:'Piper PA-28 Cherokee', type:'Trainer', seats:'4 seats', year:'2016', range:'1,000 km', engine:'Lycoming O-360-A4M · 180 hp', manufacturer:'Piper Aircraft', price:'0.35 Pi', seller:'East Africa Flight Centre', location:'Arusha, Tanzania', images:['assets/aircraft/piper-pa28.webp','https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/PIPER_PA28_181_CHEROKEE_ARCHER_III.jpg/960px-PIPER_PA28_181_CHEROKEE_ARCHER_III.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Piper_PA28-181_Archer_II_%E2%80%98G-BXEX%E2%80%99_%2844034123880%29.jpg/960px-Piper_PA28-181_Archer_II_%E2%80%98G-BXEX%E2%80%99_%2844034123880%29.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Piper_Archer%2C_Trebbin_%28P1090112%29.jpg/960px-Piper_Archer%2C_Trebbin_%28P1090112%29.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Cockpit_Piper_PA-28_C-FGMX2.jpg/960px-Cockpit_Piper_PA-28_C-FGMX2.jpg'] },
    { id:'air-cub', title:'Piper PA-18 Super Cub', type:'Bush plane', seats:'2 seats', year:'2021', range:'740 km', engine:'Lycoming O-320 · 150 hp', manufacturer:'Piper Aircraft', price:'0.28 Pi', seller:'Rift Aviation', location:'Naivasha, Kenya', images:['assets/aircraft/bush-plane.webp','https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Piper_Super_Cub_1_1998-07-07.jpg/960px-Piper_Super_Cub_1_1998-07-07.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/PA-18_135-150_HP_Super_Cub_OO-LFM.jpg/960px-PA-18_135-150_HP_Super_Cub_OO-LFM.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Piper_PA-18-150_Super_Cub_lands_RIAT_Fairford_13July2017_arp.jpg/960px-Piper_PA-18-150_Super_Cub_lands_RIAT_Fairford_13July2017_arp.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/JA3117_%2810794648475%29.jpg/960px-JA3117_%2810794648475%29.jpg'] },
    { id:'air-ultralight', title:'Aeroprakt A-22 Foxbat', type:'Ultralight', seats:'2 seats', year:'2022', range:'520 km', engine:'Rotax 912 ULS · 100 hp', manufacturer:'Aeroprakt', price:'0.14 Pi', seller:'Coastal Light Aircraft', location:'Mombasa, Kenya', images:['assets/aircraft/ultralight.webp','https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Aeroprakt_22_AN0191549.jpg/960px-Aeroprakt_22_AN0191549.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Aeroprakt_22_AN0191215.jpg/960px-Aeroprakt_22_AN0191215.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Aeroprakt-22L_in_flight_%287400304928%29.jpg/960px-Aeroprakt-22L_in_flight_%287400304928%29.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/24-4883_Aeroprakt_A22L_Foxbat_%2810668282663%29.jpg/960px-24-4883_Aeroprakt_A22L_Foxbat_%2810668282663%29.jpg'] },
    { id:'air-cirrus-sr22', title:'Cirrus SR22 Touring', type:'Single engine', seats:'5 seats', year:'2019', range:'2,166 km', engine:'Continental IO-550-N · 310 hp', manufacturer:'Cirrus Aircraft', price:'0.78 Pi', seller:'Global Wings', location:'Kigali, Rwanda', images:['assets/aircraft/cirrus-sr22.webp','https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Cirrus_SR-22_G3_GTS_AN1594917.jpg/960px-Cirrus_SR-22_G3_GTS_AN1594917.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/SR22_N456DC_Over_North_Las_Vegas_Neighborhood.jpg/960px-SR22_N456DC_Over_North_Las_Vegas_Neighborhood.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Cirrus_Design_Corp_%28N20GH%29_Cirrus_SR22T_G7_GTS_taxiing_at_Wagga_Wagga_Airport.jpg/960px-Cirrus_Design_Corp_%28N20GH%29_Cirrus_SR22T_G7_GTS_taxiing_at_Wagga_Wagga_Airport.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Cirrus_SR22_interior.jpg/960px-Cirrus_SR22_interior.jpg'] },
    { id:'air-robinson-r44', title:'Robinson R44 Raven', type:'Helicopter', seats:'4 seats', year:'2017', range:'560 km', engine:'Lycoming IO-540-AE1A5 · 245 hp', manufacturer:'Robinson Helicopter Company', price:'0.69 Pi', seller:'Lake Region Rotorcraft', location:'Kampala, Uganda', images:['assets/aircraft/robinson-r44.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Robinson_R44_Raven_II_Bakoma.JPG/960px-Robinson_R44_Raven_II_Bakoma.JPG','https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Robinson_R44_Stra%C5%BC_Graniczna_Polish_Border_Guard.jpg/960px-Robinson_R44_Stra%C5%BC_Graniczna_Polish_Border_Guard.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021-10-26_R44_Helicopter_001.jpg/960px-2021-10-26_R44_Helicopter_001.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Robinson_R44_cockpit.JPG/960px-Robinson_R44_cockpit.JPG'] }
  ];
  var routes = [
    { code:'NBO to DXB', airline:'Kenya Airways', duration:'5h 20m', from:'NBO', to:'DXB', image:'assets/airlines/kenya-airways.webp' },
    { code:'ADD to LHR', airline:'Ethiopian Airlines', duration:'8h 15m', from:'ADD', to:'LHR', image:'assets/airlines/ethiopian-airlines.webp' },
    { code:'DXB to JFK', airline:'Emirates', duration:'13h 40m', from:'DXB', to:'JFK', image:'assets/airlines/emirates.webp' },
    { code:'NBO to EBB', airline:'RwandAir', duration:'1h 05m', from:'NBO', to:'EBB', image:'assets/airlines/rwandair.webp' },
    { code:'NBO to NRT', airline:'Qatar Airways', duration:'18h 30m', from:'NBO', to:'NRT', image:'assets/airlines/qatar-airways.webp' },
    { code:'DAR to CDG', airline:'Turkish Airlines', duration:'12h 45m', from:'DAR', to:'CDG', image:'assets/airlines/turkish-airlines.webp' }
  ];

  function localDateValue(date) {
    var offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }

  function formatDate(value) {
    if (!value) return 'One way';
    return new Date(value + 'T00:00:00').toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  }

  function showToast(message, success) {
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.background = success ? 'rgba(34,197,94,.96)' : 'rgba(239,68,68,.96)';
    document.body.appendChild(toast);
    window.setTimeout(function () { toast.remove(); }, 4200);
  }

  function escapeMarkup(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character];
    });
  }

  function setTripType(value) {
    var hasReturn = value === 'return';
    tripType.value = hasReturn ? 'return' : 'one-way';
    returnField.classList.toggle('hidden', !hasReturn);
    returnDate.required = hasReturn;
    if (!hasReturn) returnDate.value = '';
    document.querySelectorAll('.flight-trip-toggle button').forEach(function (button) {
      button.classList.toggle('active', button.dataset.trip === tripType.value);
    });
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function renderTicket(booking) {
    setText('ticketReference', booking.reference);
    setText('ticketFrom', booking.fromAirport);
    setText('ticketTo', booking.toAirport);
    setText('ticketPassenger', booking.passengerName);
    setText('ticketDeparture', formatDate(booking.departureDate));
    setText('ticketReturn', booking.returnDate ? formatDate(booking.returnDate) : 'One way');
    setText('ticketPassengers', String(booking.passengers));
    setText('ticketCabin', booking.cabin);
    setText('ticketAirline', booking.airline);
    result.classList.remove('hidden');
    status.textContent = 'Request ' + booking.reference + ' was created. An agent must now confirm schedule and fare.';
    result.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  function createRouteCards() {
    var list = document.getElementById('featuredFlights');
    routes.forEach(function (route) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'flight-card';
      card.innerHTML = '<img class="flight-aircraft" src="' + route.image + '" alt="' + route.airline + ' aircraft" loading="lazy"><div class="flight-card-body"><div class="flight-meta"><div><strong>' + route.airline + '</strong><small>' + route.code + '</small></div></div><div class="flight-details"><span>' + route.duration + '</span><strong>Request fare</strong></div></div>';
      card.addEventListener('click', function () {
        from.value = route.from;
        to.value = route.to;
        airline.value = route.airline;
        status.classList.remove('error');
        status.textContent = route.code + ' selected. Complete passenger and date details.';
        passenger.focus();
      });
      list.appendChild(card);
    });
  }

  function loadSellerAircraft() {
    var rows = [];
    try { rows = JSON.parse(localStorage.getItem('omendaSellerProducts') || '[]'); } catch (error) {}
    return rows.filter(function (item) { return item.category === 'Aircraft'; }).map(function (item, index) {
      var images=Array.isArray(item.images)&&item.images.length?item.images:[item.image];
      return { id:'seller-aircraft-' + index, title:item.title, type:item.aircraftType || 'Other', seats:item.seats || 'Details from seller', year:item.year || 'Year not provided', range:item.range || 'Range not provided', engine:item.engine || 'Engine details from seller', manufacturer:item.manufacturer || item.brand, price:(item.price || 'Price on request') + (String(item.price || '').toLowerCase().indexOf('pi') === -1 ? ' Pi' : ''), seller:item.brand, location:item.location || 'Location from seller', images:images.filter(Boolean) };
    });
  }

  function startAircraftGallery() {
    if (aircraftGalleryTimer) window.clearInterval(aircraftGalleryTimer);
    aircraftGalleryTimer = window.setInterval(function () {
      document.querySelectorAll('.aircraft-sale-card').forEach(function (card) {
        var listingId = card.dataset.aircraftId;
        var item = loadSellerAircraft().concat(aircraftListings).find(function (listing) { return listing.id === listingId; });
        if (!item || !item.images || item.images.length < 2) return;
        var next = ((aircraftGalleryState[listingId] || 0) + 1) % item.images.length;
        aircraftGalleryState[listingId] = next;
        var image = card.querySelector('.aircraft-gallery-image');
        if (image) { image.src = item.images[next]; image.alt = item.title + ' - ' + (aircraftViewLabels[next] || ('view ' + (next + 1))); }
        var counter = card.querySelector('.aircraft-image-count');
        if (counter) counter.textContent = (next + 1) + '/' + item.images.length;
        card.querySelectorAll('.aircraft-gallery-dots span').forEach(function (dot, index) { dot.classList.toggle('active', index === next); });
      });
    }, 5000);
  }

  function renderAircraftMarket() {
    var tabs = document.getElementById('aircraftTypeTabs');
    var grid = document.getElementById('aircraftSaleGrid');
    if (!tabs || !grid) return;
    var listings = loadSellerAircraft().concat(aircraftListings);
    var types = ['All'];
    listings.forEach(function (item) { if (types.indexOf(item.type) === -1) types.push(item.type); });
    if (types.indexOf(aircraftType) === -1) aircraftType = 'All';
    tabs.innerHTML = types.map(function (type) { return '<button type="button" class="' + (type === aircraftType ? 'active' : '') + '" data-aircraft-type="' + escapeMarkup(type) + '">' + escapeMarkup(type) + '</button>'; }).join('');
    var visible = aircraftType === 'All' ? listings : listings.filter(function (item) { return item.type === aircraftType; });
    grid.innerHTML = visible.map(function (item) {
      var images=item.images&&item.images.length?item.images:['assets/ride/small-airplane.webp'];
      var currentIndex=Math.min(aircraftGalleryState[item.id]||0,images.length-1);
      return '<article class="aircraft-sale-card" data-aircraft-id="' + escapeMarkup(item.id) + '"><div class="aircraft-gallery"><img class="aircraft-gallery-image" src="' + escapeMarkup(images[currentIndex]) + '" alt="' + escapeMarkup(item.title + ' - ' + (aircraftViewLabels[currentIndex] || ('view ' + (currentIndex + 1)))) + '" loading="lazy"><span class="aircraft-image-count">' + (currentIndex + 1) + '/' + images.length + '</span><div class="aircraft-gallery-dots">' + images.map(function (_, index) { return '<span class="' + (index === currentIndex ? 'active' : '') + '"></span>'; }).join('') + '</div></div><div class="aircraft-sale-body"><div class="aircraft-sale-type">' + escapeMarkup(item.type) + '</div><h3>' + escapeMarkup(item.title) + '</h3><div class="aircraft-specs"><span>' + escapeMarkup(item.seats) + '</span><span>' + escapeMarkup(item.year) + '</span><span>' + escapeMarkup(item.range) + '</span></div><dl class="aircraft-company-data"><div><dt>Engine capacity</dt><dd>' + escapeMarkup(item.engine) + '</dd></div><div><dt>Manufacturer</dt><dd>' + escapeMarkup(item.manufacturer) + '</dd></div></dl><div class="aircraft-seller"><span>' + escapeMarkup(item.seller) + '</span><small>' + escapeMarkup(item.location) + '</small></div><div class="aircraft-sale-actions"><strong>' + escapeMarkup(item.price) + '</strong><a href="mailto:?subject=' + encodeURIComponent('Aircraft enquiry: ' + item.title) + '">Contact seller</a></div></div></article>';
    }).join('');
    tabs.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () { aircraftType = button.dataset.aircraftType; renderAircraftMarket(); });
    });
    startAircraftGallery();
  }

  function prefillFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var queryFrom = params.get('from');
    var queryTo = params.get('to');
    var queryAirline = params.get('airline');
    if (!queryFrom || !queryTo) return;
    from.value = queryFrom;
    to.value = queryTo;
    airline.value = queryAirline || 'Any available airline';
    status.textContent = queryFrom + ' to ' + queryTo + ' selected. Complete passenger and date details.';
  }

  function submitRequest(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (from.value.trim().toLowerCase() === to.value.trim().toLowerCase()) {
      status.textContent = 'Departure and destination airports must be different.';
      status.classList.add('error');
      return;
    }
    if (tripType.value === 'return' && returnDate.value < departure.value) {
      status.textContent = 'Return date cannot be before departure.';
      status.classList.add('error');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Creating ticket request...';
    status.classList.remove('error');
    fetch('/api/flight-bookings', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({
        passengerName:passenger.value.trim(),
        contact:contact.value.trim(),
        fromAirport:from.value.trim(),
        toAirport:to.value.trim(),
        departureDate:departure.value,
        returnDate:returnDate.value,
        tripType:tripType.value,
        passengers:passengers.value,
        cabin:cabin.value,
        airline:airline.value.trim() || 'Any available airline'
      })
    }).then(function (response) {
      return response.json().then(function (data) { return { ok:response.ok, data:data }; });
    }).then(function (response) {
      if (!response.ok || !response.data.success) throw new Error(response.data.error || 'Unable to create ticket request.');
      renderTicket(response.data.booking);
      showToast('Flight agent request created.', true);
    }).catch(function (error) {
      status.textContent = error.message || 'Unable to create ticket request.';
      status.classList.add('error');
      showToast(status.textContent, false);
    }).finally(function () {
      submit.disabled = false;
      submit.textContent = 'Create agent ticket';
    });
  }

  document.querySelectorAll('.flight-trip-toggle button').forEach(function (button) {
    button.addEventListener('click', function () { setTripType(button.dataset.trip); });
  });
  departure.addEventListener('change', function () {
    returnDate.min = departure.value;
    if (returnDate.value && returnDate.value < departure.value) returnDate.value = '';
  });
  form.addEventListener('submit', submitRequest);
  document.getElementById('printFlightTicket').addEventListener('click', function () { window.print(); });
  document.getElementById('newFlightTicket').addEventListener('click', function () {
    form.reset();
    setTripType('one-way');
    result.classList.add('hidden');
    status.classList.remove('error');
    status.textContent = 'Schedule and fare require airline confirmation. This request is not yet a paid or issued ticket.';
    departure.min = localDateValue(new Date());
    returnDate.min = departure.min;
    passenger.focus();
  });

  departure.min = localDateValue(new Date());
  returnDate.min = departure.min;
  setTripType('one-way');
  renderAircraftMarket();
  createRouteCards();
  prefillFromQuery();
}());
