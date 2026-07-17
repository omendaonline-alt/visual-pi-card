(function() {
  'use strict';

  var currentTracking = null;
  var terminalStatuses = ['delivered', 'cancelled', 'returned_to_sender'];

  function statusLabel(value) {
    return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, function(letter) { return letter.toUpperCase(); });
  }

  function setStatus(element, message, isError) {
    element.textContent = message;
    element.classList.toggle('error', !!isError);
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function appendEvent(list, event) {
    var item = document.createElement('li');
    var title = document.createElement('strong');
    var detail = document.createElement('span');
    title.textContent = event.label || statusLabel(event.status);
    detail.textContent = (event.location || 'Location pending') + ' | ' + new Date(event.timestamp).toLocaleString();
    item.appendChild(title);
    item.appendChild(detail);
    list.appendChild(item);
  }

  function renderTracking(tracking) {
    currentTracking = tracking;
    setText('operatorTrackedNumber', tracking.trackingNumber);
    setText('operatorCurrentStatus', statusLabel(tracking.status));
    setText('operatorVersion', String(tracking.version));
    setText('operatorLatestLocation', tracking.latestLocation || tracking.origin);
    setText('operatorAssignedCompany', tracking.assignedCompany || 'Unassigned');
    setText('operatorEstimatedDelivery', tracking.estimatedDeliveryDate || 'Not set');
    document.getElementById('operatorAssignedCompanyInput').value = tracking.assignedCompany || '';
    document.getElementById('operatorAssignedAgent').value = tracking.assignedAgent || '';
    document.getElementById('operatorEstimatedDate').value = tracking.estimatedDeliveryDate || '';
    document.getElementById('operatorLocation').value = tracking.latestLocation || '';

    var statusSelect = document.getElementById('operatorNextStatus');
    statusSelect.innerHTML = '';
    var scanOption = document.createElement('option');
    scanOption.value = tracking.status;
    scanOption.textContent = statusLabel(tracking.status) + ' - location scan';
    statusSelect.appendChild(scanOption);
    (tracking.allowedNext || []).forEach(function(status) {
      var option = document.createElement('option');
      option.value = status;
      option.textContent = statusLabel(status);
      statusSelect.appendChild(option);
    });

    var events = document.getElementById('operatorTrackingEvents');
    events.innerHTML = '';
    (tracking.events || []).slice().reverse().forEach(function(event) { appendEvent(events, event); });

    var isTerminal = terminalStatuses.includes(tracking.status);
    document.getElementById('operatorUpdateButton').disabled = isTerminal;
    document.getElementById('operatorTerminalState').textContent = isTerminal ? 'Shipment closed' : 'Active shipment';
    document.getElementById('cargoOperatorWorkspace').classList.remove('hidden');
  }

  function loadTracking(trackingNumber) {
    return fetch('/api/cargo-tracking/' + encodeURIComponent(trackingNumber)).then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load cargo.');
        return data.tracking;
      });
    });
  }

  var loadForm = document.getElementById('cargoOperatorLoadForm');
  loadForm.addEventListener('submit', function(event) {
    event.preventDefault();
    var trackingNumber = document.getElementById('operatorTrackingNumber').value.trim().toUpperCase();
    var status = document.getElementById('operatorLoadStatus');
    var button = loadForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(status, 'Loading cargo record...');
    loadTracking(trackingNumber).then(function(tracking) {
      document.getElementById('operatorTrackingNumber').value = tracking.trackingNumber;
      renderTracking(tracking);
      setStatus(status, 'Cargo loaded. Version ' + tracking.version + ' is ready for update.');
    }).catch(function(error) {
      document.getElementById('cargoOperatorWorkspace').classList.add('hidden');
      setStatus(status, error.message, true);
    }).finally(function() { button.disabled = false; });
  });

  var updateForm = document.getElementById('cargoOperatorUpdateForm');
  updateForm.addEventListener('submit', function(event) {
    event.preventDefault();
    if (!currentTracking || !updateForm.reportValidity()) return;
    var adminKey = document.getElementById('operatorAdminKey').value;
    var status = document.getElementById('operatorUpdateStatus');
    var button = document.getElementById('operatorUpdateButton');
    button.disabled = true;
    setStatus(status, 'Appending protected tracking event...');
    fetch('/api/cargo-tracking/' + encodeURIComponent(currentTracking.trackingNumber) + '/events', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer ' + adminKey},
      body:JSON.stringify({
        status:document.getElementById('operatorNextStatus').value,
        location:document.getElementById('operatorLocation').value.trim(),
        note:document.getElementById('operatorNote').value.trim(),
        assignedCompany:document.getElementById('operatorAssignedCompanyInput').value.trim(),
        assignedAgent:document.getElementById('operatorAssignedAgent').value.trim(),
        estimatedDeliveryDate:document.getElementById('operatorEstimatedDate').value,
        expectedVersion:currentTracking.version
      })
    }).then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok || !data.success) {
          if (data.current) renderTracking(data.current);
          throw new Error(data.error || 'Unable to update cargo.');
        }
        return data.tracking;
      });
    }).then(function(tracking) {
      renderTracking(tracking);
      document.getElementById('operatorNote').value = '';
      setStatus(status, 'Tracking event saved. Record is now version ' + tracking.version + '.');
    }).catch(function(error) {
      setStatus(status, error.message, true);
      if (currentTracking && !terminalStatuses.includes(currentTracking.status)) button.disabled = false;
    });
  });
})();
