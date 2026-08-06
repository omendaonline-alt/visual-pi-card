(function(){
  'use strict';

  var STORAGE_KEY='omendaSportStateV1';
  var WITHDRAWAL_KEY='omendaSportWithdrawalsV1';
  var LEGACY_WITHDRAWAL_KEY='omendaAviatorStateV1';
  var defaultState={balance:50,selections:[],tickets:[],favorites:[],ageConfirmed:false,maxStake:20,paused:false};
  var state=loadState();
  var withdrawalState=loadWithdrawalState();
  var activeSport='all';
  var liveOnly=false;
  var favoritesOnly=false;
  var activeView=location.hash==='#my-bets'?'my-bets':'sportsbook';
  var toastTimer;
  var withdrawalBusy=false;
  var withdrawalComplete=false;

  var events=[
    {id:'football-1',sport:'football',sportLabel:'Football',league:'England - Sample Premier League',time:'67\'',status:'live',home:'North London',away:'West London',homeScore:1,awayScore:1,markets:[['Home',2.65],['Draw',3.10],['Away',2.80]]},
    {id:'football-2',sport:'football',sportLabel:'Football',league:'Spain - Sample Primera',time:'Today 20:00',status:'upcoming',home:'Barcelona City',away:'Madrid Athletic',markets:[['Home',1.92],['Draw',3.45],['Away',4.10]]},
    {id:'football-3',sport:'football',sportLabel:'Football',league:'Tanzania - Sample Premier League',time:'Today 18:30',status:'upcoming',home:'Dar Stars',away:'Young Lions',markets:[['Home',2.25],['Draw',2.95],['Away',3.35]]},
    {id:'football-4',sport:'football',sportLabel:'Football',league:'UEFA - Sample Champions League',time:'Tomorrow 21:00',status:'upcoming',home:'Bavaria Munich',away:'Milan Blue',markets:[['Home',1.78],['Draw',3.90],['Away',4.55]]},
    {id:'basketball-1',sport:'basketball',sportLabel:'Basketball',league:'USA - Sample Pro Basketball',time:'Q4 06:42',status:'live',home:'Boston Greens',away:'Los Angeles Gold',homeScore:94,awayScore:91,markets:[['Boston',1.62],['Spread -3.5',1.91],['Los Angeles',2.30]]},
    {id:'tennis-1',sport:'tennis',sportLabel:'Tennis',league:'Sample International Open',time:'Set 2',status:'live',home:'A. Petrova',away:'C. Williams',homeScore:4,awayScore:3,markets:[['Petrova',1.84],['Over 21.5',1.95],['Williams',2.02]]},
    {id:'cricket-1',sport:'cricket',sportLabel:'Cricket',league:'Sample T20 International',time:'Tomorrow 14:00',status:'upcoming',home:'South Africa XI',away:'India XI',markets:[['South Africa',2.15],['Tie',14.00],['India',1.72]]},
    {id:'motorsport-1',sport:'motorsport',sportLabel:'Motorsport',league:'Sample World Grand Prix',time:'Sun 15:00',status:'upcoming',home:'Pole position winner',away:'Race winner',markets:[['C. Martin',2.40],['L. Anton',2.75],['M. Reyes',4.20]]}
  ];

  function loadState(){
    try{
      var stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(!stored||typeof stored!=='object')return Object.assign({},defaultState);
      return Object.assign({},defaultState,stored,{selections:Array.isArray(stored.selections)?stored.selections:[],tickets:Array.isArray(stored.tickets)?stored.tickets:[],favorites:Array.isArray(stored.favorites)?stored.favorites:[]});
    }catch(error){return Object.assign({},defaultState)}
  }

  function saveState(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(error){}
  }

  function loadWithdrawalState(){
    try{
      var stored=JSON.parse(localStorage.getItem(WITHDRAWAL_KEY)||'null');
      if(!stored||typeof stored!=='object')stored=JSON.parse(localStorage.getItem(LEGACY_WITHDRAWAL_KEY)||'null');
      if(!stored||typeof stored!=='object')return {withdrawals:[],pendingWithdrawal:null};
      stored.withdrawals=Array.isArray(stored.withdrawals)?stored.withdrawals:[];
      stored.pendingWithdrawal=stored.pendingWithdrawal||null;
      return {withdrawals:stored.withdrawals,pendingWithdrawal:stored.pendingWithdrawal};
    }catch(error){return {withdrawals:[],pendingWithdrawal:null}}
  }

  function saveWithdrawalState(){
    try{localStorage.setItem(WITHDRAWAL_KEY,JSON.stringify(withdrawalState))}catch(error){}
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>'"]/g,function(character){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]});
  }

  function selectionId(eventId,label){return eventId+'::'+label}
  function getEvent(eventId){return events.find(function(event){return event.id===eventId})}
  function isSelected(eventId,label){return state.selections.some(function(pick){return pick.id===selectionId(eventId,label)})}

  function renderEvents(){
    var query=document.getElementById('eventSearch').value.trim().toLowerCase();
    var filtered=events.filter(function(event){
      var sportMatch=activeSport==='all'||event.sport===activeSport;
      var liveMatch=!liveOnly||event.status==='live';
      var favoriteMatch=!favoritesOnly||state.favorites.indexOf(event.id)!==-1;
      var queryMatch=!query||(event.home+' '+event.away+' '+event.league+' '+event.sportLabel).toLowerCase().indexOf(query)!==-1;
      return sportMatch&&liveMatch&&favoriteMatch&&queryMatch;
    });
    document.getElementById('eventSummary').textContent=filtered.length+' event'+(filtered.length===1?'':'s');
    document.getElementById('emptyState').hidden=filtered.length!==0;
    document.getElementById('eventsList').innerHTML=filtered.map(function(event){
      var favorite=state.favorites.indexOf(event.id)!==-1;
      var score=event.status==='live'?'<strong>'+event.homeScore+'</strong>':'<span></span>';
      var awayScore=event.status==='live'?'<strong>'+event.awayScore+'</strong>':'<span></span>';
      return '<article class="event-card'+(favorite?' favorite':'')+'" id="'+event.id+'">'+
        '<div class="event-top"><strong>'+escapeHtml(event.sportLabel)+'</strong><span>'+escapeHtml(event.league)+'</span>'+(event.status==='live'?'<span class="event-live">LIVE</span>':'')+'<button class="favorite-button'+(favorite?' active':'')+'" type="button" data-favorite="'+event.id+'" aria-label="'+(favorite?'Remove from':'Add to')+' favorites"><i data-lucide="star"></i></button></div>'+
        '<div class="event-body"><div class="event-info"><div class="event-time"><strong>'+escapeHtml(event.time)+'</strong><span>'+(event.status==='live'?'In play':'Kickoff')+'</span></div><div class="event-teams"><div class="team-row"><span>'+escapeHtml(event.home)+'</span>'+score+'</div><div class="team-row"><span>'+escapeHtml(event.away)+'</span>'+awayScore+'</div></div></div>'+
        '<div class="market-grid">'+event.markets.map(function(market){var selected=isSelected(event.id,market[0]);return '<button class="odd-button'+(selected?' selected':'')+'" type="button" data-event="'+event.id+'" data-label="'+escapeHtml(market[0])+'" data-odd="'+market[1]+'"><span>'+escapeHtml(market[0])+'</span><strong>'+Number(market[1]).toFixed(2)+'</strong></button>'}).join('')+'</div></div></article>';
    }).join('');
    refreshIcons();
  }

  function renderMobileSports(){
    var options=[['all','All'],['football','Football'],['basketball','Basketball'],['tennis','Tennis'],['cricket','Cricket'],['motorsport','Motorsport']];
    document.getElementById('mobileSports').innerHTML=options.map(function(option){return '<button type="button" data-mobile-sport="'+option[0]+'" class="'+(activeSport===option[0]?'active':'')+'">'+option[1]+'</button>'}).join('');
  }

  function renderSlip(){
    var count=state.selections.length;
    document.getElementById('selectionCount').textContent=count+' selection'+(count===1?'':'s');
    document.getElementById('slipEmpty').hidden=count>0;
    document.getElementById('slipCalculator').hidden=count===0;
    document.getElementById('slipSelections').innerHTML=state.selections.map(function(pick){
      return '<div class="slip-pick"><span>'+escapeHtml(pick.label)+'</span><small>'+escapeHtml(pick.eventName)+'</small><strong>'+Number(pick.odd).toFixed(2)+'</strong><button class="remove-pick" type="button" data-remove-pick="'+escapeHtml(pick.id)+'" aria-label="Remove '+escapeHtml(pick.label)+'"><i data-lucide="x"></i></button></div>';
    }).join('');
    updateCalculator();
    refreshIcons();
  }

  function updateCalculator(){
    var odds=state.selections.reduce(function(total,pick){return total*Number(pick.odd)},1);
    var stake=Math.max(0,Number(document.getElementById('stakeInput').value)||0);
    document.getElementById('combinedOdds').textContent=odds.toFixed(2);
    document.getElementById('potentialReturn').textContent=(stake*odds).toFixed(2)+' \u03C0';
    document.getElementById('placeBetButton').disabled=withdrawalBusy||state.paused||!state.selections.length;
    document.getElementById('placeBetButton').innerHTML=state.paused?'<i data-lucide="pause-circle"></i> Betting paused':'<i data-lucide="check-circle-2"></i> Place demo bet';
    refreshIcons();
  }

  function toggleSelection(eventId,label,odd){
    var id=selectionId(eventId,label);
    var existing=state.selections.findIndex(function(pick){return pick.id===id});
    if(existing!==-1){state.selections.splice(existing,1)}else{
      var event=getEvent(eventId);
      state.selections=state.selections.filter(function(pick){return pick.eventId!==eventId});
      state.selections.push({id:id,eventId:eventId,label:label,odd:Number(odd),eventName:event.home+' vs '+event.away});
    }
    saveState();renderEvents();renderSlip();
  }

  function placeBet(){
    if(state.paused){showToast('New demo bets are paused in your limits');return}
    if(!state.selections.length){showToast('Select at least one odd');return}
    var stake=Number(document.getElementById('stakeInput').value);
    if(!Number.isFinite(stake)||stake<0.1){showToast('Minimum demo stake is 0.10 \u03C0');return}
    if(stake>state.maxStake){showToast('Your stake limit is '+state.maxStake.toFixed(2)+' \u03C0');return}
    if(stake>state.balance){showToast('Demo wallet balance is too low');return}
    var odds=state.selections.reduce(function(total,pick){return total*Number(pick.odd)},1);
    var ticket={id:'OS-'+Date.now().toString(36).toUpperCase(),createdAt:new Date().toISOString(),status:'Open',stake:stake,odds:odds,potential:stake*odds,picks:state.selections.slice()};
    state.balance=Number((state.balance-stake).toFixed(2));
    state.tickets.unshift(ticket);
    state.selections=[];
    saveState();renderAll();showToast('Demo bet placed: '+ticket.id);
  }

  function cashOut(ticketId){
    var ticket=state.tickets.find(function(item){return item.id===ticketId});
    if(!ticket||ticket.status!=='Open')return;
    var value=Number((ticket.potential*0.72).toFixed(2));
    ticket.status='Cashed out';ticket.cashout=value;
    state.balance=Number((state.balance+value).toFixed(2));
    saveState();renderAll();showToast('Demo cash out added '+value.toFixed(2)+' \u03C0');
  }

  function renderHistory(){
    var container=document.getElementById('betHistory');
    document.getElementById('betCount').textContent=state.tickets.length;
    if(!state.tickets.length){container.innerHTML='<div class="history-empty"><i data-lucide="ticket"></i><strong>No demo bets yet</strong><span>Your completed bet slips will appear here.</span></div>';refreshIcons();return}
    container.innerHTML=state.tickets.map(function(ticket){
      return '<article class="bet-ticket"><div class="ticket-head"><span>'+escapeHtml(ticket.id)+' &middot; '+new Date(ticket.createdAt).toLocaleString()+'</span><strong>'+escapeHtml(ticket.status)+'</strong></div><div class="ticket-body">'+ticket.picks.map(function(pick){return '<div class="ticket-pick"><span>'+escapeHtml(pick.eventName)+' - '+escapeHtml(pick.label)+'</span><span>'+Number(pick.odd).toFixed(2)+'</span></div>'}).join('')+'<div class="ticket-totals"><div><span>Stake</span><strong>'+Number(ticket.stake).toFixed(2)+' &pi;</strong></div><div><span>Total odds</span><strong>'+Number(ticket.odds).toFixed(2)+'</strong></div><div><span>'+(ticket.status==='Cashed out'?'Returned':'Potential')+'</span><strong>'+Number(ticket.cashout||ticket.potential).toFixed(2)+' &pi;</strong></div></div>'+(ticket.status==='Open'?'<button class="cashout-button" type="button" data-cashout="'+ticket.id+'">Demo cash out '+(ticket.potential*.72).toFixed(2)+' &pi;</button>':'')+'</div></article>';
    }).join('');
    refreshIcons();
  }

  function switchView(view){
    activeView=view;
    document.getElementById('sportsbookView').hidden=view!=='sportsbook';
    document.getElementById('myBetsView').hidden=view!=='my-bets';
    document.querySelectorAll('[data-view]').forEach(function(button){button.classList.toggle('active',button.dataset.view===view)});
    document.querySelector('.bet-slip').hidden=view!=='sportsbook';
  }

  function renderAll(){
    document.getElementById('walletBalance').textContent=state.balance.toFixed(2)+' \u03C0';
    document.getElementById('withdrawableBalance').textContent=state.balance.toFixed(2)+' \u03C0';
    document.getElementById('modalWalletBalance').textContent=state.balance.toFixed(2)+' \u03C0';
    document.getElementById('openWithdrawButton').disabled=withdrawalBusy||state.balance<.1;
    document.getElementById('headerWithdrawButton').disabled=withdrawalBusy||state.balance<.1;
    renderMobileSports();renderEvents();renderSlip();renderHistory();switchView(activeView);
  }

  function setWithdrawStatus(message,tone){var element=document.getElementById('withdrawStatus');element.textContent=message;element.className='withdraw-status'+(tone?' '+tone:'')}
  function makeWithdrawalId(){var values=new Uint32Array(3);crypto.getRandomValues(values);return 'SPW_'+Array.from(values).map(function(value){return value.toString(36)}).join('_')}

  function setWithdrawalBusy(busy){
    withdrawalBusy=busy;
    document.getElementById('confirmWithdrawButton').disabled=busy||withdrawalComplete;
    document.getElementById('closeWithdrawButton').disabled=busy;
    document.getElementById('withdrawAmount').disabled=busy||withdrawalComplete||Boolean(withdrawalState.pendingWithdrawal);
    document.getElementById('openWithdrawButton').disabled=busy||state.balance<.1;
    document.getElementById('headerWithdrawButton').disabled=busy||state.balance<.1;
    updateCalculator();
  }

  function openWithdrawal(){
    withdrawalComplete=false;
    var pending=withdrawalState.pendingWithdrawal;
    var amount=document.getElementById('withdrawAmount');
    amount.max=Math.min(100,state.balance).toFixed(2);
    amount.value=pending?Number(pending.amount).toFixed(2):Math.min(1,state.balance).toFixed(2);
    amount.disabled=Boolean(pending);
    setWithdrawStatus(pending?'A previous request was interrupted. Reconnect Pi Wallet to retry it safely.':'Pi authentication is required to continue.');
    var button=document.getElementById('confirmWithdrawButton');
    button.disabled=false;
    button.innerHTML='<i data-lucide="shield-check"></i><span>'+(pending?'Retry withdrawal':'Connect Pi Wallet')+'</span>';
    document.getElementById('withdrawModal').hidden=false;refreshIcons();
  }

  function closeWithdrawal(){if(!withdrawalBusy)document.getElementById('withdrawModal').hidden=true}

  async function submitWithdrawal(){
    if(withdrawalBusy||withdrawalComplete)return;
    var pending=withdrawalState.pendingWithdrawal;
    var amount=pending?Number(pending.amount):Number(document.getElementById('withdrawAmount').value);
    if(!Number.isFinite(amount)||amount<.1||amount>100){setWithdrawStatus('Choose an amount from 0.10 to 100 Pi.','error');return}
    if(amount>state.balance){setWithdrawStatus('The amount is higher than your available demo balance.','error');return}
    if(typeof window.piAuthenticate!=='function'||!window.piSdkReady){setWithdrawStatus('Open this app in Pi Browser to connect your Pi Wallet.','error');return}

    setWithdrawalBusy(true);
    document.getElementById('confirmWithdrawButton').innerHTML='<i data-lucide="loader-circle"></i><span>Connecting...</span>';refreshIcons();
    setWithdrawStatus('Waiting for Pi Wallet authentication...');
    try{
      var auth=await window.piAuthenticate(null,['username','wallet_address']);
      if(!auth||!auth.accessToken)throw new Error('Pi Wallet authentication was not completed');
      if(!pending){pending={requestId:makeWithdrawalId(),amount:Number(amount.toFixed(2)),createdAt:new Date().toISOString(),source:'sportsbook'};withdrawalState.pendingWithdrawal=pending;saveWithdrawalState()}
      setWithdrawStatus('Authenticated as @'+((auth.user&&auth.user.username)||'Pi Pioneer')+'. Recording sandbox withdrawal...');
      document.getElementById('confirmWithdrawButton').innerHTML='<i data-lucide="loader-circle"></i><span>Processing...</span>';refreshIcons();
      var response=await fetch('/api/pi/sports-withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:pending.amount,accessToken:auth.accessToken,requestId:pending.requestId})});
      var data=await response.json().catch(function(){return {}});
      if(!response.ok||!data.success){withdrawalState.pendingWithdrawal=null;saveWithdrawalState();throw new Error(data.error||'Sandbox withdrawal was declined')}
      var alreadyRecorded=withdrawalState.withdrawals.some(function(item){return item.requestId===pending.requestId});
      if(!alreadyRecorded){
        state.balance=Number((state.balance-pending.amount).toFixed(2));
        withdrawalState.withdrawals.unshift({requestId:pending.requestId,paymentId:data.paymentId,txid:data.txid,amount:pending.amount,username:data.username||'',date:data.createdAt||new Date().toISOString(),demo:true,source:pending.source||'sportsbook'});
        withdrawalState.withdrawals=withdrawalState.withdrawals.slice(0,20);
      }
      withdrawalState.pendingWithdrawal=null;saveState();saveWithdrawalState();renderAll();
      withdrawalComplete=true;
      setWithdrawStatus('Sandbox withdrawal recorded for @'+(data.username||'Pi Pioneer')+'. No real Pi was transferred.','success');
      document.getElementById('confirmWithdrawButton').innerHTML='<i data-lucide="check-circle-2"></i><span>Recorded '+pending.amount.toFixed(2)+' \u03C0</span>';showToast('Pi Sandbox withdrawal recorded');
    }catch(error){
      var retained=Boolean(withdrawalState.pendingWithdrawal);
      setWithdrawStatus((error&&error.message?error.message:'Withdrawal failed')+(retained?' Your request is saved and can be retried safely.':''),'error');
      document.getElementById('confirmWithdrawButton').innerHTML='<i data-lucide="refresh-cw"></i><span>'+(retained?'Retry withdrawal':'Connect Pi Wallet')+'</span>';
    }finally{setWithdrawalBusy(false);refreshIcons()}
  }

  function showToast(message){
    var toast=document.getElementById('sportToast');
    toast.textContent=message;toast.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(function(){toast.classList.remove('show')},2800);
  }

  function refreshIcons(){if(window.lucide)window.lucide.createIcons()}

  document.addEventListener('click',function(event){
    var odd=event.target.closest('[data-event]');
    if(odd){toggleSelection(odd.dataset.event,odd.dataset.label,odd.dataset.odd);return}
    var remove=event.target.closest('[data-remove-pick]');
    if(remove){state.selections=state.selections.filter(function(pick){return pick.id!==remove.dataset.removePick});saveState();renderEvents();renderSlip();return}
    var favorite=event.target.closest('[data-favorite]');
    if(favorite){var index=state.favorites.indexOf(favorite.dataset.favorite);if(index===-1)state.favorites.push(favorite.dataset.favorite);else state.favorites.splice(index,1);saveState();renderEvents();return}
    var filter=event.target.closest('[data-sport]');
    if(filter){activeSport=filter.dataset.sport;document.querySelectorAll('[data-sport]').forEach(function(button){button.classList.toggle('active',button===filter)});renderMobileSports();renderEvents();return}
    var mobileFilter=event.target.closest('[data-mobile-sport]');
    if(mobileFilter){activeSport=mobileFilter.dataset.mobileSport;document.querySelectorAll('[data-sport]').forEach(function(button){button.classList.toggle('active',button.dataset.sport===activeSport)});renderMobileSports();renderEvents();return}
    var view=event.target.closest('[data-view]');if(view){switchView(view.dataset.view);return}
    var stake=event.target.closest('[data-stake]');if(stake){document.getElementById('stakeInput').value=stake.dataset.stake==='max'?Math.min(state.balance,state.maxStake).toFixed(2):stake.dataset.stake;updateCalculator();return}
    var cashout=event.target.closest('[data-cashout]');if(cashout){cashOut(cashout.dataset.cashout);return}
    var jump=event.target.closest('[data-jump-event]');if(jump){var card=document.getElementById(jump.dataset.jumpEvent);if(card)card.scrollIntoView({behavior:'smooth',block:'center'});return}
  });

  document.getElementById('eventSearch').addEventListener('input',renderEvents);
  document.getElementById('stakeInput').addEventListener('input',updateCalculator);
  document.getElementById('placeBetButton').addEventListener('click',placeBet);
  document.getElementById('clearSlipButton').addEventListener('click',function(){state.selections=[];saveState();renderEvents();renderSlip()});
  document.getElementById('liveOnlyButton').addEventListener('click',function(){liveOnly=!liveOnly;this.classList.toggle('active',liveOnly);renderEvents()});
  document.getElementById('favoritesButton').addEventListener('click',function(){favoritesOnly=!favoritesOnly;this.classList.toggle('active',favoritesOnly);renderEvents()});
  document.getElementById('clearSettledButton').addEventListener('click',function(){state.tickets=state.tickets.filter(function(ticket){return ticket.status==='Open'});saveState();renderHistory()});
  document.getElementById('confirmAgeButton').addEventListener('click',function(){state.ageConfirmed=true;saveState();document.getElementById('ageGate').hidden=true});
  document.getElementById('limitsButton').addEventListener('click',function(){document.getElementById('maxStakeInput').value=state.maxStake;document.getElementById('pauseBettingInput').checked=state.paused;document.getElementById('limitsModal').hidden=false});
  document.getElementById('closeLimitsButton').addEventListener('click',function(){document.getElementById('limitsModal').hidden=true});
  document.getElementById('saveLimitsButton').addEventListener('click',function(){var limit=Number(document.getElementById('maxStakeInput').value);if(!Number.isFinite(limit)||limit<.1||limit>100){showToast('Choose a limit from 0.10 to 100 \u03C0');return}state.maxStake=limit;state.paused=document.getElementById('pauseBettingInput').checked;saveState();document.getElementById('limitsModal').hidden=true;updateCalculator();showToast('Responsible limits saved')});
  document.getElementById('openWithdrawButton').addEventListener('click',openWithdrawal);
  document.getElementById('headerWithdrawButton').addEventListener('click',openWithdrawal);
  document.getElementById('closeWithdrawButton').addEventListener('click',closeWithdrawal);
  document.getElementById('confirmWithdrawButton').addEventListener('click',submitWithdrawal);
  document.getElementById('withdrawModal').addEventListener('click',function(event){if(event.target===this)closeWithdrawal()});
  window.addEventListener('hashchange',function(){switchView(location.hash==='#my-bets'?'my-bets':'sportsbook')});
  window.addEventListener('storage',function(event){
    if(withdrawalBusy)return;
    if(event.key===STORAGE_KEY){state=loadState();renderAll()}
    if(event.key===WITHDRAWAL_KEY){withdrawalState=loadWithdrawalState()}
  });
  window.addEventListener('focus',function(){if(!withdrawalBusy){state=loadState();withdrawalState=loadWithdrawalState();renderAll()}});

  if(state.ageConfirmed)document.getElementById('ageGate').hidden=true;
  saveWithdrawalState();
  renderAll();refreshIcons();
})();