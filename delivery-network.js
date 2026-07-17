(function() {
  'use strict';

  var deliveryNetwork = { companies:[], agents:[] };

  function formValues(form) {
    var values = {};
    new FormData(form).forEach(function(value, key) { values[key] = String(value).trim(); });
    return values;
  }

  function setStatus(element, message, isError) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('error', !!isError);
  }

  function submitJson(url, payload) {
    return fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    }).then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok || !data.success) throw new Error(data.error || 'Request failed.');
        return data;
      });
    });
  }

  function appendText(parent, tag, text, className) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function trackingStatusLabel(value) {
    return String(value || 'pending').replace(/_/g, ' ').replace(/\b\w/g, function(letter) { return letter.toUpperCase(); });
  }

  function renderTracking(tracking) {
    document.getElementById('trackedNumber').textContent = tracking.trackingNumber;
    document.getElementById('trackedStatus').textContent = trackingStatusLabel(tracking.status);
    document.getElementById('trackedOrigin').textContent = tracking.origin;
    document.getElementById('trackedDestination').textContent = tracking.destination;
    document.getElementById('trackedCargoType').textContent = tracking.cargoType;
    document.getElementById('trackedWeight').textContent = tracking.weightKg + ' kg';
    document.getElementById('trackedCompany').textContent = tracking.companyPreference;
    var events = document.getElementById('cargoTrackingEvents');
    events.innerHTML = '';
    (tracking.events || []).forEach(function(event) {
      var item = document.createElement('li');
      appendText(item, 'strong', event.label || trackingStatusLabel(event.status));
      appendText(item, 'span', (event.location || 'Location pending') + ' | ' + new Date(event.timestamp).toLocaleString());
      events.appendChild(item);
    });
    document.getElementById('cargoTrackingResult').classList.remove('hidden');
  }

  function emptyDirectory(container, message) {
    container.innerHTML = '';
    var empty = document.createElement('div');
    empty.className = 'delivery-empty';
    appendText(empty, 'strong', 'No reviewed listings yet');
    appendText(empty, 'span', message);
    container.appendChild(empty);
  }

  function companyMatches(company, query) {
    return [company.name, company.country, company.city, company.serviceType, company.coverage].join(' ').toLowerCase().includes(query);
  }

  function renderCompanies(query) {
    var container = document.getElementById('companyDirectoryList');
    if (!container) return;
    var normalized = String(query || '').trim().toLowerCase();
    var companies = deliveryNetwork.companies.filter(function(company) { return companyMatches(company, normalized); });
    container.innerHTML = '';
    if (!companies.length) {
      emptyDirectory(container, normalized ? 'No cargo company matches this search.' : 'Register the first cargo company for review.');
      return;
    }
    companies.forEach(function(company) {
      var card = document.createElement('article');
      card.className = 'delivery-listing';
      var head = document.createElement('div');
      appendText(head, 'span', company.serviceType, 'delivery-listing-type');
      appendText(head, 'strong', company.name);
      card.appendChild(head);
      appendText(card, 'p', company.city + ', ' + company.country);
      appendText(card, 'span', company.coverage || 'Coverage available on request', 'delivery-listing-coverage');
      appendText(card, 'em', company.status === 'review_pending' ? 'Review pending' : 'Listed');
      container.appendChild(card);
    });
  }

  function agentMatches(agent, query) {
    return [agent.name, agent.businessName, agent.country, agent.city, agent.coverage, agent.vehicle].join(' ').toLowerCase().includes(query);
  }

  function renderAgents(query) {
    var container = document.getElementById('agentDirectoryList');
    if (!container) return;
    var normalized = String(query || '').trim().toLowerCase();
    var agents = deliveryNetwork.agents.filter(function(agent) { return agentMatches(agent, normalized); });
    container.innerHTML = '';
    if (!agents.length) {
      emptyDirectory(container, normalized ? 'No local agent matches this search.' : 'Register the first local delivery agent for review.');
      return;
    }
    agents.forEach(function(agent) {
      var card = document.createElement('article');
      card.className = 'delivery-listing';
      var head = document.createElement('div');
      appendText(head, 'span', agent.vehicle, 'delivery-listing-type');
      appendText(head, 'strong', agent.businessName || agent.name);
      card.appendChild(head);
      appendText(card, 'p', agent.city + ', ' + agent.country);
      appendText(card, 'span', agent.coverage, 'delivery-listing-coverage');
      appendText(card, 'em', agent.status === 'review_pending' ? 'Review pending' : 'Listed');
      container.appendChild(card);
    });
  }

  function updateNetworkUI() {
    var companyCount = document.getElementById('cargoCompanyCount');
    var agentCount = document.getElementById('localAgentCount');
    if (companyCount) companyCount.textContent = String(deliveryNetwork.companies.length);
    if (agentCount) agentCount.textContent = String(deliveryNetwork.agents.length);
    var datalist = document.getElementById('cargoCompanyNames');
    if (datalist) {
      datalist.innerHTML = '';
      deliveryNetwork.companies.forEach(function(company) {
        var option = document.createElement('option');
        option.value = company.name;
        datalist.appendChild(option);
      });
    }
    renderCompanies(document.getElementById('companySearch') && document.getElementById('companySearch').value);
    renderAgents(document.getElementById('agentSearch') && document.getElementById('agentSearch').value);
  }

  function loadNetwork() {
    return fetch('/api/delivery-network').then(function(response) { return response.json(); }).then(function(data) {
      if (!data.success) throw new Error(data.error || 'Unable to load delivery network.');
      deliveryNetwork = { companies:data.companies || [], agents:data.agents || [] };
      updateNetworkUI();
    }).catch(function(error) {
      var container = document.getElementById('companyDirectoryList') || document.getElementById('agentDirectoryList');
      if (container) emptyDirectory(container, error.message || 'Unable to load delivery network.');
    });
  }

  var companySearch = document.getElementById('companySearch');
  if (companySearch) companySearch.addEventListener('input', function() { renderCompanies(companySearch.value); });
  var agentSearch = document.getElementById('agentSearch');
  if (agentSearch) agentSearch.addEventListener('input', function() { renderAgents(agentSearch.value); });

  var trackingForm = document.getElementById('cargoTrackingForm');
  if (trackingForm) trackingForm.addEventListener('submit', function(event) {
    event.preventDefault();
    var input = document.getElementById('cargoTrackingInput');
    var status = document.getElementById('cargoTrackingStatus');
    var button = trackingForm.querySelector('button[type="submit"]');
    var trackingNumber = input.value.trim().toUpperCase();
    if (!trackingNumber) return;
    button.disabled = true;
    setStatus(status, 'Checking cargo tracking number...');
    fetch('/api/cargo-tracking/' + encodeURIComponent(trackingNumber)).then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to track cargo.');
        return data.tracking;
      });
    }).then(function(tracking) {
      input.value = tracking.trackingNumber;
      renderTracking(tracking);
      setStatus(status, 'Tracking information updated.');
    }).catch(function(error) {
      document.getElementById('cargoTrackingResult').classList.add('hidden');
      setStatus(status, error.message, true);
    }).finally(function() { button.disabled = false; });
  });

  var shipmentForm = document.getElementById('shipmentForm');
  if (shipmentForm) shipmentForm.addEventListener('submit', function(event) {
    event.preventDefault();
    if (!shipmentForm.reportValidity()) return;
    var status = document.getElementById('shipmentStatus');
    var button = shipmentForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(status, 'Creating shipment request...');
    submitJson('/api/cargo-shipments', formValues(shipmentForm)).then(function(data) {
      var shipment = data.shipment;
      document.getElementById('shipmentReferenceId').textContent = shipment.reference;
      document.getElementById('shipmentTrackingNumber').textContent = shipment.trackingNumber;
      document.getElementById('cargoTrackingInput').value = shipment.trackingNumber;
      document.getElementById('shipmentReferenceRoute').textContent = shipment.origin + ' to ' + shipment.destination + ' | ' + shipment.weightKg + ' kg';
      document.getElementById('shipmentReference').classList.remove('hidden');
      setStatus(status, 'Shipment request created. A cargo company quote is required before payment.');
    }).catch(function(error) {
      setStatus(status, error.message, true);
    }).finally(function() { button.disabled = false; });
  });

  var companyForm = document.getElementById('companyForm');
  if (companyForm) companyForm.addEventListener('submit', function(event) {
    event.preventDefault();
    if (!companyForm.reportValidity()) return;
    var status = document.getElementById('companyStatus');
    var button = companyForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(status, 'Submitting company for review...');
    submitJson('/api/cargo-companies', formValues(companyForm)).then(function(data) {
      setStatus(status, 'Company request ' + data.company.reference + ' created. Review is pending.');
      companyForm.reset();
      return loadNetwork();
    }).catch(function(error) {
      setStatus(status, error.message, true);
    }).finally(function() { button.disabled = false; });
  });

  var agentForm = document.getElementById('agentForm');
  if (agentForm) agentForm.addEventListener('submit', function(event) {
    event.preventDefault();
    if (!agentForm.reportValidity()) return;
    var status = document.getElementById('agentStatus');
    var button = agentForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(status, 'Submitting local agent for review...');
    submitJson('/api/delivery-agents', formValues(agentForm)).then(function(data) {
      var agent = data.agent;
      document.getElementById('agentReferenceId').textContent = agent.reference;
      document.getElementById('agentReferenceLocation').textContent = agent.city + ', ' + agent.country + ' | ' + agent.vehicle;
      document.getElementById('agentReference').classList.remove('hidden');
      setStatus(status, 'Agent request ' + agent.reference + ' created. Review is pending.');
      agentForm.reset();
      return loadNetwork();
    }).catch(function(error) {
      setStatus(status, error.message, true);
    }).finally(function() { button.disabled = false; });
  });

  loadNetwork();
})();
