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
  createRouteCards();
  prefillFromQuery();
}());
