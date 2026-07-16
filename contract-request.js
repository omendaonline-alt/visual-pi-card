(function(){
  var form = document.getElementById('contractForm');
  var status = document.getElementById('contractStatus');
  var sectorInput = document.getElementById('contractSector');
  if (!form || !status || !sectorInput) return;

  function loadContractStatus() {
    try {
      var saved = JSON.parse(localStorage.getItem('omenda_contract_request') || 'null');
      if (saved && saved.sector) {
        status.textContent = 'Saved request: ' + saved.sector + ' in ' + saved.location + ' with budget ' + saved.budget + '.';
      }
    } catch (e) {}
  }

  form.addEventListener('submit', function(event) {
    event.preventDefault();
    var request = {
      sector: sectorInput.value,
      location: document.getElementById('contractLocation').value.trim(),
      budget: document.getElementById('contractBudget').value.trim(),
      details: document.getElementById('contractDetails').value.trim(),
      createdAt: new Date().toISOString(),
      page: document.body.getAttribute('data-contract-page') || 'contracts-hub'
    };
    localStorage.setItem('omenda_contract_request', JSON.stringify(request));
    status.textContent = 'Saved request: ' + request.sector + ' in ' + request.location + '. Marketplace team can review it for bids and escrow milestones.';
    form.reset();
    if (sectorInput.tagName === 'INPUT') sectorInput.value = request.sector;
  });

  loadContractStatus();
})();